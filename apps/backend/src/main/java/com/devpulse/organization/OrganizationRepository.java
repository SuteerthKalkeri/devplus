package com.devpulse.organization;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class OrganizationRepository {

    private final JdbcClient db;

    public OrganizationRepository(JdbcClient db) {
        this.db = db;
    }

    public List<Organization> findByMember(UUID userId) {
        return db
            .sql(
                """
                SELECT o.id, o.name, o.slug, m.role
                FROM organizations o
                JOIN organization_members m ON m.organization_id = o.id
                WHERE m.user_id = :userId
                ORDER BY o.created_at
                """
            )
            .param("userId", userId)
            .query(Organization.class)
            .list();
    }

    public Optional<String> findRole(UUID organizationId, UUID userId) {
        return db
            .sql(
                "SELECT role FROM organization_members WHERE organization_id = :organizationId AND user_id = :userId"
            )
            .param("organizationId", organizationId)
            .param("userId", userId)
            .query(String.class)
            .optional();
    }

    public void insert(Organization organization, UUID ownerId) {
        db.sql(
            "INSERT INTO organizations (id, name, slug, created_by) VALUES (:id, :name, :slug, :owner)"
        )
            .param("id", organization.id())
            .param("name", organization.name())
            .param("slug", organization.slug())
            .param("owner", ownerId)
            .update();
        db.sql(
            "INSERT INTO organization_members (organization_id, user_id, role) VALUES (:org, :user, 'OWNER')"
        )
            .param("org", organization.id())
            .param("user", ownerId)
            .update();
    }
}
