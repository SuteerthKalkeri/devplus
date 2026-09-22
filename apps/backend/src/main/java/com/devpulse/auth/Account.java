package com.devpulse.auth;

import java.util.UUID;

public record Account(UUID id, String name, String email) {}
