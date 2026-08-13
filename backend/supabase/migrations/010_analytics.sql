-- ElderGuard AI Health Digest & Adherence Analytics Migration

-- 1. Daily Health Digests Cache Table
CREATE TABLE IF NOT EXISTS daily_health_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    digest_date DATE NOT NULL,
    adherence_percent NUMERIC NOT NULL DEFAULT 100.0,
    vitals_stability_index TEXT NOT NULL DEFAULT 'STABLE',
    abnormal_vitals_count INTEGER NOT NULL DEFAULT 0,
    upcoming_appointments_count INTEGER NOT NULL DEFAULT 0,
    summary_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_elder_digest_date UNIQUE (elder_id, digest_date)
);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_digests_elder_date ON daily_health_digests(elder_id, digest_date DESC);
