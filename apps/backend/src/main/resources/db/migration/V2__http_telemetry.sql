ALTER TABLE ingestion_keys ADD COLUMN last_used_at TIMESTAMPTZ;

CREATE TABLE telemetry_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type = 'HTTP_REQUEST'),
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    environment VARCHAR(32) NOT NULL,
    release VARCHAR(100),
    http_method VARCHAR(10) NOT NULL,
    http_path VARCHAR(2048) NOT NULL,
    http_status INTEGER NOT NULL CHECK (http_status = 0 OR http_status BETWEEN 100 AND 599),
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('HTTP_RESPONSE','NETWORK_ERROR','ABORTED')),
    duration_ms DOUBLE PRECISION NOT NULL CHECK (duration_ms >= 0 AND duration_ms <= 3600000),
    page_path VARCHAR(2048) NOT NULL,
    UNIQUE (project_id, event_id)
);
CREATE INDEX telemetry_project_received_idx ON telemetry_events(project_id, received_at DESC, id DESC);
CREATE INDEX telemetry_retention_idx ON telemetry_events(received_at);

CREATE TABLE ingestion_usage (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    submitted_events INTEGER NOT NULL,
    PRIMARY KEY (project_id, usage_date)
);
