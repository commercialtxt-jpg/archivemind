DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routines' AND column_name = 'icon') THEN
        ALTER TABLE routines ADD COLUMN icon TEXT NOT NULL DEFAULT '📋';
    END IF;
END $$;
