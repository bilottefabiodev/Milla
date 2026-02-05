-- Migration: 000_create_enums
-- Description: Create all enum types used in the database

-- Subscription status enum
CREATE TYPE subscription_status AS ENUM (
  'active',
  'canceled',
  'past_due',
  'trialing'
);

-- Subscription plan enum
CREATE TYPE subscription_plan AS ENUM (
  'quarterly',
  'yearly'
);

-- Job status enum
CREATE TYPE job_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Reading section enum
CREATE TYPE reading_section AS ENUM (
  'missao_da_alma',
  'personalidade',
  'destino',
  'proposito',
  'manifestacao_material'
);
