-- Migration: 003_create_prompts
-- Description: Create prompts table with partial unique index for is_active

CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section reading_section NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  template TEXT NOT NULL,
  schema JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Partial unique index: only one active prompt per section
CREATE UNIQUE INDEX prompts_one_active_per_section 
ON prompts(section) 
WHERE is_active = true;

-- Index for active prompts lookup
CREATE INDEX prompts_section_active_idx ON prompts(section, is_active);
