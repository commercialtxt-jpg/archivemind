ALTER TABLE inventory_items
    ADD COLUMN category TEXT NOT NULL DEFAULT 'general',
    ADD COLUMN notes    TEXT;
