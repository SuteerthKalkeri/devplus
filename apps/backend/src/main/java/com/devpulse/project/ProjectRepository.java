package com.devpulse.project;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ProjectRepository {

    private final JdbcClient db;

    public ProjectRepository(JdbcClient db) {
        this.db = db;
    }

    public List<Project> findByMember(UUID userId) {
        return db
            .sql(
                """
                SELECT p.id, p.organization_id, p.name, p.slug, p.created_at
                FROM projects p
                JOIN organization_members m ON m.organization_id = p.organization_id
                WHERE m.user_id = :userId
                ORDER BY p.created_at DESC
                """
            )
            .param("userId", userId)
            .query(Project.class)
            .list();
    }

    public Optional<Project> findById(UUID id) {
        return db
            .sql("SELECT id, organization_id, name, slug, created_at FROM projects WHERE id = :id")
            .param("id", id)
            .query(Project.class)
            .optional();
    }

    public void insert(UUID id, UUID organizationId, String name, String slug) {
        db.sql(
            "INSERT INTO projects (id, organization_id, name, slug) VALUES (:id, :org, :name, :slug)"
        )
            .param("id", id)
            .param("org", organizationId)
            .param("name", name)
            .param("slug", slug)
            .update();
    }

    public void rename(UUID id, String name) {
        db.sql("UPDATE projects SET name = :name, updated_at = now() WHERE id = :id")
            .param("name", name)
            .param("id", id)
            .update();
    }

    public void delete(UUID id) {
        db.sql("DELETE FROM projects WHERE id = :id").param("id", id).update();
    }
}
