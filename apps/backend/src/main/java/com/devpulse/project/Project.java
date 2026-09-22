package com.devpulse.project;

import java.time.OffsetDateTime;
import java.util.UUID;

public record Project(
    UUID id,
    UUID organizationId,
    String name,
    String slug,
    OffsetDateTime createdAt
) {}
