package com.devpulse.telemetry.ingestion;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EventBatch(
    @NotNull @Min(1) @Max(1) Integer schemaVersion,
    @NotNull @Size(min = 1, max = 50) List<@NotNull @Valid HttpEvent> events
) {
    public enum EventType {
        HTTP_REQUEST,
    }

    public enum Outcome {
        HTTP_RESPONSE,
        NETWORK_ERROR,
        ABORTED,
    }

    public record HttpEvent(
        @NotNull UUID eventId,
        @NotNull EventType type,
        @NotNull Instant timestamp,
        @NotBlank @Pattern(regexp = "[a-zA-Z0-9_-]{1,32}") String environment,
        @Size(max = 100) String release,
        @NotNull @Valid HttpDetails http,
        @NotNull @Valid Page page
    ) {}

    public record HttpDetails(
        @NotBlank
        @Pattern(regexp = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE")
        String method,
        @NotBlank @Size(max = 2048) String url,
        @NotNull @Min(0) @Max(599) Integer statusCode,
        @NotNull @DecimalMin("0") @DecimalMax("3600000") Double durationMs,
        @NotNull Outcome outcome
    ) {}

    public record Page(@NotBlank @Size(max = 2048) String url) {}
}
