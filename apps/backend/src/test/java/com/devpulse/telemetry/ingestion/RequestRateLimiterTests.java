package com.devpulse.telemetry.ingestion;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class RequestRateLimiterTests {

    @Test
    void limitsEachIdentityAndBoundsTheNumberOfTrackedSources() {
        var limiter = new RequestRateLimiter(
            java.time.Clock.fixed(java.time.Instant.EPOCH, java.time.ZoneOffset.UTC)
        );
        assertTrue(limiter.allow("key:a", 2));
        assertTrue(limiter.allow("key:a", 2));
        assertFalse(limiter.allow("key:a", 2));
        assertTrue(limiter.allow("key:b", 2));
        for (int i = 0; i < 9998; i++) assertTrue(limiter.allow("source:" + i, 1));
        assertFalse(limiter.allow("overflow", 1));
    }
}
