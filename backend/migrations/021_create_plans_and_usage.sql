-- Plan tier enum
CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'team');

-- Add plan fields to users table
ALTER TABLE users
  ADD COLUMN plan plan_tier NOT NULL DEFAULT 'free',
  ADD COLUMN plan_started_at TIMESTAMPTZ,
  ADD COLUMN plan_expires_at TIMESTAMPTZ,
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT;

-- Usage tracking table (monthly rollup)
CREATE TABLE usage_tracking (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    period_start    DATE NOT NULL,
    map_loads       INTEGER NOT NULL DEFAULT 0,
    media_uploads   INTEGER NOT NULL DEFAULT 0,
    storage_bytes   BIGINT NOT NULL DEFAULT 0,
    notes_count     INTEGER NOT NULL DEFAULT 0,
    entities_count  INTEGER NOT NULL DEFAULT 0,
    ai_requests     INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, period_start)
);

CREATE INDEX idx_usage_user_period ON usage_tracking(user_id, period_start);
