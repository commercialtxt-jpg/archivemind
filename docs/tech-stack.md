# ArchiveMind Tech Stack & Architecture

---

## Overview

ArchiveMind is a field research intelligence application. The frontend deploys to **Vercel**, the backend to **Railway**.

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                     │
│  React 18+ · TypeScript · Vite · Tailwind CSS           │
│  React Router · Zustand · TanStack Query                │
│  D3.js/react-force-graph · Mapbox GL · Wavesurfer.js    │
│  Tiptap (rich text)                                     │
└───────────────────┬─────────────────────────────────────┘
                    │ REST + WebSocket
┌───────────────────▼─────────────────────────────────────┐
│                   Railway (Backend)                      │
│  Rust · Axum · SQLx · Tower middleware                  │
│  PostgreSQL · S3-compatible storage                     │
│  JWT auth · argon2 · WebSocket (sync)                   │
└─────────────────────────────────────────────────────────┘
```

---

## Frontend (Vercel)

### Core

| Technology | Purpose |
|------------|---------|
| **React 18+** | UI framework |
| **TypeScript** | Type safety across the entire frontend |
| **Vite** | Build tool, dev server, HMR |
| **Tailwind CSS** | Utility-first styling with custom design tokens (see `design-system.md`) |
| **React Router v6+** | Client-side routing — icon rail views map to routes (`/journal`, `/graph`, `/map`, `/entities`, `/inventory`, `/routines`) |

### State Management

| Technology | Purpose |
|------------|---------|
| **Zustand** | Client-side UI state: active note, sidebar selection, offline mode toggle, panel visibility, editor toolbar state |
| **TanStack Query (React Query)** | Server state: notes, entities, concepts, field trips, inventory, media. Handles caching, background refetching, optimistic updates |

### Specialized Libraries

| Library | Purpose | Mockup Component |
|---------|---------|-----------------|
| **D3.js** or **react-force-graph** | Knowledge graph visualization | Graph overlay with typed nodes, edges, zoom, filters |
| **Mapbox GL JS** or **Leaflet** | Interactive map view | Mini map (entity panel), full map view (icon rail), map pins with pulses |
| **Wavesurfer.js** | Audio waveform rendering and playback | Inline audio player with animated bars, play/pause, duration |
| **Tiptap** | Rich text editor with extensions | Note editor body — supports entity mentions (`@`), concept tags, location tags, blockquotes, headings, lists, inline media |

### Tiptap Extensions Needed

- **Mention** — for `@entity` inline mentions (coral styling)
- **Custom concept tag** — for `#concept` inline tags (sage styling)
- **Custom location tag** — for `📍 location` inline tags (amber styling)
- **Image** — for photo strip inline embeds
- **Blockquote** — styled with coral left border
- **Heading** — H1, H2 support
- **Bold/Italic/Underline** — standard formatting
- **BulletList** — list support
- **Placeholder** — empty editor state

