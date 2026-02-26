# Build stage
FROM rust:1.78-bookworm AS builder

WORKDIR /app

# Cache dependency builds by copying manifests first
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

# Copy source and build the real binary
COPY src/ src/
COPY migrations/ migrations/
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/archivemind-backend /usr/local/bin/
COPY --from=builder /app/migrations/ /app/migrations/

# Create uploads directory for local file storage fallback
RUN mkdir -p /app/uploads

WORKDIR /app

ENV RUST_LOG=info
EXPOSE 8080

CMD ["archivemind-backend"]
