# ArchiveMind Deployment Guide

---

## Architecture Overview

```
┌──────────────────┐         ┌──────────────────────────────┐
│   Vercel          │  REST   │   Railway                    │
│   (Frontend)      │◄───────►│   (Backend)                  │
│                   │   WS    │                              │
│   React + Vite    │         │   Rust + Axum                │
│   archivemind.    │         │   archivemind-api.           │
│   vercel.app      │         │   railway.app                │
└──────────────────┘         └───────┬──────────────────────┘
                                     │
                         ┌───────────┼───────────┐
                         ▼                       ▼
                  ┌──────────────┐       ┌──────────────┐
                  │  PostgreSQL  │       │  S3 / R2     │
                  │  (Railway)   │       │  (Media)     │
                  └──────────────┘       └──────────────┘
```

---

## Frontend → Vercel

### Project Setup

The frontend is a Vite + React + TypeScript project in a `frontend/` directory (or monorepo root).

### `vercel.json`

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### Environment Variables (Vercel Dashboard)

| Variable | Example | Notes |
|----------|---------|-------|
| `VITE_API_URL` | `https://archivemind-api.railway.app` | Backend API base URL |
| `VITE_WS_URL` | `wss://archivemind-api.railway.app` | WebSocket URL |
| `VITE_MAPBOX_TOKEN` | `pk.eyJ1...` | Mapbox GL access token |

Set in Vercel Dashboard → Project → Settings → Environment Variables. Available in all environments (Production, Preview, Development).

### Build & Deploy

```bash
# Local build test
npm run build
npx serve dist

# Deploy
vercel --prod
```

Vercel auto-deploys on push to `main`. Preview deployments are created for every PR branch.

### Preview Deployments

- Every PR gets a unique preview URL: `https://archivemind-git-feature-xyz.vercel.app`
- Preview environments use the same env vars unless overridden per-environment
- Useful for design review and QA before merging

---

## Backend → Railway

### Dockerfile

```dockerfile
# Build stage
FROM rust:1.78-bookworm AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src/ src/
COPY migrations/ migrations/

# Build release binary
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/archivemind-api /usr/local/bin/
COPY migrations/ /app/migrations/

ENV RUST_LOG=info
EXPOSE 8080

CMD ["archivemind-api"]
```

### Railway Setup

1. **Create project** in Railway dashboard
2. **Add PostgreSQL** plugin (Railway provisions it automatically)
3. **Add service** from GitHub repo (point to `backend/` directory or monorepo root)
4. **Set environment variables** (see below)
5. **Configure health check**: `GET /api/v1/health`
6. **Enable auto-deploy** from `main` branch

### Environment Variables (Railway Dashboard)

| Variable | Source | Notes |
|----------|--------|-------|
| `DATABASE_URL` | Railway PostgreSQL plugin | Auto-injected by Railway |
| `PORT` | Railway | Auto-injected, typically `8080` |
| `JWT_SECRET` | Manual | Strong random string (64+ chars) |
| `JWT_EXPIRY` | Manual | Token expiry in seconds (e.g., `86400`) |
| `S3_BUCKET` | Manual | S3/R2 bucket name |
| `S3_REGION` | Manual | `auto` for R2, or AWS region |
| `S3_ENDPOINT` | Manual | S3-compatible endpoint URL |
| `S3_ACCESS_KEY` | Manual | Access key |
| `S3_SECRET_KEY` | Manual | Secret key |
| `CORS_ORIGIN` | Manual | `https://archivemind.vercel.app` |
| `RUST_LOG` | Manual | `info` or `debug` |

### Health Check Endpoint

```rust
// routes/health.rs
async fn health_check(pool: Extension<PgPool>) -> impl IntoResponse {
    match sqlx::query("SELECT 1").fetch_one(&*pool).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "status": "ok" }))),
        Err(_) => (StatusCode::SERVICE_UNAVAILABLE, Json(json!({ "status": "db_error" }))),
    }
}
```

