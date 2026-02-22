# ArchiveMind Database Schema & Setup

---

## Overview

Primary database: **PostgreSQL** (Railway-hosted). All IDs are UUIDv7 for natural time-ordering. Timestamps are `TIMESTAMPTZ`. Soft-delete via `deleted_at` where applicable.

Migration tool: **SQLx CLI** (`sqlx migrate run`).

---

## Schema

### `users`

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    avatar_initials TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `workspaces`

```sql
CREATE TABLE workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_user ON workspaces(user_id);
```

### `notes`

```sql
CREATE TYPE note_type AS ENUM ('interview', 'field_note', 'voice_memo', 'photo');

CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    body            JSONB NOT NULL DEFAULT '{}',   -- Tiptap JSON document
    body_text       TEXT NOT NULL DEFAULT '',        -- Plain text extraction for full-text search
    note_type       note_type NOT NULL DEFAULT 'field_note',
    is_starred      BOOLEAN NOT NULL DEFAULT false,
    location_name   TEXT,
    location_lat    DOUBLE PRECISION,
    location_lng    DOUBLE PRECISION,
    gps_coords      TEXT,                           -- Display string e.g. "7.2906°N, 80.6337°E"
    weather         TEXT,                           -- e.g. "28°C · Partly Cloudy"
    temperature_c   REAL,
    time_start      TIMESTAMPTZ,
    time_end        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ                     -- Soft delete (trash)
);

CREATE INDEX idx_notes_workspace ON notes(workspace_id);
CREATE INDEX idx_notes_type ON notes(note_type);
CREATE INDEX idx_notes_starred ON notes(workspace_id, is_starred) WHERE is_starred = true;
CREATE INDEX idx_notes_deleted ON notes(workspace_id, deleted_at);
CREATE INDEX idx_notes_created ON notes(created_at DESC);

-- Full-text search index
CREATE INDEX idx_notes_fts ON notes USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, ''))
);
```

### `field_trips`

```sql
CREATE TABLE field_trips (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    icon            TEXT NOT NULL DEFAULT '📍',     -- Emoji icon
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_field_trips_workspace ON field_trips(workspace_id);
```

### `note_field_trips` (junction)

```sql
CREATE TABLE note_field_trips (
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    field_trip_id   UUID NOT NULL REFERENCES field_trips(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, field_trip_id)
);

CREATE INDEX idx_nft_field_trip ON note_field_trips(field_trip_id);
```

### `entities`

```sql
CREATE TYPE entity_type AS ENUM ('person', 'location', 'artifact');

CREATE TABLE entities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    entity_type     entity_type NOT NULL,
    role            TEXT,                           -- e.g. "Ayurvedic Practitioner · Kandy"
    avatar_initials TEXT NOT NULL DEFAULT '',       -- e.g. "PR"
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entities_workspace ON entities(workspace_id);
CREATE INDEX idx_entities_type ON entities(workspace_id, entity_type);
CREATE INDEX idx_entities_name ON entities USING GIN (to_tsvector('english', name));
```

### `note_entities` (junction with mention metadata)

```sql
CREATE TABLE note_entities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    entity_id       UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    mention_count   INTEGER NOT NULL DEFAULT 1,
    first_mention_pos INTEGER,                     -- Character position in body_text
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ne_unique ON note_entities(note_id, entity_id);
CREATE INDEX idx_ne_entity ON note_entities(entity_id);
```

### `concepts`

```sql
CREATE TABLE concepts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    category        TEXT,                           -- Grouping category
    icon            TEXT NOT NULL DEFAULT '🏷',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_concepts_workspace ON concepts(workspace_id);
CREATE UNIQUE INDEX idx_concepts_name ON concepts(workspace_id, name);
```

### `note_concepts` (junction)

```sql
CREATE TABLE note_concepts (
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    concept_id      UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, concept_id)
);

CREATE INDEX idx_nc_concept ON note_concepts(concept_id);
```

### `tags`

```sql
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_tags_name ON tags(workspace_id, name);
```

### `note_tags` (junction)

```sql
CREATE TABLE note_tags (
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_nt_tag ON note_tags(tag_id);
```

### `media`

