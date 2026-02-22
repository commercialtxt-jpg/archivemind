# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ArchiveMind is a field research intelligence application with a Rust/Axum backend and React/TypeScript frontend. The original prototype is in `archivemind-mockup.html`. Spec docs are in `docs/`.

## Development

### Backend (Rust/Axum)
```bash
docker compose up -d                    # Start PostgreSQL
cd backend && cargo run                 # Start API server on :8080
cd backend && SQLX_OFFLINE=true cargo check  # Type check without DB
docker exec -i archivemind-db psql -U archivemind archivemind < backend/seed.sql  # Seed data
```

### Frontend (React/Vite/Tailwind)
```bash
cd frontend && npm run dev              # Dev server on :5173 (proxies /api to :8080)
cd frontend && npx tsc --noEmit         # Type check
cd frontend && npm run build            # Production build
```

### Seed user credentials
- Email: `researcher@archivemind.dev`
- Password: `password123`

## Architecture

### Backend (`backend/`)
- **Framework**: Axum 0.8 + Tokio + SQLx 0.8 (PostgreSQL)
- **Auth**: Argon2 password hashing, JWT (jsonwebtoken), `AuthUser` extractor middleware
- **Config**: via `Extension(Config)` layer — `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, `PORT`
- **API pattern**: `GET/POST /api/v1/{resource}`, `GET/PUT/DELETE /api/v1/{resource}/{id}`. Responses wrapped in `ApiResponse<T>` with `{ data, meta: { total, page, per_page } }`
- **Routes**: health, users (auth), notes, entities, concepts, field_trips, tags, search, media, inventory, routines, graph
- **SQL**: Inline queries with `sqlx::query_as`. Enum types cast with `::text`. `SQLX_OFFLINE=true` for compile without DB.

### Frontend (`frontend/`)
- **Stack**: React 19, TypeScript, Vite 7.3, Tailwind CSS v4 (CSS-first `@theme` in `src/styles/tailwind.css`)
- **State**: Zustand stores (`uiStore`, `editorStore`, `offlineStore`, `authStore`), TanStack Query for server state
- **Editor**: Tiptap with custom extensions (EntityMention, ConceptTag, LocationTag)
- **Layout**: `AppShell` → `IconRail` (56px) + `Sidebar` (240px) + `<Outlet>` + `StatusBar` (26px)
- **Views**: JournalView (NoteList + NoteEditor + EntityPanel), GraphView, MapView, EntitiesView, InventoryView, RoutinesView
- **API client**: Axios instance with JWT interceptor, 401 → redirect to /login

### Design System
- **Colors**: Cream `#FAF7F2`, coral `#CF6A4C`, amber `#C4844A`, sage `#6B8C7A`, ink `#2A2420`
- **Typography**: Lora (serif), DM Sans (sans), JetBrains Mono (mono)
- **Tailwind tokens**: All defined as CSS variables in `@theme` block, used as `text-coral`, `bg-parchment`, etc.

### Database
- PostgreSQL 16 via Docker Compose
- 17 migration files in `backend/migrations/`
- Key tables: users, workspaces, notes (with JSONB body), entities, concepts, field_trips, tags, media, inventory_items, routines, graph_edges, stars
- Junction tables: note_field_trips, note_entities, note_concepts, note_tags
