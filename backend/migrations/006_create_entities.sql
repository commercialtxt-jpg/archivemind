CREATE TYPE entity_type AS ENUM ('person', 'location', 'artifact');

CREATE TABLE entities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    entity_type     entity_type NOT NULL,
    role            TEXT,
    avatar_initials TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entities_workspace ON entities(workspace_id);
CREATE INDEX idx_entities_type ON entities(workspace_id, entity_type);
CREATE INDEX idx_entities_name ON entities USING GIN (to_tsvector('english', name));
