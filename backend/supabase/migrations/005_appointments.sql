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
