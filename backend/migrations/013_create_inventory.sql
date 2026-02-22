CREATE TYPE inventory_status AS ENUM ('charged', 'ready', 'packed', 'low', 'missing');

CREATE TABLE inventory_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    icon            TEXT NOT NULL DEFAULT '📦',
    status          inventory_status NOT NULL DEFAULT 'packed',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_workspace ON inventory_items(workspace_id);
CREATE INDEX idx_inventory_status ON inventory_items(workspace_id, status);
