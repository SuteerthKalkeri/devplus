package com.devpulse.ingestionkey;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Safe response model: neither a raw key nor its hash is exposed. */
public record IngestionKey(
    UUID id,
    String name,
    String keyPrefix,
    OffsetDateTime createdAt,
    OffsetDateTime revokedAt
) {}
