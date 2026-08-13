CREATE TABLE IF NOT EXISTS doctor_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient TEXT,
  mrn TEXT,
  medicine TEXT NOT NULL,
  sig TEXT,
  duration TEXT,
  refills INTEGER DEFAULT 0,
  pharmacy TEXT,
  status TEXT,
  time_slot TEXT,
  meal_timing TEXT,
  rx_type TEXT,
  file_name TEXT,
  file_url TEXT,
  file_size TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient TEXT,
  mrn TEXT,
  title TEXT NOT NULL,
  source TEXT,
  status TEXT,
  tier TEXT,
  file_name TEXT,
  file_url TEXT,
  file_size TEXT,
  values_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_prescriptions_doctor ON doctor_prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_prescriptions_elder ON doctor_prescriptions(elder_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reports_doctor ON doctor_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reports_elder ON doctor_reports(elder_id);
