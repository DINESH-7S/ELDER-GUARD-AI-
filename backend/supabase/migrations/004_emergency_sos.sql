-- ElderGuard AI Emergency SOS & Escalation Service Database Migration

-- 1. SOS Events Table
CREATE TABLE IF NOT EXISTS sos_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location_lat NUMERIC NULL,
    location_lng NUMERIC NULL,
    location_accuracy_m NUMERIC NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'acknowledged', 'resolved')) DEFAULT 'active',
    current_escalation_tier INTEGER NOT NULL DEFAULT 1,
    resolved_at TIMESTAMPTZ NULL,
    resolved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    resolution_note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SOS Escalation Tiers Policy Table
CREATE TABLE IF NOT EXISTS sos_escalation_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    tier_number INTEGER NOT NULL,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('caregiver', 'secondary_caregiver', 'hospital', 'emergency_services')),
    recipient_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    timeout_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SOS Event Log Audit Table
CREATE TABLE IF NOT EXISTS sos_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_event_id UUID NOT NULL REFERENCES sos_events(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    notification_broadcast_id TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed System Default Escalation Tiers (elder_id IS NULL)
INSERT INTO sos_escalation_tiers (id, elder_id, tier_number, recipient_type, recipient_id, timeout_minutes)
VALUES
    ('00000000-0000-0000-0000-000000000001', NULL, 1, 'caregiver', NULL, 0),
    ('00000000-0000-0000-0000-000000000002', NULL, 1, 'hospital', NULL, 0),
    ('00000000-0000-0000-0000-000000000003', NULL, 2, 'caregiver', NULL, 3),
    ('00000000-0000-0000-0000-000000000004', NULL, 3, 'hospital', NULL, 5)
ON CONFLICT (id) DO NOTHING;

-- Indexes for performance in sweep queries
CREATE INDEX IF NOT EXISTS idx_sos_events_status ON sos_events(status, triggered_at);
CREATE INDEX IF NOT EXISTS idx_sos_events_elder ON sos_events(elder_id, status);
CREATE INDEX IF NOT EXISTS idx_sos_event_log_event ON sos_event_log(sos_event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sos_escalation_tiers_elder ON sos_escalation_tiers(elder_id, tier_number);
