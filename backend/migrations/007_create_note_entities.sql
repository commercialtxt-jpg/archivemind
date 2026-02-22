CREATE TABLE note_entities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    entity_id       UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    mention_count   INTEGER NOT NULL DEFAULT 1,
    first_mention_pos INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ne_unique ON note_entities(note_id, entity_id);
CREATE INDEX idx_ne_entity ON note_entities(entity_id);
