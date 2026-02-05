-- Migration: 004_create_readings
-- Description: Create readings table

CREATE TABLE readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section reading_section NOT NULL,
  content JSONB NOT NULL,
  prompt_version TEXT NOT NULL,
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one reading per user per section
  CONSTRAINT readings_user_section_unique UNIQUE (user_id, section)
);

-- Indexes
CREATE INDEX readings_user_id_idx ON readings(user_id);
CREATE INDEX readings_user_section_idx ON readings(user_id, section);
