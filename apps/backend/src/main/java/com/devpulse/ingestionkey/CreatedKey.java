package com.devpulse.ingestionkey;

/** Returned only by key creation; the raw value is never persisted. */
public record CreatedKey(IngestionKey key, String apiKey) {}
