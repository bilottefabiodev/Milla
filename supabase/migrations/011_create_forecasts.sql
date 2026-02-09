-- Migration: 011_create_forecasts
-- Description: Create forecasts table with audio support and cleanup policies

-- Enum para tipo de previsão
CREATE TYPE forecast_type AS ENUM ('weekly', 'monthly', 'yearly');

CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tipo e período
    type forecast_type NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Conteúdo
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    
    -- Áudio
    audio_url TEXT,
    audio_duration_seconds INT,
    
    -- Metadata IA
    prompt_version TEXT NOT NULL,
    model_used TEXT NOT NULL,
    calculation_base JSONB,
    
    -- Timestamps
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ,
    
    -- Constraint: um forecast por tipo por período por usuário
    CONSTRAINT forecasts_unique_user_type_period UNIQUE(user_id, type, period_start)
);

-- Índices
CREATE INDEX idx_forecasts_user_id ON forecasts(user_id);
CREATE INDEX idx_forecasts_user_delivered ON forecasts(user_id, delivered_at DESC);
CREATE INDEX idx_forecasts_expires ON forecasts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_forecasts_type ON forecasts(type);

-- RLS
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só veem próprias previsões entregues
CREATE POLICY "Users can view own delivered forecasts"
    ON forecasts FOR SELECT
    USING (auth.uid() = user_id AND delivered_at IS NOT NULL);

-- INSERT/UPDATE/DELETE: apenas service_role (não precisa de policy explícita)
