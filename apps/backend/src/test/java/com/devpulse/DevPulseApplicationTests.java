package com.devpulse;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class DevPulseApplicationTests extends ApiIntegrationTestSupport {

    @Test
    void accountProjectAndKeyJourneyPersistsAcrossLogout() throws Exception {
        var alice = account();
        String org = create(alice, "/api/organizations", "My Workspace").get("id").asText();
        String project = create(alice, "/api/organizations/" + org + "/projects", "E-Commerce")
            .get("id")
            .asText();
        String endpoint = "/api/projects/" + project;
        JsonNode generated = create(alice, endpoint + "/api-keys", "Production");
        String raw = generated.get("apiKey").asText();
        String key = generated.get("key").get("id").asText();
        assertTrue(raw.startsWith("dp_ingest_"));
        var listed = alice.get(endpoint + "/api-keys");
        assertEquals(200, listed.statusCode());
        assertFalse(listed.body().contains(raw));
        assertFalse(listed.body().contains("keyHash"));
        String hash = db
            .sql("SELECT key_hash FROM ingestion_keys WHERE id=:id")
            .param("id", UUID.fromString(key))
            .query(String.class)
            .single();
        assertEquals(64, hash.length());
        assertNotEquals(raw, hash);
        assertEquals(204, alice.mutate("DELETE", endpoint + "/api-keys/" + key, null).statusCode());
        assertFalse(
            json
                .readTree(alice.get(endpoint + "/api-keys").body())
                .get(0)
                .get("revokedAt")
                .isNull()
        );
        assertTrue(
            db
                .sql("SELECT count(*) FROM spring_session WHERE principal_name=:id")
                .param("id", alice.id.toString())
                .query(Integer.class)
                .single() > 0
        );
        assertEquals(204, alice.mutate("POST", "/api/auth/logout", null).statusCode());
        assertEquals(401, alice.get("/api/auth/me").statusCode());
        alice.login();
        assertEquals("E-Commerce", json.readTree(alice.get(endpoint).body()).get("name").asText());
        assertEquals(
            200,
            alice.mutate("PATCH", endpoint, Map.of("name", "Renamed Store")).statusCode()
        );
        assertEquals(
            "Renamed Store",
            json.readTree(alice.get(endpoint).body()).get("name").asText()
        );
        assertEquals(204, alice.mutate("DELETE", endpoint, null).statusCode());
        assertEquals(404, alice.get(endpoint).statusCode());
    }

    @Test
    void anotherAccountCannotReadOrModifyResources() throws Exception {
        var alice = account();
        var bob = account();
        String org = create(alice, "/api/organizations", "Private Workspace").get("id").asText();
        String project = create(alice, "/api/organizations/" + org + "/projects", "Private App")
            .get("id")
            .asText();
        String endpoint = "/api/projects/" + project;
        String key = create(alice, endpoint + "/api-keys", "Browser")
            .get("key")
            .get("id")
            .asText();
        assertEquals("[]", bob.get("/api/projects").body());
        assertEquals(404, bob.get(endpoint).statusCode());
        assertEquals(404, bob.get(endpoint + "/api-keys").statusCode());
        assertEquals(404, bob.mutate("PATCH", endpoint, Map.of("name", "Stolen")).statusCode());
        assertEquals(404, bob.mutate("DELETE", endpoint, null).statusCode());
        assertEquals(
            404,
            bob.mutate("POST", endpoint + "/api-keys", Map.of("name", "Stolen")).statusCode()
        );
        assertEquals(404, bob.mutate("DELETE", endpoint + "/api-keys/" + key, null).statusCode());
        assertEquals(
            404,
            bob
                .mutate("POST", "/api/organizations/" + org + "/projects", Map.of("name", "Stolen"))
                .statusCode()
        );
        // Membership grants reads, while only OWNER/ADMIN may manage the project.
        db.sql(
            "INSERT INTO organization_members (organization_id,user_id,role) VALUES (:org,:user,'MEMBER')"
        )
            .param("org", UUID.fromString(org))
            .param("user", bob.id)
            .update();
        assertEquals(200, bob.get(endpoint).statusCode());
        assertEquals(403, bob.mutate("DELETE", endpoint, null).statusCode());
        assertEquals(
            403,
            bob.mutate("POST", endpoint + "/api-keys", Map.of("name", "Unauthorized")).statusCode()
        );
    }

    @Test
    void csrfCredentialsAndSessionRotationAreEnforced() throws Exception {
        var alice = account();
        assertEquals(
            403,
            alice
                .send("POST", "/api/organizations", "{\"name\":\"Blocked\"}", null, false)
                .statusCode()
        );
        alice.mutate("POST", "/api/auth/logout", null);
        String oldCsrf = alice.csrf();
        String oldSession = alice.cookies
            .getCookieStore()
            .getCookies()
            .stream()
            .filter(cookie -> cookie.getName().equals("SESSION"))
            .findFirst()
            .orElseThrow()
            .getValue();
        assertEquals(
            401,
            alice
                .send(
                    "POST",
                    "/api/auth/login",
                    "email=" + alice.email + "&password=incorrect",
                    oldCsrf,
                    true
                )
                .statusCode()
        );
        alice.login();
        String newSession = alice.cookies
            .getCookieStore()
            .getCookies()
            .stream()
            .filter(cookie -> cookie.getName().equals("SESSION"))
            .findFirst()
            .orElseThrow()
            .getValue();
        assertNotEquals(oldSession, newSession);
        assertEquals(
            403,
            alice
                .send("POST", "/api/organizations", "{\"name\":\"Stale token\"}", oldCsrf, false)
                .statusCode()
        );
        var anonymous = new Browser();
        assertEquals(401, anonymous.get("/api/projects").statusCode());
        var duplicate = anonymous.mutate(
            "POST",
            "/api/auth/register",
            Map.of(
                "name",
                "Duplicate",
                "email",
                alice.email.toUpperCase(Locale.ROOT),
                "password",
                password
            )
        );
        assertEquals(409, duplicate.statusCode());
        assertEquals(
            400,
            anonymous
                .mutate(
                    "POST",
                    "/api/auth/register",
                    Map.of("name", "Test", "email", "new@example.com", "password", "short")
                )
                .statusCode()
        );
        assertEquals(200, anonymous.get("/actuator/health").statusCode());
    }
}
