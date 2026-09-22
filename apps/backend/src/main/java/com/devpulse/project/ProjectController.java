package com.devpulse.project;

import com.devpulse.common.NamedRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ProjectController {

    private final ProjectService projects;

    public ProjectController(ProjectService projects) {
        this.projects = projects;
    }

    @GetMapping("/projects")
    List<Project> list(Authentication auth) {
        return projects.list(UUID.fromString(auth.getName()));
    }

    @PostMapping("/organizations/{organizationId}/projects")
    @ResponseStatus(HttpStatus.CREATED)
    Project create(
        Authentication auth,
        @PathVariable UUID organizationId,
        @Valid @RequestBody NamedRequest request
    ) {
        return projects.create(organizationId, UUID.fromString(auth.getName()), request.name());
    }

    @GetMapping("/projects/{id}")
    Project get(Authentication auth, @PathVariable UUID id) {
        return projects.get(id, UUID.fromString(auth.getName()));
    }

    @PatchMapping("/projects/{id}")
    Project rename(
        Authentication auth,
        @PathVariable UUID id,
        @Valid @RequestBody NamedRequest request
    ) {
        return projects.rename(id, UUID.fromString(auth.getName()), request.name());
    }

    @DeleteMapping("/projects/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Authentication auth, @PathVariable UUID id) {
        projects.delete(id, UUID.fromString(auth.getName()));
    }
}
