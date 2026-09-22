package com.devpulse.project;

import com.devpulse.common.Slugs;
import com.devpulse.organization.OrganizationAccess;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectService {

    private final ProjectRepository projects;
    private final OrganizationAccess access;

    public ProjectService(ProjectRepository projects, OrganizationAccess access) {
        this.projects = projects;
        this.access = access;
    }

    public List<Project> list(UUID userId) {
        return projects.findByMember(userId);
    }

    public Project get(UUID id, UUID userId) {
        Project project = find(id);
        access.requireMember(project.organizationId(), userId);
        return project;
    }

    public Project requireManager(UUID id, UUID userId) {
        Project project = find(id);
        access.requireManager(project.organizationId(), userId);
        return project;
    }

    @Transactional
    public Project create(UUID organizationId, UUID userId, String name) {
        access.requireManager(organizationId, userId);
        UUID id = UUID.randomUUID();
        projects.insert(id, organizationId, name.trim(), Slugs.fromName(name, id));
        return find(id);
    }

    @Transactional
    public Project rename(UUID id, UUID userId, String name) {
        requireManager(id, userId);
        projects.rename(id, name.trim());
        return find(id);
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        requireManager(id, userId);
        projects.delete(id);
    }

    private Project find(UUID id) {
        return projects
            .findById(id)
            .orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found.")
            );
    }
}
