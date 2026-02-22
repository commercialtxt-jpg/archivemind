CREATE TABLE stars (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id     UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, note_id)
);
