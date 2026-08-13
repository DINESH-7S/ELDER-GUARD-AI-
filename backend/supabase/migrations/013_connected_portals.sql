-- ElderGuard connected Elder/Caregiver portal schema.
-- The application also creates equivalent SQLite tables for local demos.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE elder_caregiver_links ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE elder_caregiver_links ADD COLUMN IF NOT EXISTS permission_level TEXT NOT NULL DEFAULT 'full_access'
    CHECK (permission_level IN ('full_access', 'view_only'));
ALTER TABLE elder_caregiver_links ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active'));
ALTER TABLE elder_caregiver_links ADD COLUMN IF NOT EXISTS invited_by UUID NULL REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE elder_caregiver_links ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE elder_caregiver_links ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ NULL;
ALTER TABLE elder_caregiver_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_links_caregiver_status ON elder_caregiver_links(caregiver_id, status);
CREATE INDEX IF NOT EXISTS idx_links_elder_status ON elder_caregiver_links(elder_id, status);

CREATE TABLE IF NOT EXISTS connected_medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NULL,
    scheduled_times JSONB NOT NULL DEFAULT '[]'::jsonb,
    instructions TEXT NULL,
    stock_count INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 7,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    added_by UUID NOT NULL REFERENCES users(id),
    performed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_connected_medicines_elder ON connected_medicines(elder_id);

CREATE TABLE IF NOT EXISTS medicine_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES connected_medicines(id) ON DELETE CASCADE,
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'taken', 'missed')),
    taken_at TIMESTAMPTZ NULL,
    logged_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medicine_logs_elder ON medicine_logs(elder_id, scheduled_time);

CREATE TABLE IF NOT EXISTS connected_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('bp', 'sugar', 'heart_rate', 'spo2', 'weight', 'sleep')),
    value JSONB NOT NULL,
    unit TEXT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'device_sync')),
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_connected_vitals_elder ON connected_vitals(elder_id, recorded_at);

CREATE TABLE IF NOT EXISTS vital_target_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    vital_type TEXT NOT NULL,
    min_value NUMERIC NULL,
    max_value NUMERIC NULL,
    set_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connected_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    doctor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    hospital_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('video', 'in_person')),
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    notes TEXT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_connected_appointments_elder ON connected_appointments(elder_id, scheduled_at);

CREATE TABLE IF NOT EXISTS connected_sos_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location JSONB NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    caregiver_notified_at TIMESTAMPTZ NULL,
    resolved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_connected_sos_elder ON connected_sos_events(elder_id, triggered_at);

CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mood TEXT NOT NULL CHECK (mood IN ('calm', 'tired', 'unwell', 'happy')),
    ok_status BOOLEAN NOT NULL DEFAULT TRUE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_checkins_elder_date ON checkins(elder_id, date);

CREATE TABLE IF NOT EXISTS connected_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('medicine', 'appointment', 'water', 'activity', 'custom')),
    scheduled_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by UUID NOT NULL REFERENCES users(id),
    payload JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connected_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    elder_context_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachment_url TEXT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_elder ON connected_messages(elder_context_id, sent_at);

CREATE TABLE IF NOT EXISTS connected_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caregiver_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    performed_by UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID NULL,
    payload JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
