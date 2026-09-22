package com.devpulse.telemetry.storage;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class TelemetryRetention {

    private final TelemetryRepository events;

    public TelemetryRetention(TelemetryRepository events) {
        this.events = events;
    }

    @Scheduled(initialDelayString = "PT10M", fixedDelayString = "PT6H")
    public void purge() {
        events.purgeExpired();
    }
}
