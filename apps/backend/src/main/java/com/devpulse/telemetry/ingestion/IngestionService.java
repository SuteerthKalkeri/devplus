package com.devpulse.telemetry.ingestion;

import com.devpulse.telemetry.storage.TelemetryRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IngestionService {

    private final IngestionCredentials credentials;
    private final TelemetryRepository events;
    private final EventSanitizer sanitizer;
    private final int dailyLimit;

    public record Receipt(int accepted, int duplicates) {}

    public IngestionService(
        IngestionCredentials credentials,
        TelemetryRepository events,
        EventSanitizer sanitizer,
        @Value("${devpulse.ingestion.daily-event-limit:100000}") int dailyLimit
    ) {
        this.credentials = credentials;
        this.events = events;
        this.sanitizer = sanitizer;
        this.dailyLimit = dailyLimit;
    }

    @Transactional
    public Receipt accept(IngestionIdentity identity, EventBatch batch) {
        if (!credentials.lockActiveKey(identity)) throw new ResponseStatusException(
            HttpStatus.UNAUTHORIZED,
            "Invalid or revoked ingestion key."
        );
        var sanitized = batch.events().stream().map(sanitizer::sanitize).toList();
        if (
            !events.reserveQuota(identity.projectId(), sanitized.size(), dailyLimit)
        ) throw new ResponseStatusException(
            HttpStatus.TOO_MANY_REQUESTS,
            "Project daily ingestion quota exceeded."
        );
        int inserted = 0;
        for (var event : sanitized) inserted += events.insert(identity.projectId(), event);
        credentials.markUsed(identity);
        return new Receipt(inserted, sanitized.size() - inserted);
    }
}
