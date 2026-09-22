package com.devpulse.ingestionkey;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class IngestionKeyRepository {

    private final JdbcClient db;

    public IngestionKeyRepository(JdbcClient db) {
        this.db = db;
    }

    public List<IngestionKey> findByProject(UUID projectId) {
        return db
            .sql(
                "SELECT id, name, key_prefix, created_at, revoked_at FROM ingestion_keys WHERE project_id = :project ORDER BY created_at DESC"
            )
            .param("project", projectId)
            .query(IngestionKey.class)
            .list();
    }

    public IngestionKey insert(UUID id, UUID projectId, String name, String prefix, String hash) {
        return db
            .sql(
                """
                INSERT INTO ingestion_keys (id, project_id, name, key_prefix, key_hash)
                VALUES (:id, :project, :name, :prefix, :hash)
                RETURNING id, name, key_prefix, created_at, revoked_at
                """
            )
            .param("id", id)
            .param("project", projectId)
            .param("name", name)
            .param("prefix", prefix)
            .param("hash", hash)
            .query(IngestionKey.class)
            .single();
    }

    public boolean revoke(UUID projectId, UUID id) {
        return (
            db
                .sql(
                    "UPDATE ingestion_keys SET revoked_at = COALESCE(revoked_at, now()) WHERE id = :id AND project_id = :project"
                )
                .param("id", id)
                .param("project", projectId)
                .update() > 0
        );
    }
}
