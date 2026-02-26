-- Platform-wide budget tracking (e.g. Mapbox monthly quota)
CREATE TABLE platform_budget (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource     TEXT NOT NULL,
    period_start DATE NOT NULL,
    current      BIGINT NOT NULL DEFAULT 0,
    cap          BIGINT NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(resource, period_start)
);

-- Grace period columns for failed payment handling
ALTER TABLE users
  ADD COLUMN grace_period_end TIMESTAMPTZ,
  ADD COLUMN pre_grace_plan   TEXT;
