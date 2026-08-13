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
