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
