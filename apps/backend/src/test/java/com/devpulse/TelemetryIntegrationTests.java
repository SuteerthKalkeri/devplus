package com.devpulse;

import static org.junit.jupiter.api.Assertions.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;

class TelemetryIntegrationTests extends ApiIntegrationTestSupport {

    record Fixture(Browser owner, String project, String keyId, String key) {}

    Fixture fixture() throws Exception {
        var owner = account();
        String org = create(owner, "/api/organizations", "SDK test").get("id").asText();
        String project = create(owner, "/api/organizations/" + org + "/projects", "Shop")
            .get("id")
            .asText();
        var key = create(owner, "/api/projects/" + project + "/api-keys", "Browser");
        return new Fixture(
            owner,
            project,
            key.get("key").get("id").asText(),
            key.get("apiKey").asText()
        );
    }

    Map<String, Object> event(UUID id) {
        return Map.of(
            "eventId",
            id.toString(),
            "type",
            "HTTP_REQUEST",
            "timestamp",
            Instant.now().toString(),
            "environment",
            "test",
            "release",
            "1.0.0",
            "http",
            Map.of(
                "method",
                "GET",
                "url",
                "https://user:secret@shop.test/api/products?email=private#token",
                "statusCode",
                200,
                "durationMs",
                12.5,
                "outcome",
                "HTTP_RESPONSE"
            ),
            "page",
            Map.of("url", "/store?session=secret#private")
        );
    }

    HttpResponse<String> ingest(String key, String body) throws Exception {
        return HttpClient.newHttpClient().send(
            HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/v1/ingest/events"))
                .header("Authorization", "Bearer " + key)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build(),
            HttpResponse.BodyHandlers.ofString()
        );
    }

    String batch(List<?> events) {
        return json.writeValueAsString(Map.of("schemaVersion", 1, "events", events));
    }

    @Test
    void ingestionIsSanitizedIdempotentAndProjectScoped() throws Exception {
        var first = fixture();
        var second = fixture();
        UUID id = UUID.randomUUID();
        String payload = batch(List.of(event(id)));
        var response = ingest(first.key(), payload);
        assertEquals(202, response.statusCode(), response.body());
        assertEquals(1, json.readTree(response.body()).get("accepted").asInt());
        assertTrue(response.headers().allValues("set-cookie").isEmpty());
        assertEquals(
            1,
            json.readTree(ingest(first.key(), payload).body()).get("duplicates").asInt()
        );
        assertEquals(
            1,
            json.readTree(ingest(second.key(), payload).body()).get("accepted").asInt()
        );
        var stored = db
            .sql("SELECT http_path,page_path FROM telemetry_events WHERE project_id=:id")
            .param("id", UUID.fromString(first.project()))
            .query()
            .singleRow();
        assertEquals("/api/products", stored.get("http_path"));
        assertEquals("/store", stored.get("page_path"));
        var status = first.owner().get("/api/projects/" + first.project() + "/telemetry");
        assertEquals(200, status.statusCode());
        assertEquals(1, json.readTree(status.body()).get("summary").get("receivedEvents").asInt());
        assertEquals(
            404,
            second
                .owner()
                .get("/api/projects/" + first.project() + "/telemetry")
                .statusCode()
        );
        var bearer = HttpClient.newHttpClient().send(
            HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/projects"))
                .header("Authorization", "Bearer " + first.key())
                .GET()
                .build(),
            HttpResponse.BodyHandlers.ofString()
        );
        assertEquals(401, bearer.statusCode());
        first
            .owner()
            .mutate(
                "DELETE",
                "/api/projects/" + first.project() + "/api-keys/" + first.keyId(),
                null
            );
        assertEquals(401, ingest(first.key(), payload).statusCode());
    }

    @Test
    void concurrentRetriesDoNotInsertTwice() throws Exception {
        var fixture = fixture();
        String payload = batch(List.of(event(UUID.randomUUID())));
        var calls = java.util.stream.IntStream.range(0, 4)
            .mapToObj(i ->
                CompletableFuture.supplyAsync(() -> {
                    try {
                        return ingest(fixture.key(), payload);
                    } catch (Exception error) {
                        throw new RuntimeException(error);
                    }
                })
            )
            .toList();
        for (var call : calls) assertEquals(202, call.join().statusCode());
        assertEquals(
            1,
            db
                .sql("SELECT count(*) FROM telemetry_events WHERE project_id=:id")
                .param("id", UUID.fromString(fixture.project()))
                .query(Integer.class)
                .single()
        );
    }

