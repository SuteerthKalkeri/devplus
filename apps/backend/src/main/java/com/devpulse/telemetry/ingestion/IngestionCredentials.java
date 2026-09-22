package com.devpulse.telemetry.ingestion;

import com.devpulse.ingestionkey.KeyHash;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class IngestionCredentials {

    private final JdbcClient db;

    public IngestionCredentials(JdbcClient db) {
        this.db = db;
    }

    public Optional<IngestionIdentity> authenticate(String authorization) {
        if (
            authorization == null || !authorization.matches("Bearer dp_ingest_[A-Za-z0-9_-]{43}")
        ) return Optional.empty();
        return db
            .sql(
                "SELECT id AS key_id, project_id FROM ingestion_keys WHERE key_hash=:hash AND revoked_at IS NULL"
            )
            .param("hash", KeyHash.sha256(authorization.substring(7)))
            .query(IngestionIdentity.class)
            .optional();
    }

    public boolean lockActiveKey(IngestionIdentity identity) {
        // Serialize batches for this key through commit; revocation cannot race an accepted write.
        return db
            .sql(
                "SELECT id FROM ingestion_keys WHERE id=:id AND project_id=:project AND revoked_at IS NULL FOR UPDATE"
            )
            .param("id", identity.keyId())
            .param("project", identity.projectId())
            .query(java.util.UUID.class)
            .optional()
            .isPresent();
    }

    public void markUsed(IngestionIdentity identity) {
        db.sql("UPDATE ingestion_keys SET last_used_at=now() WHERE id=:id")
            .param("id", identity.keyId())
            .update();
    }
}
