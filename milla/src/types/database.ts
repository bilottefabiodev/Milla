export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'
export type SubscriptionPlan = 'quarterly' | 'yearly'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type ReadingSection =
    | 'missao_da_alma'
    | 'personalidade'
    | 'destino'
    | 'proposito'
    | 'manifestacao_material'

export interface ReadingContent {
    arcano: string
    titulo: string
    interpretacao: string
    sombra: string
    conselho: string
}

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    birthdate: string | null
                    locale: string
                    onboarding_completed_at: string | null
                    consent_terms_at: string | null
                    consent_disclaimer_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    birthdate?: string | null
                    locale?: string
                    onboarding_completed_at?: string | null
                    consent_terms_at?: string | null
                    consent_disclaimer_at?: string | null
                }
                Update: {
                    full_name?: string | null
                    birthdate?: string | null
                    locale?: string
                    onboarding_completed_at?: string | null
                    consent_terms_at?: string | null
                    consent_disclaimer_at?: string | null
                }
            }
            subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    status: SubscriptionStatus
                    plan: SubscriptionPlan
                    payment_provider: string | null
                    provider_subscription_id: string | null
                    current_period_start: string | null
                    current_period_end: string | null
                    canceled_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    status?: SubscriptionStatus
                    plan: SubscriptionPlan
                    payment_provider?: string | null
                    provider_subscription_id?: string | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                }
                Update: {
                    status?: SubscriptionStatus
                    plan?: SubscriptionPlan
                    current_period_end?: string | null
                    canceled_at?: string | null
                }
            }
            readings: {
                Row: {
                    id: string
                    user_id: string
                    section: ReadingSection
                    content: ReadingContent
                    prompt_version: string
                    model_used: string
                    created_at: string
                }
                Insert: {
                    user_id: string
                    section: ReadingSection
                    content: ReadingContent
                    prompt_version: string
                    model_used: string
                }
                Update: {
                    content?: ReadingContent
                    prompt_version?: string
                    model_used?: string
                }
            }
            jobs: {
                Row: {
                    id: string
                    user_id: string
                    type: string
                    status: JobStatus
                    payload: Json
                    result: Json | null
                    idempotency_key: string
                    attempts: number
                    max_attempts: number
                    last_error: string | null
                    scheduled_at: string
                    started_at: string | null
                    completed_at: string | null
                    created_at: string
                }
                Insert: {
                    user_id: string
                    type?: string
                    status?: JobStatus
                    payload: Json
                    idempotency_key: string
                    max_attempts?: number
                    scheduled_at?: string
                }
                Update: {
                    status?: JobStatus
                    result?: Json | null
                    attempts?: number
                    last_error?: string | null
                    started_at?: string | null
                    completed_at?: string | null
                }
            }
            prompts: {
                Row: {
                    id: string
                    section: ReadingSection
                    version: string
                    template: string
                    schema: Json
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    section: ReadingSection
                    version: string
                    template: string
                    schema: Json
                    is_active?: boolean
                }
                Update: {
                    template?: string
                    schema?: Json
                    is_active?: boolean
                }
            }
        }
    }
}
