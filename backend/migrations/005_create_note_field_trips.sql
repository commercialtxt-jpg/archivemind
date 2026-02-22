CREATE TABLE note_field_trips (
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    field_trip_id   UUID NOT NULL REFERENCES field_trips(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, field_trip_id)
);

CREATE INDEX idx_nft_field_trip ON note_field_trips(field_trip_id);
