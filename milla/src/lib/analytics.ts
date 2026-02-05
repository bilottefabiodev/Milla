import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'

let isInitialized = false

export function initAnalytics() {
    if (POSTHOG_KEY && !isInitialized) {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            loaded: () => {
                isInitialized = true
            },
        })
    }
}

type EventName =
    | 'onboarding_started'
    | 'onboarding_completed'
    | 'paywall_viewed'
    | 'subscription_started'
    | 'subscription_activated'
    | 'reading_generation_started'
    | 'reading_generation_completed'
    | 'reading_generation_failed'
    | 'profile_viewed'
    | 'tab_selected'

interface EventProperties {
    user_id?: string
    section?: string
    plan?: string
    duration_ms?: number
    error_type?: string
    has_previous_subscription?: boolean
    birthdate_year?: number
}

export function track(event: EventName, properties?: EventProperties) {
    // Always log in development
    if (import.meta.env.DEV) {
        console.log('[Analytics]', event, properties)
    }

    // Send to PostHog if configured
    if (POSTHOG_KEY && isInitialized) {
        posthog.capture(event, properties)
    }
}

export function identify(userId: string, traits?: Record<string, unknown>) {
    if (POSTHOG_KEY && isInitialized) {
        posthog.identify(userId, traits)
    }
}

export function reset() {
    if (POSTHOG_KEY && isInitialized) {
        posthog.reset()
    }
}
