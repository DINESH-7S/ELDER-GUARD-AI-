-- ElderGuard AI Initial Database Schema Migration

-- Enable pgcrypto for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NULL,
    phone_no TEXT UNIQUE NULL,
    password_hash TEXT NULL,
    auth_provider TEXT NOT NULL CHECK (auth_provider IN ('email', 'mobile', 'google')),
    google_id TEXT NULL,
    role TEXT NOT NULL CHECK (role IN ('elder', 'caregiver', 'doctor', 'hospital', 'pharmacy')),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Caregiver Profiles Table (created before elder_profiles due to FK relationship option)
CREATE TABLE IF NOT EXISTS caregiver_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NULL,
    phone_no TEXT NULL,
    email TEXT NULL,
    relationship_to_elder TEXT NULL,
    linked_elder_id UUID NULL,
    profile_pic_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Elder Profiles Table
CREATE TABLE IF NOT EXISTS elder_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    elder_id TEXT UNIQUE NOT NULL,
    profile_pic_url TEXT NULL,
    name TEXT NOT NULL,
    nickname TEXT NULL,
    age_or_dob DATE NULL,
    gender TEXT NULL,
    blood_group TEXT NULL,
    primary_language TEXT NULL,
    phone_no TEXT NULL,
    home_address TEXT NULL,
    whatsapp_no TEXT NULL,
    email TEXT NULL,
    height_cm NUMERIC NULL,
    weight_kg NUMERIC NULL,
    bed_gap TEXT NULL,
    caregiver_id UUID NULL REFERENCES caregiver_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add circular FK for linked_elder_id in caregiver_profiles after elder_profiles table creation
ALTER TABLE caregiver_profiles 
    ADD CONSTRAINT fk_caregiver_linked_elder 
    FOREIGN KEY (linked_elder_id) REFERENCES elder_profiles(user_id) ON DELETE SET NULL;

-- 4. Elder Medical Reports Table
CREATE TABLE IF NOT EXISTS elder_medical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    report_file_url TEXT NOT NULL,
    ocr_extracted_text TEXT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Doctor Profiles Table
CREATE TABLE IF NOT EXISTS doctor_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NULL,
    professional_title TEXT NULL,
    gender TEXT NULL,
    profile_pic_url TEXT NULL,
    license_number TEXT NULL,
    medical_council_board TEXT NULL,
    years_of_experience INTEGER NULL,
    specialization TEXT NULL,
    qualification TEXT NULL,
    working_hours JSONB NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Hospital Profiles Table
CREATE TABLE IF NOT EXISTS hospital_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    office_name TEXT NULL,
    license_id TEXT NULL,
    address TEXT NULL,
    gps_lat NUMERIC NULL,
    gps_lng NUMERIC NULL,
    phone_no TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Pharmacy Profiles Table
CREATE TABLE IF NOT EXISTS pharmacy_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    pharmacy_name TEXT NULL,
    license_id TEXT NULL,
    address TEXT NULL,
    gps_lat NUMERIC NULL,
    gps_lng NUMERIC NULL,
    phone_no TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Join Tables
CREATE TABLE IF NOT EXISTS elder_caregiver_links (
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES caregiver_profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (elder_id, caregiver_id)
);

CREATE TABLE IF NOT EXISTS doctor_hospital_links (
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospital_profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (doctor_id, hospital_id)
);

CREATE TABLE IF NOT EXISTS hospital_care_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospital_profiles(user_id) ON DELETE CASCADE,
    unit_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
-- ElderGuard AI Notification Service Database Migration

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('alarm', 'alert', 'info')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    payload JSONB NULL,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'normal')) DEFAULT 'normal',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_via TEXT[] NOT NULL DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Device Tokens Table (FCM)
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL UNIQUE,
    device_type TEXT NOT NULL CHECK (device_type IN ('android', 'ios', 'web')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Telegram Links Table
CREATE TABLE IF NOT EXISTS telegram_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_chat_id TEXT NOT NULL UNIQUE,
    telegram_username TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_links_user ON telegram_links(user_id, is_active);
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
-- ElderGuard AI Doctor & Hospital Appointments Database Migration

-- 1. Doctor Availability Policy & Specific Date Overrides Table
CREATE TABLE IF NOT EXISTS doctor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id) ON DELETE CASCADE,
    day_of_week INTEGER NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Monday ... 6=Sunday
    specific_date DATE NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
    max_patients INTEGER NOT NULL DEFAULT 1,
    mode TEXT NOT NULL CHECK (mode IN ('in_person', 'telemedicine', 'both')) DEFAULT 'both',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_day_or_date CHECK (
        (day_of_week IS NOT NULL AND specific_date IS NULL) OR
        (day_of_week IS NULL AND specific_date IS NOT NULL)
    )
);

