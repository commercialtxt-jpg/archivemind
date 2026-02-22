# ArchiveMind Builder Agent Instructions

You are building **ArchiveMind**, a field research intelligence application. This document is your comprehensive build specification.

---

## Project Context

ArchiveMind helps field researchers (anthropologists, ecologists, journalists) capture, organize, and cross-reference their research. It combines note-taking with entity tracking, knowledge graphing, and field equipment management.

**Source of truth**: `archivemind-mockup.html` — a single-file HTML/CSS/JS prototype showing the complete UI.

**Design system**: `docs/design-system.md` — all color tokens, typography, spacing, component states.

**Database**: `docs/database-setup.md` — full PostgreSQL schema with migrations.

**Tech stack**: `docs/tech-stack.md` — frontend (React/Vite/Tailwind on Vercel) and backend (Rust/Axum on Railway).

**Deployment**: `docs/deployment.md` — Vercel + Railway setup, CI/CD, CORS, S3.

**Logo/icon**: The "A" logo in the sidebar header is a branding element. Keep it as-is — do not spec or modify it.

---

## Build Order

Build in this order to establish foundations first:

### Phase 1: Backend Foundation
1. Rust project scaffold with Axum
2. Database migrations (all tables from `database-setup.md`)
3. User auth (register, login, JWT middleware)
4. Health check endpoint
5. CORS and Tower middleware setup

### Phase 2: Core API
6. Notes CRUD (create, read, update, soft-delete, star)
7. Entities CRUD with stats queries
8. Concepts CRUD
9. Field trips CRUD with note associations
10. Tags CRUD with note associations
11. Full-text search endpoint
12. Media presigned URL generation + metadata storage

### Phase 3: Frontend Foundation
13. Vite + React + TypeScript + Tailwind project scaffold
14. Design tokens in Tailwind config (from `design-system.md`)
15. App shell layout (icon rail + sidebar + main area + entity panel + status bar)
16. React Router setup (6 views)
17. Zustand stores (UI state, editor state, offline state)
18. TanStack Query setup + API client

### Phase 4: Core UI Components
19. Icon rail with 6 view buttons + avatar
20. Sidebar (search, workspace section, field trips, concepts, entity types)
21. Note list panel with note cards
22. Note editor (title, meta bar, Tiptap rich text body)
23. Editor toolbar (two rows: view tabs + formatting)
24. Sync status indicator

### Phase 5: Rich Features
25. Tiptap extensions (entity mention, concept tag, location tag)
26. Audio player with Wavesurfer.js
27. Photo strip component
28. Entity panel (profile card, stats, topics, connected notes)
29. Inventory card with status badges
30. Routine banner
31. Inventory alert

### Phase 6: Advanced Features
32. Knowledge graph overlay (D3.js or react-force-graph)
33. Map view with Mapbox GL
34. Mini map in entity panel
35. Graph API endpoints (nodes, edges, filtered views)
36. WebSocket sync status
37. Offline mode toggle

### Phase 7: Polish
38. Status bar
39. FAB buttons
40. Tooltip system
41. Offline bar
42. Animations (pulse-sync, wave-anim, map-pulse, fade-in)
43. Seed data for development

---

## Component-by-Component Specifications

### 1. Icon Rail

**Layout**: 56px wide, full height, vertical flexbox, `--sidebar-bg` background.

**Items** (top to bottom):
| Icon | View | Route | Tooltip |
|------|------|-------|---------|
| 📓 | Field Journal | `/journal` | "Field Journal" |
| 🕸 | Knowledge Graph | `/graph` | "Knowledge Graph" |
| 🗺 | Map View | `/map` | "Map View" |
| 👤 | Entities | `/entities` | "Entities" |
| 🎒 | Inventory | `/inventory` | "Inventory" |
| 📋 | Routines | `/routines` | "Routines" |

**Badge**: Amber dot on Inventory icon when items need attention (from `GET /api/v1/inventory/alerts`).

**Avatar**: Bottom of rail, 32px circle with user initials, coral→amber gradient.

**Behavior**: Click sets active state (coral bg, white text, coral shadow). Only one active at a time. Active state persists across navigation.

**API**: No API calls. Pure client-side routing.

