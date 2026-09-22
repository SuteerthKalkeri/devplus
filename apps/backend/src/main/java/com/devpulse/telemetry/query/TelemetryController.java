package com.devpulse.telemetry.query;

import com.devpulse.project.ProjectService;
import com.devpulse.telemetry.storage.TelemetryRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TelemetryController {

    private final ProjectService projects;
    private final TelemetryRepository events;

    public record Status(
        TelemetryRepository.Summary summary,
        List<TelemetryRepository.RecentEvent> recentEvents
    ) {}

    public TelemetryController(ProjectService projects, TelemetryRepository events) {
        this.projects = projects;
        this.events = events;
    }

    @GetMapping("/api/projects/{projectId}/telemetry")
    Status status(Authentication user, @PathVariable UUID projectId) {
        projects.get(projectId, UUID.fromString(user.getName()));
        return new Status(events.summary(projectId), events.recent(projectId));
    }
}