    @Test
    void invalidOversizedAndOverQuotaBatchesDoNotPartiallyPersist() throws Exception {
        var fixture = fixture();
        assertEquals(400, ingest(fixture.key(), batch(List.of())).statusCode());
        var invalid = new java.util.HashMap<>(event(UUID.randomUUID()));
        invalid.put("environment", "contains spaces");
        assertEquals(
            400,
            ingest(fixture.key(), batch(List.of(event(UUID.randomUUID()), invalid))).statusCode()
        );
        assertEquals(400, ingest(fixture.key(), "not-json").statusCode());
        var missingDuration = new java.util.HashMap<>(event(UUID.randomUUID()));
        missingDuration.put(
            "http",
            Map.of("method", "GET", "url", "/items", "statusCode", 200, "outcome", "HTTP_RESPONSE")
        );
        assertEquals(400, ingest(fixture.key(), batch(List.of(missingDuration))).statusCode());
        assertEquals(
            400,
            ingest(
                fixture.key(),
                batch(java.util.Collections.nCopies(51, event(UUID.randomUUID())))
            ).statusCode()
        );
        var futureEvent = new java.util.HashMap<>(event(UUID.randomUUID()));
        futureEvent.put("timestamp", Instant.now().plusSeconds(3600).toString());
        assertEquals(400, ingest(fixture.key(), batch(List.of(futureEvent))).statusCode());
        assertEquals(413, ingest(fixture.key(), " ".repeat(65537)).statusCode());
        var chunked = HttpClient.newHttpClient().send(
            HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/v1/ingest/events"))
                .header("Authorization", "Bearer " + fixture.key())
                .header("Content-Type", "application/json")
                .POST(
                    HttpRequest.BodyPublishers.ofInputStream(() ->
                        new java.io.ByteArrayInputStream(new byte[65537])
                    )
                )
                .build(),
            HttpResponse.BodyHandlers.ofString()
        );
        assertEquals(413, chunked.statusCode());
        db.sql("INSERT INTO ingestion_usage VALUES (:id,(now() AT TIME ZONE 'UTC')::date,100000)")
            .param("id", UUID.fromString(fixture.project()))
            .update();
        assertEquals(
            429,
            ingest(fixture.key(), batch(List.of(event(UUID.randomUUID())))).statusCode()
        );
        assertEquals(
            0,
            db
                .sql("SELECT count(*) FROM telemetry_events WHERE project_id=:id")
                .param("id", UUID.fromString(fixture.project()))
                .query(Integer.class)
                .single()
        );
    }

    @Test
    void corsPreflightIsPublicButSessionCookiesCannotAuthenticateIngestion() throws Exception {
        var fixture = fixture();
        var request = HttpRequest.newBuilder(
            URI.create("http://127.0.0.1:" + port + "/v1/ingest/events")
        )
            .header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "authorization,content-type")
            .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
            .build();
        var response = HttpClient.newHttpClient().send(
            request,
            HttpResponse.BodyHandlers.ofString()
        );
        assertEquals(200, response.statusCode());
        assertEquals(
            "http://localhost:5173",
            response.headers().firstValue("access-control-allow-origin").orElse("")
        );
        assertTrue(response.headers().firstValue("access-control-allow-credentials").isEmpty());
        assertEquals(
            401,
            fixture
                .owner()
                .send(
                    "POST",
                    "/v1/ingest/events",
                    batch(List.of(event(UUID.randomUUID()))),
                    null,
                    false
                )
                .statusCode()
        );
        var denied = HttpClient.newHttpClient().send(
            HttpRequest.newBuilder(request.uri())
                .header("Origin", "https://unapproved.test")
                .header("Access-Control-Request-Method", "POST")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .build(),
            HttpResponse.BodyHandlers.ofString()
        );
        assertEquals(403, denied.statusCode());
    }
}
