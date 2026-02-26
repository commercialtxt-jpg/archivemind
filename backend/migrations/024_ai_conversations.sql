CREATE TABLE ai_conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID NOT NULL REFERENCES workspaces(id),
    note_id       UUID REFERENCES notes(id) ON DELETE SET NULL,
    title         TEXT NOT NULL DEFAULT 'New conversation',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content         TEXT NOT NULL,
    citations       JSONB,
    model           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_workspace ON ai_conversations(workspace_id);
CREATE INDEX idx_ai_conversations_note ON ai_conversations(note_id);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);