Railway pings this endpoint to determine service health.

### Database Migrations on Deploy

Add to startup in `main.rs`:

```rust
sqlx::migrate!("./migrations")
    .run(&pool)
    .await
    .expect("Failed to run migrations");
```

This runs pending migrations automatically on each deploy.

---

## CORS Configuration

The backend must allow requests from the Vercel frontend domain.

```rust
// main.rs
use tower_http::cors::{CorsLayer, Any};

let cors = CorsLayer::new()
    .allow_origin(
        std::env::var("CORS_ORIGIN")
            .unwrap_or_default()
            .parse::<HeaderValue>()
            .unwrap()
    )
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
    .allow_headers([
        header::CONTENT_TYPE,
        header::AUTHORIZATION,
    ])
    .allow_credentials(true);
```

For local development, also allow `http://localhost:5173` (Vite dev server).

---

## S3 / Cloudflare R2 (Media Storage)

### Setup

1. Create a bucket (e.g., `archivemind-media`)
2. Generate API credentials (access key + secret)
3. Configure CORS on the bucket to allow uploads from the Vercel domain
4. Set environment variables on Railway

### Upload Flow

```
1. Client requests presigned upload URL from backend
   POST /api/v1/media/presign { filename, content_type, note_id }

2. Backend generates presigned PUT URL (5 min expiry)
   → Returns { upload_url, s3_key }

3. Client uploads file directly to S3/R2
   PUT <upload_url> with file body

4. Client confirms upload to backend
   POST /api/v1/media { note_id, s3_key, media_type, ... }

5. Backend creates media record in database
```

### Bucket CORS Policy (R2 example)

```json
[
  {
    "AllowedOrigins": ["https://archivemind.vercel.app", "http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## CI/CD with GitHub Actions

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build
      - run: npm test -- --run

  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: archivemind_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/archivemind_test
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: backend
      - run: cargo fmt -- --check
      - run: cargo clippy -- -D warnings
      - run: cargo sqlx migrate run
      - run: cargo test
```

---

## Custom Domain (Optional)

### Vercel
1. Add custom domain in Vercel Dashboard → Project → Domains
2. Point DNS (CNAME or A record) to Vercel
3. SSL is automatic

### Railway
1. Add custom domain in Railway Dashboard → Service → Settings → Domains
2. Point DNS CNAME to the Railway-provided hostname
3. SSL is automatic

### Update CORS
After adding custom domains, update `CORS_ORIGIN` on Railway to match the frontend's custom domain.

---

## Monitoring & Logging

### Railway
- Built-in log viewer (stdout/stderr from Rust binary)
- `RUST_LOG=info` for production, `RUST_LOG=debug` for troubleshooting
- Railway metrics: CPU, memory, network

### Vercel
- Built-in analytics (optional)
- Function logs for any serverless functions (if added later)
- Web Vitals reporting

### Recommended Additions
- **Sentry** (both frontend and backend) for error tracking
- **Axiom** or **Better Stack** for structured log aggregation
- Health check monitoring (UptimeRobot, Checkly, or similar)

---

## Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Backend
```bash
cd backend
cp .env.example .env   # Fill in DATABASE_URL, etc.
cargo run
# → http://localhost:8080
```

### Local PostgreSQL
```bash
# Docker
docker run -d --name archivemind-pg \
  -e POSTGRES_USER=archivemind \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=archivemind \
  -p 5432:5432 \
  postgres:16

# Run migrations
cd backend
sqlx migrate run
```

### `.env.example` (backend)
```
DATABASE_URL=postgresql://archivemind:dev@localhost:5432/archivemind
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRY=86400
S3_BUCKET=archivemind-media-dev
S3_REGION=auto
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
CORS_ORIGIN=http://localhost:5173
RUST_LOG=debug
```

For local S3 testing, use **MinIO**:
```bash
docker run -d --name archivemind-minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```