### Frontend Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx          # Root layout (icon rail + sidebar + main + entity panel)
│   │   ├── IconRail.tsx          # 6-view vertical nav
│   │   ├── Sidebar.tsx           # Context-aware sidebar
│   │   ├── StatusBar.tsx         # Bottom status bar
│   │   └── EntityPanel.tsx       # Right panel (tabs: Entity/Linked/Map/Gear)
│   ├── notes/
│   │   ├── NoteList.tsx          # Note card list with sorting/filtering
│   │   ├── NoteCard.tsx          # Individual note card
│   │   ├── NoteEditor.tsx        # Title + meta bar + Tiptap body
│   │   ├── NoteMetaBar.tsx       # Entity chips, location, weather, time, AI badge
│   │   └── NoteTypeBadge.tsx     # Interview/Photo/Voice/Field badge
│   ├── editor/
│   │   ├── EditorToolbar.tsx     # Two-row toolbar (views + formatting)
│   │   ├── EntityMention.tsx     # Tiptap node for entity mentions
│   │   ├── ConceptTag.tsx        # Tiptap node for concept tags
│   │   └── LocationTag.tsx       # Tiptap node for location tags
│   ├── media/
│   │   ├── AudioPlayer.tsx       # Waveform player with Wavesurfer.js
│   │   ├── PhotoStrip.tsx        # Horizontal scrollable thumbnails
│   │   └── MediaUpload.tsx       # Photo/audio upload UI
│   ├── graph/
│   │   ├── GraphOverlay.tsx      # Full-screen dark overlay
│   │   ├── GraphCanvas.tsx       # D3/force-graph renderer
│   │   ├── GraphFilters.tsx      # All/Interviews/Concepts/Locations filter buttons
│   │   ├── GraphLegend.tsx       # Color legend
│   │   └── GraphControls.tsx     # Zoom +/−/reset
│   ├── map/
│   │   ├── MapView.tsx           # Full map view (icon rail)
│   │   ├── MiniMap.tsx           # Entity panel map preview
│   │   └── MapPin.tsx            # Styled pin with pulse animation
│   ├── entities/
│   │   ├── EntityProfile.tsx     # Avatar, stats, topics
│   │   ├── ConnectedNotes.tsx    # Linked notes with strength bars
│   │   └── EntityList.tsx        # Full entity list view
│   ├── inventory/
│   │   ├── InventoryCard.tsx     # Field kit status card
│   │   ├── InventoryItem.tsx     # Individual item with status badge
│   │   ├── InventoryAlert.tsx    # Items needing attention alert
│   │   └── InventoryView.tsx     # Full inventory view (icon rail)
│   ├── routines/
│   │   ├── RoutineBanner.tsx     # Pre-trip checklist banner
│   │   └── RoutineView.tsx       # Full routines view
│   └── ui/
│       ├── SyncStatus.tsx        # Sync dot + text
│       ├── OfflineBar.tsx        # Offline mode banner
│       ├── Tooltip.tsx           # data-tip tooltip
│       ├── SearchBox.tsx         # Sidebar search
│       └── FAB.tsx               # Floating action buttons
├── hooks/
│   ├── useNotes.ts               # TanStack Query hooks for notes CRUD
│   ├── useEntities.ts            # Entity queries
│   ├── useGraph.ts               # Graph data queries
│   ├── useMedia.ts               # Media upload/playback
│   ├── useSync.ts                # WebSocket sync status
│   └── useOffline.ts             # Offline mode state
├── stores/
│   ├── uiStore.ts                # Zustand: active view, sidebar state, panels
│   ├── editorStore.ts            # Zustand: active note, editor state
│   └── offlineStore.ts           # Zustand: offline toggle, local queue
├── lib/
│   ├── api.ts                    # Axios/fetch client with auth headers
│   ├── ws.ts                     # WebSocket connection manager
│   └── tiptap/
│       ├── extensions.ts         # Custom Tiptap extensions
│       └── schema.ts             # Document schema
├── types/
│   └── index.ts                  # Shared TypeScript types
├── routes/
│   └── index.tsx                 # React Router route definitions
├── styles/
│   └── tailwind.css              # Tailwind base + custom tokens
└── main.tsx
```

---

## Backend (Railway)

### Core

| Technology | Purpose |
|------------|---------|
| **Rust** | Systems language, performance, safety |
| **Axum** | Async web framework (built on Tokio + Tower) |
| **SQLx** | Compile-time checked async PostgreSQL queries |
| **PostgreSQL** | Primary database (Railway-hosted) |
| **Tower** | Middleware stack (CORS, rate limiting, logging, auth) |
| **Tokio** | Async runtime |

### Auth & Security

| Technology | Purpose |
|------------|---------|
| **JWT** (jsonwebtoken crate) | Stateless auth tokens |
| **argon2** | Password hashing |
| **tower-http** | CORS headers, request tracing |
| **tower** (rate limit layer) | API rate limiting |

### Storage

| Technology | Purpose |
|------------|---------|
| **S3-compatible** (AWS S3 or Cloudflare R2) | Audio files, photos, video clips |
| **rust-s3** or **aws-sdk-s3** | S3 client |
| Presigned URLs | Client-side direct upload/download |

### Future: Offline Desktop (Tauri)

| Technology | Purpose |
|------------|---------|
| **SQLite** (via SQLx) | Local offline-first cache |
| **Tauri 2.0** | Desktop app wrapper |
| Sync engine | Bi-directional sync between local SQLite and cloud PostgreSQL |

### Backend Project Structure

```
src/
├── main.rs                   # Axum app setup, router, middleware
├── config.rs                 # Environment config (DATABASE_URL, JWT_SECRET, S3, etc.)
├── error.rs                  # Unified error types
├── auth/
│   ├── mod.rs
│   ├── jwt.rs                # Token generation/validation
│   ├── password.rs           # argon2 hash/verify
│   └── middleware.rs         # Auth extraction middleware
├── routes/
│   ├── mod.rs                # Router assembly
│   ├── notes.rs              # CRUD + search + filter + sort
│   ├── entities.rs           # CRUD + mentions + stats
│   ├── concepts.rs           # CRUD + taxonomy
│   ├── field_trips.rs        # CRUD + note association
│   ├── media.rs              # Upload (presigned URL), metadata, transcription status
│   ├── inventory.rs          # CRUD + status updates
│   ├── routines.rs           # CRUD + checklist state
│   ├── graph.rs              # Graph edges, node data, filtered views
│   ├── search.rs             # Full-text search across notes/entities/concepts
│   ├── sync.rs               # WebSocket handler for sync status
│   ├── users.rs              # Registration, login, profile
│   └── health.rs             # Health check for Railway
├── models/
│   ├── mod.rs
│   ├── note.rs
│   ├── entity.rs
│   ├── concept.rs
│   ├── field_trip.rs
│   ├── media.rs
│   ├── inventory.rs
│   ├── routine.rs
│   ├── graph.rs
│   └── user.rs
├── db/
│   ├── mod.rs
│   └── pool.rs               # SQLx pool setup
└── migrations/
    └── *.sql                  # SQLx migrations (see database-setup.md)
