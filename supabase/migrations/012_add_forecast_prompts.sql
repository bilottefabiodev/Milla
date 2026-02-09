-- Migration: 012_add_forecast_prompts
-- Description: Add forecast sections to reading_section enum

-- Adicionar novos valores ao enum
ALTER TYPE reading_section ADD VALUE 'forecast_weekly';
ALTER TYPE reading_section ADD VALUE 'forecast_monthly';
ALTER TYPE reading_section ADD VALUE 'forecast_yearly';
