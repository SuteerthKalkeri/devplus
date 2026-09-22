package com.devpulse.organization;

import com.devpulse.common.Slugs;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationService {

    private final OrganizationRepository organizations;

    public OrganizationService(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    public List<Organization> list(UUID userId) {
        return organizations.findByMember(userId);
    }

    @Transactional
    public Organization create(UUID userId, String name) {
        UUID id = UUID.randomUUID();
        var organization = new Organization(id, name.trim(), Slugs.fromName(name, id), "OWNER");
        organizations.insert(organization, userId);
        return organization;
    }
}
