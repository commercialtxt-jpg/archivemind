ALTER TABLE routines
    ADD COLUMN field_trip_id UUID REFERENCES field_trips(id) ON DELETE SET NULL;

CREATE INDEX idx_routines_field_trip ON routines(field_trip_id) WHERE field_trip_id IS NOT NULL;
