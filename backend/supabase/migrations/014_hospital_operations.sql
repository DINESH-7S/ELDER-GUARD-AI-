CREATE TABLE IF NOT EXISTS hospital_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospital_profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    head TEXT NULL,
    beds_total INTEGER NULL,
    beds_occupied INTEGER NULL,
    status TEXT NULL,
    contact_ext TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospital_profiles(user_id) ON DELETE CASCADE,
    elder_id UUID NULL REFERENCES elder_profiles(user_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    assigned_doctor_id UUID NULL REFERENCES doctor_profiles(user_id) ON DELETE SET NULL,
    status TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospital_profiles(user_id) ON DELETE CASCADE,
    appointment_id UUID NULL REFERENCES appointments(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    department_id UUID NULL REFERENCES hospital_departments(id) ON DELETE SET NULL,
    queue_token TEXT NULL,
    status TEXT NULL,
    priority TEXT NULL,
    reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospital_profiles(user_id) ON DELETE CASCADE,
    patient_id UUID NULL REFERENCES hospital_patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    invoice_no TEXT NULL,
    amount NUMERIC NULL,
    status TEXT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_departments_hospital ON hospital_departments(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_patients_hospital ON hospital_patients(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_queue_hospital ON hospital_queue_entries(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hospital_billing_hospital ON hospital_billing_records(hospital_id, created_at DESC);
