package com.devpulse.telemetry.ingestion;

import java.util.UUID;

public record IngestionIdentity(UUID keyId, UUID projectId) {}