-- 2. Appointments Master Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id) ON DELETE CASCADE,
    hospital_id UUID NULL REFERENCES hospital_profiles(user_id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('in_person', 'telemedicine')) DEFAULT 'in_person',
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'rescheduled', 'no_show')) DEFAULT 'scheduled',
    reschedule_from_id UUID NULL REFERENCES appointments(id) ON DELETE SET NULL,
    queue_token TEXT NULL,
    cancelled_by TEXT NULL CHECK (cancelled_by IN ('elder', 'caregiver', 'doctor', 'hospital', 'system')),
    cancellation_reason TEXT NULL,
    idempotency_key TEXT UNIQUE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Race-condition double-booking prevention constraint
    CONSTRAINT uq_doctor_appointment_slot UNIQUE (doctor_id, appointment_date, start_time)
);

-- 3. Telemedicine Sessions Table
CREATE TABLE IF NOT EXISTS telemed_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    join_url TEXT NOT NULL,
    host_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('created', 'active', 'ended', 'expired')) DEFAULT 'created',
    expires_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Appointment Audit Log Table
CREATE TABLE IF NOT EXISTS appointment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    from_status TEXT NULL,
    to_status TEXT NULL,
    actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor ON doctor_availability(doctor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_elder_status ON appointments(elder_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date ON appointments(hospital_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointment_audit_log_appt ON appointment_audit_log(appointment_id, created_at);
-- ElderGuard AI Vitals Tracking Microservice Database Migration

-- 1. Vitals Table
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    systolic_bp INTEGER NULL,
    diastolic_bp INTEGER NULL,
    pulse_bpm INTEGER NULL,
    spo2_percent NUMERIC NULL,
    blood_sugar_mg_dl NUMERIC NULL,
    temperature_c NUMERIC NULL,
    notes TEXT NULL,
    is_abnormal BOOLEAN NOT NULL DEFAULT FALSE,
    abnormal_metrics TEXT[] NOT NULL DEFAULT '{}'::text[],
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance index for fast historical & trend queries
CREATE INDEX IF NOT EXISTS idx_vitals_elder_recorded ON vitals(elder_id, recorded_at DESC);
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
-- ElderGuard AI OCR Document Processor Database Migration

-- 1. OCR Scans Table
CREATE TABLE IF NOT EXISTS ocr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    scan_type TEXT NOT NULL CHECK (scan_type IN ('prescription', 'lab_report')),
    image_url TEXT NULL,
    raw_text TEXT NOT NULL,
    parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    auto_created_medicines_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_ocr_scans_elder_created ON ocr_scans(elder_id, created_at DESC);
-- ElderGuard AI Medical Reports & Document Vault Migration

-- 1. Medical Reports Table
CREATE TABLE IF NOT EXISTS medical_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('lab_result', 'prescription', 'discharge_summary', 'imaging', 'other')) DEFAULT 'lab_result',
    file_url TEXT NOT NULL,
    notes TEXT NULL,
    parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_medical_reports_elder_uploaded ON medical_reports(elder_id, uploaded_at DESC);
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
-- ElderGuard AI Community Events Microservice Database Migration

-- 1. Community Events Table
CREATE TABLE IF NOT EXISTS community_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('yoga', 'health_camp', 'walking_club', 'social', 'religious', 'workshop', 'other')) DEFAULT 'social',
    event_date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    organizer TEXT NOT NULL,
    registration_link TEXT NOT NULL,
    image_url TEXT NULL,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Event Registrations Table
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
    elder_id UUID NOT NULL REFERENCES elder_profiles(user_id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_elder_event UNIQUE (event_id, elder_id)
);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_events_date ON community_events(event_date ASC);
CREATE INDEX IF NOT EXISTS idx_registrations_elder ON event_registrations(elder_id, registered_at DESC);
