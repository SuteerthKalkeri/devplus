package com.devpulse.telemetry.ingestion;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Bounded, single-instance abuse protection. Distributed deployments need a shared limiter. */
@Component
public class RequestRateLimiter {

    private record Window(long minute, int requests) {}

    private final Map<String, Window> windows = new HashMap<>();
    private final Clock clock;
    private long lastCleanup;

    public RequestRateLimiter() {
        this(Clock.systemUTC());
    }

    RequestRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public synchronized boolean allow(String identity, int perMinute) {
        long minute = clock.millis() / 60_000;
        if (minute != lastCleanup) {
            windows.entrySet().removeIf(entry -> entry.getValue().minute() < minute);
            lastCleanup = minute;
        }
        Window previous = windows.get(identity);
        if (previous == null && windows.size() >= 10_000) return false;
        int count = previous == null ? 0 : previous.requests();
        if (count >= perMinute) return false;
        windows.put(identity, new Window(minute, count + 1));
        return true;
    }
}
