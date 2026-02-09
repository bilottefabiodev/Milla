// Types for forecasts

export type ForecastType = 'weekly' | 'monthly' | 'yearly';

export interface Forecast {
    id: string;
    user_id: string;
    type: ForecastType;
    period_start: string; // ISO date
    period_end: string;   // ISO date
    title: string;
    content: string;
    summary: string | null;
    audio_url: string | null;
    audio_duration_seconds: number | null;
    prompt_version: string;
    model_used: string;
    calculation_base: Record<string, unknown>;
    delivered_at: string; // ISO datetime
    created_at: string;
    expires_at: string | null;
}

export interface ForecastFilter {
    type?: ForecastType | 'all';
    startDate?: string;
    endDate?: string;
}

// For the carousel
export interface ForecastCarouselItem {
    id: string;
    type: ForecastType;
    label: string; // "S1 Fev", "Fevereiro", "2026"
    hasAudio: boolean;
    date: string;
}

// Type labels in Portuguese
export const FORECAST_TYPE_LABELS: Record<ForecastType, string> = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
};

// Icons for forecast types
export const FORECAST_TYPE_ICONS: Record<ForecastType, string> = {
    weekly: '🔮',
    monthly: '🌙',
    yearly: '⭐',
};
