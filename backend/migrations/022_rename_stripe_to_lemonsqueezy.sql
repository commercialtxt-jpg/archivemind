-- Swap Stripe columns for LemonSqueezy equivalents
ALTER TABLE users
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  ADD COLUMN lemonsqueezy_customer_id TEXT,
  ADD COLUMN lemonsqueezy_subscription_id TEXT,
  ADD COLUMN lemonsqueezy_variant_id TEXT;
