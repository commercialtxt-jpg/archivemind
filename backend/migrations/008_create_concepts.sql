CREATE TABLE concepts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    category        TEXT,
    icon            TEXT NOT NULL DEFAULT '🏷',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_concepts_workspace ON concepts(workspace_id);
CREATE UNIQUE INDEX idx_concepts_name ON concepts(workspace_id, name);
