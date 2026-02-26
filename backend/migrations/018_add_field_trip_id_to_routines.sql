DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routines' AND column_name = 'field_trip_id') THEN
        ALTER TABLE routines ADD COLUMN field_trip_id UUID REFERENCES field_trips(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_routines_field_trip ON routines(field_trip_id) WHERE field_trip_id IS NOT NULL;
