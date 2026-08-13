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
