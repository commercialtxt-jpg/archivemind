CREATE TYPE media_type AS ENUM ('audio', 'photo', 'video');
CREATE TYPE transcription_status AS ENUM ('none', 'pending', 'processing', 'completed', 'failed');

CREATE TABLE media (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id                 UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    media_type              media_type NOT NULL,
    s3_key                  TEXT NOT NULL,
    original_filename       TEXT,
    mime_type               TEXT,
    file_size_bytes         BIGINT,
    duration_seconds        REAL,
    thumbnail_s3_key        TEXT,
    label                   TEXT,
    transcription_status    transcription_status NOT NULL DEFAULT 'none',
    transcription_text      TEXT,
    sort_order              INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_note ON media(note_id);
CREATE INDEX idx_media_type ON media(note_id, media_type);
