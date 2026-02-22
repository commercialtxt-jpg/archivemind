CREATE TYPE edge_type AS ENUM (
    'entity_co_mention',
    'entity_concept',
    'location_concept',
    'cross_region',
    'concept_concept',
    'entity_location'
);

CREATE TABLE graph_edges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_type     TEXT NOT NULL,
    source_id       UUID NOT NULL,
    target_type     TEXT NOT NULL,
    target_id       UUID NOT NULL,
    edge_type       edge_type NOT NULL,
    strength        REAL NOT NULL DEFAULT 1.0,
    label           TEXT,
    is_dashed       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_edges_workspace ON graph_edges(workspace_id);
CREATE INDEX idx_edges_source ON graph_edges(source_type, source_id);
CREATE INDEX idx_edges_target ON graph_edges(target_type, target_id);
CREATE UNIQUE INDEX idx_edges_pair ON graph_edges(workspace_id, source_type, source_id, target_type, target_id, edge_type);
