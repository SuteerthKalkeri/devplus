package com.devpulse.telemetry.ingestion;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Validator;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@RestController
public class IngestionController {

    private static final int MAX_BODY_BYTES = 65_536;
    private final IngestionService ingestion;
    private final Validator validator;
    private final JsonMapper mapper;

    public IngestionController(IngestionService ingestion, Validator validator, JsonMapper mapper) {
        this.ingestion = ingestion;
        this.validator = validator;
        this.mapper = mapper;
    }

    @PostMapping(value = "/v1/ingest/events", consumes = "application/json")
    @ResponseStatus(HttpStatus.ACCEPTED)
    IngestionService.Receipt ingest(
        @AuthenticationPrincipal IngestionIdentity identity,
        HttpServletRequest request
    ) throws IOException {
        if (request.getContentLengthLong() > MAX_BODY_BYTES) throw new ResponseStatusException(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "Batch exceeds 64 KiB."
        );
        // Limit the actual stream too, including chunked requests without Content-Length.
        byte[] bytes = request.getInputStream().readNBytes(MAX_BODY_BYTES + 1);
        if (bytes.length > MAX_BODY_BYTES) throw new ResponseStatusException(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "Batch exceeds 64 KiB."
        );
        EventBatch batch;
        try {
            batch = mapper.readValue(bytes, EventBatch.class);
        } catch (RuntimeException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid telemetry JSON.");
        }
        if (
            batch == null || !validator.validate(batch).isEmpty()
        ) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid telemetry batch.");
        return ingestion.accept(identity, batch);
    }
}
