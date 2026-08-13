-- ElderGuard AI Companion Microservice Database Migration

-- 1. Chat Logs Table (Write-Only History Persistence)
CREATE TABLE IF NOT EXISTS chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Index for history retrieval queries
CREATE INDEX IF NOT EXISTS idx_chat_logs_elder_created ON chat_logs(elder_id, created_at DESC);