```sql
CREATE TYPE media_type AS ENUM ('audio', 'photo', 'video');
CREATE TYPE transcription_status AS ENUM ('none', 'pending', 'processing', 'completed', 'failed');

CREATE TABLE media (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id                 UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    media_type              media_type NOT NULL,
    s3_key                  TEXT NOT NULL,           -- S3 object key
    original_filename       TEXT,
    mime_type               TEXT,
    file_size_bytes         BIGINT,
    duration_seconds        REAL,                    -- For audio/video
    thumbnail_s3_key        TEXT,                    -- For photos/video thumbnails
    label                   TEXT,                    -- e.g. "Sida r.", "Clay mortar"
    transcription_status    transcription_status NOT NULL DEFAULT 'none',
    transcription_text      TEXT,
    sort_order              INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_note ON media(note_id);
CREATE INDEX idx_media_type ON media(note_id, media_type);
```

### `inventory_items`

```sql
CREATE TYPE inventory_status AS ENUM ('charged', 'ready', 'packed', 'low', 'missing');

CREATE TABLE inventory_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    icon            TEXT NOT NULL DEFAULT '📦',     -- Emoji icon
    status          inventory_status NOT NULL DEFAULT 'packed',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_workspace ON inventory_items(workspace_id);
CREATE INDEX idx_inventory_status ON inventory_items(workspace_id, status);
```

### `routines`

```sql
CREATE TABLE routines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    checklist       JSONB NOT NULL DEFAULT '[]',   -- Array of { "item": "Camera", "checked": true }
    is_active       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routines_workspace ON routines(workspace_id);
```

### `graph_edges`

```sql
CREATE TYPE edge_type AS ENUM (
    'entity_co_mention',    -- Two entities mentioned in same note
    'entity_concept',       -- Entity linked to concept
    'location_concept',     -- Location linked to concept
    'cross_region',         -- Cross-region link (dashed in UI)
    'concept_concept',      -- Concept-to-concept
    'entity_location'       -- Entity associated with location
);

CREATE TABLE graph_edges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_type     TEXT NOT NULL,                  -- 'entity', 'concept', 'location'
    source_id       UUID NOT NULL,
    target_type     TEXT NOT NULL,
    target_id       UUID NOT NULL,
    edge_type       edge_type NOT NULL,
    strength        REAL NOT NULL DEFAULT 1.0,      -- 0.0–1.0, determines visual weight
    label           TEXT,                           -- e.g. "linked via Traditional Medicine"
    is_dashed       BOOLEAN NOT NULL DEFAULT false, -- Cross-region links are dashed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_edges_workspace ON graph_edges(workspace_id);
CREATE INDEX idx_edges_source ON graph_edges(source_type, source_id);
CREATE INDEX idx_edges_target ON graph_edges(target_type, target_id);
CREATE UNIQUE INDEX idx_edges_pair ON graph_edges(workspace_id, source_type, source_id, target_type, target_id, edge_type);
```

### `stars`

```sql
-- Stars are tracked via notes.is_starred boolean field.
-- This table provides an audit trail and timestamp for when stars were added.
CREATE TABLE stars (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id     UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, note_id)
);
```

### `sync_log`

```sql
CREATE TYPE sync_direction AS ENUM ('push', 'pull');
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'conflict', 'failed');

CREATE TABLE sync_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    table_name      TEXT NOT NULL,
    record_id       UUID NOT NULL,
    direction       sync_direction NOT NULL,
    status          sync_status NOT NULL DEFAULT 'pending',
    payload         JSONB,                         -- Snapshot of data synced
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_sync_user ON sync_log(user_id, status);
CREATE INDEX idx_sync_pending ON sync_log(status) WHERE status = 'pending';
```

---

## Migration Setup

### Install SQLx CLI

```bash
cargo install sqlx-cli --no-default-features --features postgres
```

### Create Database

```bash
sqlx database create
```

### Run Migrations

```bash
sqlx migrate run
```

### Migration File Naming

