-- ElderGuard AI Medicine Reminder Service Database Migration

-- 1. Medicines Table (Schedule definition)
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    times_of_day JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Reminder Sessions Table (The Alarm itself - ONE per elder per scheduled_time)
CREATE TABLE IF NOT EXISTS reminder_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'RINGING', 'RETRY_WAIT', 'RESOLVED', 'AUTO_MISSED')) DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    current_ring_started_at TIMESTAMPTZ NULL,
    next_retry_at TIMESTAMPTZ NULL,
    resolved_at TIMESTAMPTZ NULL,
    resolution TEXT NULL CHECK (resolution IN ('taken', 'dismissed', 'auto_missed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Reminder Session Items Table (The medicines bundled inside one alarm session)
CREATE TABLE IF NOT EXISTS reminder_session_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES reminder_sessions(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    marked_taken BOOLEAN NOT NULL DEFAULT FALSE,
    marked_taken_at TIMESTAMPTZ NULL
);

-- Indexes for fast query performance in background sweep jobs
CREATE INDEX IF NOT EXISTS idx_reminder_sessions_status_scheduled ON reminder_sessions(status, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_reminder_sessions_elder_status ON reminder_sessions(elder_id, status);
