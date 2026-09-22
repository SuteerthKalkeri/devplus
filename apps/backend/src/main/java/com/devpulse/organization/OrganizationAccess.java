package com.devpulse.organization;

import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Central authorization boundary shared by projects and ingestion keys. */
@Component
public class OrganizationAccess {

    private final OrganizationRepository organizations;

    public OrganizationAccess(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    public void requireMember(UUID organizationId, UUID userId) {
        role(organizationId, userId);
    }

    public void requireManager(UUID organizationId, UUID userId) {
        if (!Set.of("OWNER", "ADMIN").contains(role(organizationId, userId))) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only workspace owners and admins can make this change."
            );
        }
    }

    private String role(UUID organizationId, UUID userId) {
        // A non-member receives the same response as an unknown resource.
        return organizations
            .findRole(organizationId, userId)
            .orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found.")
            );
    }
}
