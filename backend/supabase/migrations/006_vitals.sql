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
