package com.devpulse;

import static org.junit.jupiter.api.Assertions.*;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
abstract class ApiIntegrationTestSupport {

    @Value("${local.server.port}")
    int port;

    @Autowired
    JdbcClient db;

    final JsonMapper json = new JsonMapper();
    final List<UUID> accounts = new ArrayList<>();
    final String password = "DevPulse-test-pass-2026";

    @AfterEach
    void cleanOwnedFixtures() {
        for (UUID account : accounts) {
            db.sql("DELETE FROM organizations WHERE created_by=:id").param("id", account).update();
            db.sql("DELETE FROM spring_session WHERE principal_name=:id")
                .param("id", account.toString())
                .update();
            db.sql("DELETE FROM users WHERE id=:id").param("id", account).update();
        }
    }

    class Browser {

        final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        final HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).build();
        String email;
        UUID id;

        HttpResponse<String> send(
            String method,
            String path,
            String body,
            String token,
            boolean form
        ) throws Exception {
            var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
            if (token != null) request.header("X-CSRF-TOKEN", token);
            if (body != null) request.header(
                "Content-Type",
                form ? "application/x-www-form-urlencoded" : "application/json"
            );
            return client.send(
                request
                    .method(
                        method,
                        body == null
                            ? HttpRequest.BodyPublishers.noBody()
                            : HttpRequest.BodyPublishers.ofString(body)
                    )
                    .build(),
                HttpResponse.BodyHandlers.ofString()
            );
        }

        String csrf() throws Exception {
            var response = send("GET", "/api/auth/csrf", null, null, false);
            assertEquals(200, response.statusCode());
            return json.readTree(response.body()).get("token").asText();
        }

        HttpResponse<String> get(String path) throws Exception {
            return send("GET", path, null, null, false);
        }

        HttpResponse<String> mutate(String method, String path, Object value) throws Exception {
            return send(
                method,
                path,
                value == null ? null : json.writeValueAsString(value),
                csrf(),
                false
            );
        }

        void login() throws Exception {
            var response = send(
                "POST",
                "/api/auth/login",
                "email=" +
                    URLEncoder.encode(email, StandardCharsets.UTF_8) +
                    "&password=" +
                    URLEncoder.encode(password, StandardCharsets.UTF_8),
                csrf(),
                true
            );
            assertEquals(204, response.statusCode(), response.body());
        }
    }

    Browser account() throws Exception {
        var browser = new Browser();
        browser.email = "test-" + UUID.randomUUID() + "@example.com";
        var response = browser.mutate(
            "POST",
            "/api/auth/register",
            Map.of("name", "Test Developer", "email", browser.email, "password", password)
        );
        assertEquals(201, response.statusCode(), response.body());
        browser.id = UUID.fromString(json.readTree(response.body()).get("id").asText());
        accounts.add(browser.id);
        browser.login();
        return browser;
    }

    JsonNode create(Browser browser, String path, String name) throws Exception {
        var response = browser.mutate("POST", path, Map.of("name", name));
        assertEquals(201, response.statusCode(), response.body());
        return json.readTree(response.body());
    }
}
