DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'category') THEN
        ALTER TABLE inventory_items ADD COLUMN category TEXT NOT NULL DEFAULT 'general';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'notes') THEN
        ALTER TABLE inventory_items ADD COLUMN notes TEXT;
    END IF;
END $$;
