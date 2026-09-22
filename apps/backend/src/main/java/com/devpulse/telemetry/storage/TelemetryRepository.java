package com.devpulse.telemetry.storage;

import com.devpulse.telemetry.ingestion.EventBatch;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class TelemetryRepository {

    private final JdbcClient db;

    public TelemetryRepository(JdbcClient db) {
        this.db = db;
    }

    public record Summary(long receivedEvents, OffsetDateTime lastReceivedAt) {}

    public record RecentEvent(
        UUID eventId,
        OffsetDateTime occurredAt,
        OffsetDateTime receivedAt,
        String environment,
        String release,
        String httpMethod,
        String httpPath,
        int httpStatus,
        String outcome,
        double durationMs,
        String pagePath
    ) {}

    public boolean reserveQuota(UUID project, int size, int limit) {
        return db
            .sql(
                """
                INSERT INTO ingestion_usage (project_id,usage_date,submitted_events)
                SELECT :project,(now() AT TIME ZONE 'UTC')::date,:size WHERE :size <= :limit
                ON CONFLICT (project_id,usage_date) DO UPDATE
                SET submitted_events=ingestion_usage.submitted_events+EXCLUDED.submitted_events
                WHERE ingestion_usage.submitted_events+EXCLUDED.submitted_events <= :limit
                RETURNING submitted_events
                """
            )
            .param("project", project)
            .param("size", size)
            .param("limit", limit)
            .query(Integer.class)
            .optional()
            .isPresent();
    }

    public int insert(UUID project, EventBatch.HttpEvent event) {
        return db
            .sql(
                """
                INSERT INTO telemetry_events (project_id,event_id,event_type,occurred_at,environment,release,
                    http_method,http_path,http_status,outcome,duration_ms,page_path)
                VALUES (:project,:event,'HTTP_REQUEST',:time,:environment,:release,:method,:path,:status,:outcome,:duration,:page)
                ON CONFLICT (project_id,event_id) DO NOTHING
                """
            )
            .param("project", project)
            .param("event", event.eventId())
            .param("time", event.timestamp().atOffset(ZoneOffset.UTC))
            .param("environment", event.environment())
            .param("release", event.release())
            .param("method", event.http().method())
            .param("path", event.http().url())
            .param("status", event.http().statusCode())
            .param("outcome", event.http().outcome().name())
            .param("duration", event.http().durationMs())
            .param("page", event.page().url())
            .update();
    }

    public Summary summary(UUID project) {
        return db
            .sql(
                "SELECT count(*) AS received_events,max(received_at) AS last_received_at FROM telemetry_events WHERE project_id=:project"
            )
            .param("project", project)
            .query(Summary.class)
            .single();
    }

    public List<RecentEvent> recent(UUID project) {
        return db
            .sql(
                """
                SELECT event_id,occurred_at,received_at,environment,release,http_method,http_path,http_status,outcome,duration_ms,page_path
                FROM telemetry_events WHERE project_id=:project ORDER BY received_at DESC,id DESC LIMIT 20
                """
            )
            .param("project", project)
            .query(RecentEvent.class)
            .list();
    }

    public void purgeExpired() {
        db.sql(
            "DELETE FROM telemetry_events WHERE received_at < now()-interval '14 days'"
        ).update();
        db.sql(
            "DELETE FROM ingestion_usage WHERE usage_date < (now() AT TIME ZONE 'UTC')::date-2"
        ).update();
    }
}