```
migrations/
├── 001_create_users.sql
├── 002_create_workspaces.sql
├── 003_create_notes.sql
├── 004_create_field_trips.sql
├── 005_create_entities.sql
├── 006_create_concepts.sql
├── 007_create_tags.sql
├── 008_create_media.sql
├── 009_create_inventory.sql
├── 010_create_routines.sql
├── 011_create_graph_edges.sql
├── 012_create_stars.sql
└── 013_create_sync_log.sql
```

---

## Seed Data (Development)

Based on the mockup's sample content:

### Workspace
- "Field Research" workspace for user "AK"

### Field Trips
| Name | Icon | Note Count |
|------|------|------------|
| Kandy Highlands | 🌿 | 18 |
| Galle Coastal | 🌊 | 12 |
| Ella Caves Survey | 🏔 | 9 |
| Colombo Urban | 🌺 | 8 |

### Concepts
| Name | Icon | Note Count |
|------|------|------------|
| Traditional Medicine | 🌿 | 11 |
| Forest Ecology | 🎋 | 7 |
| Ritual Practices | 🏺 | 6 |

### Entities
| Name | Type | Role | Initials |
|------|------|------|----------|
| Priya Ratnam | person | Ayurvedic Practitioner · Kandy | PR |
| Nimal Bandara | person | Fisherman · Galle | NB |
| Elder (unnamed) | person | Ceremony Elder · Ella | EL |
| Vendors (group) | person | Market Vendors · Colombo | VN |
| Kandy Highlands | location | — | — |
| Galle Coastal | location | — | — |
| Ella Caves | location | — | — |
| Peradeniya | location | — | — |
| Colombo | location | — | — |
| Sida rhombifolia | artifact | Medicinal Plant | — |

### Notes
| Title | Type | Location | Tags |
|-------|------|----------|------|
| Herbal Healer of Kandy Interview | interview | Kandy | #medicine, #ritual, #kandy |
| Galle Coastal Plant Survey | field_note | Galle | #coastal, #ecology |
| Voice Memo: Forest Trail | voice_memo | Peradeniya | #ayurveda |
| Ritual Ceremony Documentation | photo | Ella | #ritual, #ella |
| Market Vendor Conversations | interview | Colombo | #trade, #markets |

### Inventory Items
| Name | Icon | Status |
|------|------|--------|
| Camera (Sony A7) | 📷 | charged |
| External Mic | 🎙 | ready |
| Powerbank | 🔋 | low |
| SD Cards (×3) | 💾 | packed |
| Headphones | 🎧 | missing |
| Field Notebook | 📓 | packed |

---

## Key Queries

### Full-text search across notes
```sql
SELECT * FROM notes
WHERE workspace_id = $1
  AND deleted_at IS NULL
  AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, ''))
      @@ plainto_tsquery('english', $2)
ORDER BY ts_rank(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, '')),
    plainto_tsquery('english', $2)
) DESC;
```

### Entity stats (mentions, sessions, concepts)
```sql
SELECT
    e.id,
    e.name,
    COALESCE(SUM(ne.mention_count), 0) AS total_mentions,
    COUNT(DISTINCT ne.note_id) AS session_count,
    COUNT(DISTINCT nc.concept_id) AS concept_count
FROM entities e
LEFT JOIN note_entities ne ON ne.entity_id = e.id
LEFT JOIN note_concepts nc ON nc.note_id = ne.note_id
WHERE e.id = $1
GROUP BY e.id;
```

### Graph nodes and edges for a workspace
```sql
-- Nodes: entities + concepts + locations
SELECT id, name, entity_type AS node_type, 'entity' AS source
FROM entities WHERE workspace_id = $1
UNION ALL
SELECT id, name, 'concept' AS node_type, 'concept' AS source
FROM concepts WHERE workspace_id = $1;

-- Edges
SELECT * FROM graph_edges WHERE workspace_id = $1;
```

### Connected notes with strength
```sql
SELECT
    n.id, n.title, n.note_type,
    ge.strength, ge.label
FROM graph_edges ge
JOIN notes n ON (
    (ge.target_type = 'note' AND ge.target_id = n.id)
    OR (ge.source_type = 'note' AND ge.source_id = n.id)
)
WHERE (ge.source_id = $1 OR ge.target_id = $1)
  AND n.id != $1
  AND n.deleted_at IS NULL
ORDER BY ge.strength DESC;
```
