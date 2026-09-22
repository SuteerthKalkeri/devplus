package com.devpulse.organization;

import java.util.UUID;

public record Organization(UUID id, String name, String slug, String role) {}
