CREATE TYPE sync_direction AS ENUM ('push', 'pull');
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'conflict', 'failed');

CREATE TABLE sync_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    table_name      TEXT NOT NULL,
    record_id       UUID NOT NULL,
    direction       sync_direction NOT NULL,
    status          sync_status NOT NULL DEFAULT 'pending',
    payload         JSONB,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_sync_user ON sync_log(user_id, status);
CREATE INDEX idx_sync_pending ON sync_log(status) WHERE status = 'pending';
