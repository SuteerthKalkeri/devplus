package com.devpulse.telemetry.ingestion;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class EventSanitizer {

    public EventBatch.HttpEvent sanitize(EventBatch.HttpEvent event) {
        Instant now = Instant.now();
        if (
            event.timestamp().isAfter(now.plus(5, ChronoUnit.MINUTES)) ||
            event.timestamp().isBefore(now.minus(14, ChronoUnit.DAYS))
        ) invalid("Event time is outside the allowed window.");
        var http = event.http();
        boolean response = http.outcome() == EventBatch.Outcome.HTTP_RESPONSE;
        if (
            !Double.isFinite(http.durationMs()) ||
            (response ? http.statusCode() < 100 : http.statusCode() != 0)
        ) invalid("Status and outcome are inconsistent.");
        return new EventBatch.HttpEvent(
            event.eventId(),
            event.type(),
            event.timestamp(),
            event.environment(),
            event.release(),
            new EventBatch.HttpDetails(
                http.method(),
                path(http.url()),
                http.statusCode(),
                http.durationMs(),
                http.outcome()
            ),
            new EventBatch.Page(path(event.page().url()))
        );
    }

    private String path(String value) {
        try {
            URI uri = URI.create(value);
            if (
                uri.getScheme() != null &&
                !uri.getScheme().equalsIgnoreCase("http") &&
                !uri.getScheme().equalsIgnoreCase("https")
            ) invalid("Only HTTP URLs are supported.");
            String path = uri.getRawPath();
            if (path == null || path.isBlank()) return "/";
            // Store the path only. Query strings, fragments, origin and credentials are discarded.
            return path.startsWith("/") ? path : "/" + path;
        } catch (IllegalArgumentException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid event URL.");
        }
    }

    private void invalid(String reason) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
