-- Shareable identifier used by caregivers to connect with an elder.
ALTER TABLE elder_profiles ADD COLUMN IF NOT EXISTS elder_id TEXT;
UPDATE elder_profiles
SET elder_id = 'EG-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 8))
WHERE elder_id IS NULL;
ALTER TABLE elder_profiles ALTER COLUMN elder_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_elder_profiles_elder_id ON elder_profiles(elder_id);
