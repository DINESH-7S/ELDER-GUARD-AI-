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