**Acceptance criteria**:
- [ ] All 6 icons render with tooltips
- [ ] Click switches active state and routes to correct view
- [ ] Badge appears when inventory has alerts
- [ ] Avatar shows user initials

---

### 2. Sidebar

**Layout**: 240px wide, `--sidebar-bg` background, three sections: header, scrollable body, footer.

**Header**:
- App identity (logo "A" + "ArchiveMind" text) — keep as branding, not interactive
- "Field Research" title (Lora 15px 600)
- Search box with magnifying glass icon

**Body sections**:

**Workspace** (always visible):
| Item | Icon | Count Source |
|------|------|-------------|
| All Notes | 📓 | `GET /notes` total count |
| Starred | ⭐ | `GET /notes?starred=true` count |
| Trash | 🗑 | `GET /notes?deleted=true` count (no badge if 0) |

**Field Trips**: List from `GET /field-trips` with note counts. Clicking filters the note list.

**Concepts**: List from `GET /concepts` with note counts. Clicking filters the note list.

**Entity Types**: Fixed list (Interviewees, Locations, Artifacts) with counts from `GET /entities?type=person|location|artifact`.

**Footer**: Sync status component (see #24).

**Behavior**:
- Sidebar items in the Workspace section have mutual exclusive active states
- Field Trip / Concept / Entity Type clicks filter the note list (non-exclusive with workspace)
- Search box focuses on click, fires `GET /search?q=...` with debounce (300ms)

**API**:
- `GET /api/v1/notes?count_only=true` — workspace counts
- `GET /api/v1/field-trips` — field trip list
- `GET /api/v1/concepts` — concept list
- `GET /api/v1/entities?type=person` (etc.) — entity type counts
- `GET /api/v1/search?q=...` — full-text search

**Acceptance criteria**:
- [ ] All 4 sections render with correct data
- [ ] Counts update when notes are created/deleted
- [ ] Search returns results across notes, entities, and concepts
- [ ] Active states work correctly

---

### 3. Note List Panel

**Layout**: 260px wide, `--panel-bg` background, header + scrollable body.

**Header**: "All Notes" title (changes based on active filter), overflow menu (⋮), new note button (+, primary coral).

**Note cards** (from `GET /notes` with current filters):
- Title (Lora 13.5px 500, line-clamp 2)
- Type badge (Interview/Photo/Voice/Field Note — see design system for colors)
- Excerpt (DM Sans 12px, 2-line clamp)
- Meta row: location icon + name, time icon + relative time, media icon + count/duration
- Tags: horizontal chip row (#medicine, #ritual, etc.)

**States**: default (transparent), hover (white 70%), active (card-bg, border, shadow).

**Behavior**:
- Click selects note, loads in editor
- New note button creates blank note via `POST /notes` and selects it
- List responds to sidebar filters (field trip, concept, entity type, search, starred, trash)
- Sort by `created_at DESC` by default

**API**:
- `GET /api/v1/notes?workspace_id=...&sort=created_at&order=desc`
- `GET /api/v1/notes?field_trip_id=...`
- `GET /api/v1/notes?note_type=interview`
- `GET /api/v1/notes?starred=true`
- `GET /api/v1/notes?deleted=true` (trash)
- `POST /api/v1/notes` (create)

**Acceptance criteria**:
- [ ] Notes render with all metadata (type badge, excerpt, meta, tags)
- [ ] Clicking a card selects it and loads the note in the editor
- [ ] New note button creates and selects a blank note
- [ ] Filters from sidebar correctly narrow the list
- [ ] Active card has correct styling

---

### 4. Editor Toolbar

**Layout**: Two rows, `--warm-white` background, bottom border.

**Row 1 (top)**: View tabs (left) + App actions (right).

View tabs (segmented control):
| Tab | Icon | Action |
|-----|------|--------|
| Notes | Edit icon | Shows note editor (default) |
| Map | House icon | Shows map view inline |
| Graph | Network icon | Opens graph overlay |

App actions (icon buttons):
| Button | Icon | Action |
|--------|------|--------|
| Offline Mode | 📡 | Toggles offline mode |
| Knowledge Graph | 🕸 | Opens graph overlay (active state by default) |
| Export | ⬆ | Export current note |
| Settings | ⚙ | Opens settings |

**Row 2 (bottom)**: Formatting tools in groups separated by light borders.

Group 1 — Text formatting: **B**, *I*, U, H1, H2
Group 2 — Block formatting: Quote, List
Group 3 — Insert: `[[Entity]]`, 🔊 Voice, 📸 Photo

**Behavior**:
- View tabs switch between Notes/Map/Graph views in the main content area
- Formatting buttons apply Tiptap commands to the active editor
- `[[Entity]]` opens an entity mention picker (autocomplete popup)
- Voice button opens audio recorder/upload
- Photo button opens photo upload

**API**: No direct API calls. All formatting is client-side Tiptap commands.

**Acceptance criteria**:
- [ ] View tabs switch content correctly
- [ ] Formatting buttons apply correct Tiptap marks/nodes
- [ ] Entity mention insert opens autocomplete
- [ ] Active formatting buttons reflect current cursor position

---

### 5. Note Editor

**Layout**: Scrollable, centered content (max-width 780px, 40px/60px padding).

**Title**: Auto-resizing textarea (Lora 28px 600). Updates note title on change via `PUT /notes/:id`.

**Meta bar**: Horizontal wrap of chips below title, separated by bottom border.
- Entity chip(s): coral-tinted pill with 👤 + entity name. Click navigates to entity panel.
- Location chip: 📍 + location name + GPS coords
- Weather chip: 🌤 + temperature + conditions
- Time chip: 🕐 + time range + date
- AI Transcribed badge (sage): ✓ + "AI Transcribed" (only for voice memos with completed transcription)

**Routine banner** (conditional): Shows when a routine is active for this note's field trip. Displays checklist summary and "Start Trip" button.

**Audio player** (conditional): Shows for voice memos. Inline audio component with play/pause, waveform, duration, transcription badge.

**Body**: Tiptap rich text editor rendering the note's `body` JSONB field.
- Paragraph text (Lora 15px, line-height 1.8, `--ink-mid`)
- Entity mentions: inline coral-tinted spans, clickable
- Concept tags: inline sage-tinted spans, clickable
- Location tags: inline amber-tinted spans, clickable
- Blockquotes: coral left border, parchment background, italic
- Photo strip: horizontal scrollable thumbnails with labels

**Graph note callout** (conditional): Amber-bordered box showing cross-link summary with "View in Graph →" link.

**Behavior**:
- Title auto-saves on blur or debounced change (500ms)
- Body auto-saves via Tiptap's `onUpdate` with debounce (1000ms)
- Entity mentions are interactive — clicking opens entity in the entity panel
- All saves via `PUT /api/v1/notes/:id`

**API**:
- `GET /api/v1/notes/:id` — load full note (body, metadata, related entities)
- `PUT /api/v1/notes/:id` — update title, body, metadata
- `GET /api/v1/media?note_id=...` — load associated audio/photos
- `GET /api/v1/notes/:id/connections` — connected notes for graph callout

**Acceptance criteria**:
- [ ] Title renders and auto-resizes
- [ ] Meta bar shows all chips with correct data
- [ ] Tiptap editor renders entity mentions, concept tags, location tags with correct colors
- [ ] Blockquotes render with coral left border
- [ ] Audio player appears for voice memos
- [ ] Photo strip appears when note has photos
- [ ] Auto-save works on title and body changes
- [ ] Routine banner appears when applicable

---

### 6. Entity Panel (Right Sidebar)

**Layout**: 280px wide, `--parchment` background, tabs at top.

**Tabs**: Entity | Linked | Map | Gear

**Entity tab** (default):

*Entity Profile Card*:
- Avatar: 38px circle, coral→amber gradient, initials (Lora 14px 600)
- Name: Lora 14px 600
- Role: DM Sans 11px, `--ink-muted`
- Stats: 3-column grid (Mentions / Sessions / Concepts) — numbers in JetBrains Mono 16px coral
- Associated Topics: pill tags, hoverable

*Inventory Alert*: Red-tinted bar with ⚠ icon, "Items need attention", count badge. Only shows when there are items with `low` or `missing` status.

*Inventory Card* (Field Kit Status):
- Header: title + "X/Y Ready" badge (sage)
- Item rows: icon + name + status badge (charged=sage, low=amber, missing=coral)

*Connected Notes*:
- Section label "🔗 Connected Notes"
- Note rows: icon + title (truncated) + connection reason ("via Traditional Medicine") + strength bars (3 bars with decreasing opacity)

**Linked tab**: List of all notes linked to the currently selected entity.

**Map tab**: Mini map showing entity's locations with pins and connection lines.

**Gear tab**: Detailed inventory view for the active workspace.

**Behavior**:
- Panel updates when the active note changes (shows primary entity from the note)
- Entity profile reflects stats from the API
- Connected notes are clickable — selecting one loads it in the editor
- Inventory alert is clickable — navigates to Inventory view

**API**:
- `GET /api/v1/entities/:id` — profile, role, stats
- `GET /api/v1/entities/:id/topics` — associated topics
- `GET /api/v1/entities/:id/notes` — linked notes
- `GET /api/v1/notes/:id/connections` — connected notes with strength
- `GET /api/v1/inventory?workspace_id=...` — inventory items
- `GET /api/v1/inventory/alerts` — items needing attention

**Acceptance criteria**:
- [ ] Entity profile card renders with avatar, name, role, stats, topics
- [ ] Stats show correct counts from API
- [ ] Inventory alert shows when applicable
- [ ] Connected notes display with strength indicators
- [ ] Tab switching works
- [ ] Panel updates when active note changes

---

### 7. Knowledge Graph Overlay

**Layout**: Fixed full-screen dark overlay (ink 92% with backdrop-blur 4px).

**Header**: Title "🕸 Knowledge Graph" + filter buttons + close button (✕).

**Filter buttons** (pills):
| Filter | Border Color | Background | Text Color |
|--------|-------------|------------|------------|
| All | white 15% | white 6% | cream 70% |
| Interviews | coral 50% | coral 15% | coral-light |
| Concepts | sage 50% | sage 10% | sage-light |
| Locations | amber 50% | amber 10% | amber-light |

**Graph canvas** (SVG or Canvas via D3.js/react-force-graph):

*Node types*:
| Type | Color | Size Range | Examples |
|------|-------|------------|---------|
| Location | Coral (0.55–0.88 opacity) | r=17–30 | Kandy, Galle, Ella, Peradeniya |
| Concept | Sage (0.55–0.9 opacity) | r=18–36 | Traditional Medicine, Ritual Practices, Lunar Harvest |
| Person/Entity | Amber (0.5–0.85 opacity) | r=16–26 | Priya Ratnam, Nimal Bandara, Elder |
| Artifact | Amber (0.5 opacity) | r=15 | Sida rhombifolia |

Node size scales with connection count or note count.

*Edges*:
- Solid lines: direct connections (1.5px stroke)
- Dashed lines (`stroke-dasharray: 6,4`): cross-region links
- Color matches the connected node types
- Opacity varies (0.2–0.5) based on strength

*Labels*: DM Sans, `rgba(250,247,242,0.85)` fill, positioned at node center.

*Animations*: Active nodes have expanding/fading pulse ring (like map-pulse).

**Legend** (bottom-left):
- Locations (coral dot)
- Concepts (sage dot)
- People / Entities (amber dot)
- Cross-region link (dashed line)

**Controls** (bottom-right): + / − / ⟳ (zoom in, zoom out, reset).

**Behavior**:
- Opens from Graph button in toolbar or icon rail
- Close button or Escape key dismisses
- Filter buttons show/hide node types
- Nodes are draggable
- Hover on node shows highlight (brightness 1.2)
- Click on node could navigate to entity/concept/location
- Zoom via scroll + controls

**API**:
- `GET /api/v1/graph` — all nodes and edges
- `GET /api/v1/graph?filter=interviews` — filtered view

**Acceptance criteria**:
- [ ] Overlay renders full-screen with dark theme
- [ ] All node types render with correct colors and sizes
- [ ] Edges render with correct styles (solid vs dashed)
- [ ] Filter buttons toggle node visibility
- [ ] Zoom controls work
- [ ] Legend renders correctly
- [ ] Close button and Escape dismiss the overlay
- [ ] Fade-in animation on open

---

### 8. Audio Player

**Layout**: Inline container with play button, waveform, duration, transcription badge.

**Play button**: 34px circle, coral background, ▶/⏸ toggle.

**Waveform**: Wavesurfer.js rendering of audio file. In mockup, shown as 48 animated bars (3px wide, coral, varying heights 4–24px).

**Duration**: JetBrains Mono 11px, e.g., "23:14".

**Transcription badge**: "✓ Transcribed" in sage pill (only if `transcription_status = 'completed'`).

**Behavior**:
- Play/pause toggles audio playback
- Waveform shows playback progress
- Click on waveform seeks to position

**API**:
- `GET /api/v1/media/:id` — media metadata + presigned download URL
- Audio file streamed from S3 via presigned URL

**Acceptance criteria**:
- [ ] Audio loads and plays from S3
- [ ] Waveform visualizes the audio
- [ ] Play/pause works
- [ ] Duration displays correctly
- [ ] Transcription badge shows when applicable

---

### 9. Photo Strip

**Layout**: Horizontal scrollable flex container, 8px gap.

**Thumbnails**: 80×70px, 8px radius, `--parchment` bg, `--border` border.
- Image thumbnails load from S3 presigned URLs
- Bottom gradient overlay with label text (JetBrains Mono 9px)
- Hover: coral border, scale 1.03
- Overflow: "+N more" indicator (DM Sans 13px, `--ink-muted`)

**Behavior**:
- Horizontal scroll (mouse wheel or drag)
- Click thumbnail opens photo viewer/lightbox
- "+N more" click opens full media gallery

**API**:
- `GET /api/v1/media?note_id=...&type=photo` — photo list with presigned URLs

**Acceptance criteria**:
- [ ] Thumbnails load from S3
- [ ] Labels display on hover/always
- [ ] Overflow indicator shows correct count
- [ ] Horizontal scroll works
- [ ] Click opens larger view

---

### 10. Map View

**Full map** (icon rail → Map View):
- Full main content area, Mapbox GL map
- Pins for all locations in workspace, colored by type
- Cluster markers when zoomed out
- Click pin shows popup with location name + note count
- Filter by field trip

**Mini map** (entity panel → Map tab):
- 140px height, simplified view
- Shows pins for entities related to current note
- Connection lines (dashed, SVG overlay) between related pins
- Expand button opens full map view
- Legend: small dots with location labels

**Pin styling**:
- 12px dot with 2px white border
- Colors: coral (active/primary), sage (secondary), amber (tertiary)
- Pulse animation ring (map-pulse)

**API**:
- `GET /api/v1/entities?type=location` — all locations with coordinates
- Location data from notes (`location_lat`, `location_lng`)

**Acceptance criteria**:
- [ ] Mapbox GL renders correctly
- [ ] Pins show at correct coordinates
- [ ] Pin colors match entity association
- [ ] Mini map shows relevant pins with connection lines
- [ ] Click interactions work

---

### 11. Sync Status & Offline Mode

**Sync indicator** (sidebar footer):
- Sage dot (pulsing) + "Synced · X min ago" when online
- Amber dot + "Offline · Local SQLite" when offline
- Sage dot (fast pulse) + "Syncing..." during active sync

**Offline toggle** (📡 button in toolbar):
- Toggles between online and offline mode
- When offline: amber dot, "Local SQLite" text, offline bar appears at top

**Offline bar**: Amber-tinted bar at top of editor area. "📡 Offline mode — changes saved locally". Hidden by default.

**WebSocket**: Connects to `/ws/sync` when online. Receives push updates for sync status.

**API**:
- `WS /ws/sync` — real-time sync status

**Acceptance criteria**:
- [ ] Sync dot shows correct color and animation based on state
- [ ] Offline toggle switches state
- [ ] Offline bar appears/disappears
- [ ] WebSocket connects and reflects real-time status

---

### 12. Status Bar

**Layout**: 26px height, full width, `--sidebar-bg` background, `--border-light` top border.

**Items** (left to right):
1. Sync status: sage/amber dot + "Synced to Cloud" or "Offline"
2. GPS status: "📍 GPS Active"
3. Counts: "47 Notes · 14 Entities · 23 Locations"
4. *(spacer)*
5. Database size: "SQLite: 248 KB" (JetBrains Mono)
6. Version: "Rust 1.78 · Tauri 2.0" (future desktop info)

**API**:
- Counts from cached TanStack Query data (no dedicated endpoint needed)
- Database size from sync metadata (future)

**Acceptance criteria**:
- [ ] All items render with correct formatting
- [ ] Counts reflect actual data
- [ ] Status dot matches sync state

---

### 13. Search

**Behavior**:
- Search box in sidebar header
- Debounced input (300ms) triggers `GET /search?q=...`
- Results appear in the note list panel, replacing the current filter
- Results include notes, entities, and concepts (grouped or mixed)
- Clearing search restores previous filter

**API**:
- `GET /api/v1/search?q=...` — full-text search using PostgreSQL `tsvector`

**Acceptance criteria**:
- [ ] Search input debounces correctly
- [ ] Results show in note list
- [ ] Results highlight matching terms (optional, nice-to-have)
- [ ] Clearing search restores previous state

---

## State Management Patterns

### Zustand Stores

**`uiStore`**:
```typescript
{
  activeView: 'journal' | 'graph' | 'map' | 'entities' | 'inventory' | 'routines',
  sidebarFilter: { type: 'all' | 'starred' | 'trash' | 'field_trip' | 'concept' | 'entity_type', id?: string },
  editorViewTab: 'notes' | 'map' | 'graph',
  graphOverlayOpen: boolean,
  entityPanelTab: 'entity' | 'linked' | 'map' | 'gear',
}
```

**`editorStore`**:
```typescript
{
  activeNoteId: string | null,
  isEditing: boolean,
  isSaving: boolean,
}
```

**`offlineStore`**:
```typescript
{
  isOffline: boolean,
  lastSyncAt: string | null,
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error',
  pendingChanges: number,
}
```

### TanStack Query Keys

```typescript
['notes', { workspaceId, filters }]
['notes', noteId]
['notes', noteId, 'connections']
['entities', { workspaceId, type }]
['entities', entityId]
['entities', entityId, 'topics']
['entities', entityId, 'notes']
['concepts', { workspaceId }]
['field-trips', { workspaceId }]
['media', { noteId }]
['inventory', { workspaceId }]
['inventory', 'alerts']
['graph', { workspaceId, filter }]
['search', { query }]
```

---

## Testing Expectations

### Backend (Rust)
- Unit tests for auth (JWT generation/validation, password hashing)
- Integration tests for each API endpoint (using test database)
- Test database seeded with mockup data
- `cargo test` runs all tests

### Frontend (React)
- Component tests for key components (NoteCard, NoteEditor, EntityProfile)
- Hook tests for TanStack Query hooks (mock API responses)
- E2E tests for critical flows: create note, edit note, search, graph overlay open/close
- `npm test` runs all tests

### Quality Checks
- `cargo fmt` + `cargo clippy` for Rust
- `eslint` + `tsc --noEmit` for TypeScript
- All checks run in CI (see `deployment.md`)

---

## Important Implementation Notes

1. **UUIDs**: Use v7 for natural time-ordering. Both frontend and backend should generate them.

2. **Tiptap JSON storage**: Note body is stored as JSONB in PostgreSQL. The Tiptap JSON schema is the source of truth for document structure. Also store a plain-text extraction (`body_text`) for full-text search.

3. **Presigned URLs**: Never expose S3 credentials to the frontend. All media access goes through presigned URLs generated by the backend.

4. **Optimistic updates**: Use TanStack Query's `onMutate` for note saves, star toggles, and inventory status updates to feel instant.

5. **Debounced saves**: Title changes: 500ms debounce. Body changes: 1000ms debounce. Both via `PUT /notes/:id`.

6. **Graph edge generation**: When a note is saved with entity mentions and concept tags, the backend should automatically create/update `graph_edges` entries. This is a post-save hook, not a manual step.

7. **Entity mention extraction**: When parsing Tiptap JSON on save, extract entity mentions and concept tags to update `note_entities` and `note_concepts` junction tables.

8. **Connected note strength**: Strength is calculated based on shared entities, concepts, and explicit cross-references. Range 0.0–1.0. The strength bars in the UI show 3 levels: all filled (>0.7), 2 filled (0.4–0.7), 1 filled (<0.4).

9. **Soft delete**: Notes moved to trash set `deleted_at` timestamp. They're excluded from normal queries. Trash view shows `deleted_at IS NOT NULL`. Permanent delete removes the row.

10. **Workspace scoping**: All queries are scoped to the active workspace. The workspace ID should be included in the JWT claims or resolved from the authenticated user's default workspace.