```

---

## API Design

### REST Endpoints

All endpoints prefixed with `/api/v1`.

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/refresh` | Refresh token |
| GET | `/auth/me` | Current user profile |

#### Notes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notes` | List notes (filterable by type, field_trip, tags, starred) |
| GET | `/notes/:id` | Get single note with full body |
| POST | `/notes` | Create note |
| PUT | `/notes/:id` | Update note |
| DELETE | `/notes/:id` | Soft-delete (move to trash) |
| POST | `/notes/:id/star` | Toggle star |
| GET | `/notes/:id/connections` | Connected notes with strength |

#### Entities
| Method | Path | Description |
|--------|------|-------------|
| GET | `/entities` | List entities (filterable by type: person/location/artifact) |
| GET | `/entities/:id` | Entity profile with stats (mentions, sessions, concepts) |
| POST | `/entities` | Create entity |
| PUT | `/entities/:id` | Update entity |
| GET | `/entities/:id/notes` | Notes mentioning this entity |
| GET | `/entities/:id/topics` | Associated topics/concepts |

#### Concepts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/concepts` | List concepts with note counts |
| GET | `/concepts/:id` | Concept detail |
| POST | `/concepts` | Create concept |

#### Field Trips
| Method | Path | Description |
|--------|------|-------------|
| GET | `/field-trips` | List field trips with note counts |
| POST | `/field-trips` | Create field trip |
| PUT | `/field-trips/:id` | Update field trip |
| POST | `/field-trips/:id/notes` | Associate note with field trip |

#### Media
| Method | Path | Description |
|--------|------|-------------|
| POST | `/media/presign` | Get presigned S3 upload URL |
| POST | `/media` | Create media record (after upload) |
| GET | `/media/:id` | Get media metadata + presigned download URL |
| PUT | `/media/:id/transcription` | Update transcription text/status |

#### Inventory
| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory` | List inventory items with status |
| POST | `/inventory` | Add item |
| PUT | `/inventory/:id` | Update item status |
| DELETE | `/inventory/:id` | Remove item |
| GET | `/inventory/alerts` | Items needing attention |

#### Routines
| Method | Path | Description |
|--------|------|-------------|
| GET | `/routines` | List routines |
| POST | `/routines` | Create routine |
| PUT | `/routines/:id` | Update routine / checklist items |
| POST | `/routines/:id/start` | Start trip (mark routine active) |

#### Graph
| Method | Path | Description |
|--------|------|-------------|
| GET | `/graph` | Full graph data (nodes + edges) |
| GET | `/graph?filter=interviews` | Filtered graph view |
| GET | `/graph/edges` | Edge list with types and strengths |

#### Search
| Method | Path | Description |
|--------|------|-------------|
| GET | `/search?q=...` | Full-text search across notes, entities, concepts |

#### Sync (WebSocket)
| Protocol | Path | Description |
|----------|------|-------------|
| WS | `/ws/sync` | Real-time sync status, push updates |

### Request/Response Conventions

- All responses wrapped: `{ "data": ..., "meta": { "total": N } }`
- Pagination: `?page=1&per_page=20`
- Sorting: `?sort=created_at&order=desc`
- Filtering: `?note_type=interview&field_trip_id=uuid`
- Errors: `{ "error": { "code": "NOT_FOUND", "message": "..." } }`
- Dates: ISO 8601 (`2025-07-14T09:32:00Z`)
- IDs: UUIDs (v7 for time-ordering)

---

## Real-Time Sync

### WebSocket Protocol (`/ws/sync`)

Client connects after auth. Server pushes:

```json
{ "type": "sync_status", "status": "synced", "last_sync": "2025-07-14T11:04:00Z" }
{ "type": "note_updated", "note_id": "uuid", "updated_at": "..." }
{ "type": "entity_mentioned", "entity_id": "uuid", "note_id": "uuid" }
```

Client status mapping:
- **Online/Synced**: sage dot, "Synced · X min ago"
- **Offline**: amber dot, "Offline · Local SQLite"
- **Syncing**: sage dot pulsing, "Syncing..."

---

## Environment Variables

### Frontend (Vercel)
```
VITE_API_URL=https://archivemind-api.railway.app
VITE_WS_URL=wss://archivemind-api.railway.app
VITE_MAPBOX_TOKEN=pk.xxx
```

### Backend (Railway)
```
DATABASE_URL=postgresql://user:pass@host:5432/archivemind
JWT_SECRET=xxx
JWT_EXPIRY=86400
S3_BUCKET=archivemind-media
S3_REGION=auto
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
CORS_ORIGIN=https://archivemind.vercel.app
RUST_LOG=info
```
