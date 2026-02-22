CREATE TYPE note_type AS ENUM ('interview', 'field_note', 'voice_memo', 'photo');

CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    body            JSONB NOT NULL DEFAULT '{}',
    body_text       TEXT NOT NULL DEFAULT '',
    note_type       note_type NOT NULL DEFAULT 'field_note',
    is_starred      BOOLEAN NOT NULL DEFAULT false,
    location_name   TEXT,
    location_lat    DOUBLE PRECISION,
    location_lng    DOUBLE PRECISION,
    gps_coords      TEXT,
    weather         TEXT,
    temperature_c   REAL,
    time_start      TIMESTAMPTZ,
    time_end        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_notes_workspace ON notes(workspace_id);
CREATE INDEX idx_notes_type ON notes(note_type);
CREATE INDEX idx_notes_starred ON notes(workspace_id, is_starred) WHERE is_starred = true;
CREATE INDEX idx_notes_deleted ON notes(workspace_id, deleted_at);
CREATE INDEX idx_notes_created ON notes(created_at DESC);

CREATE INDEX idx_notes_fts ON notes USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, ''))
);
