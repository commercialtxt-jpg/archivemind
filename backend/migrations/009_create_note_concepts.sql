CREATE TABLE note_concepts (
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    concept_id      UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, concept_id)
);

CREATE INDEX idx_nc_concept ON note_concepts(concept_id);
