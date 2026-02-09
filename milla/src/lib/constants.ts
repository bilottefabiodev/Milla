export const SECTIONS = {
    missao_da_alma: 'Missão da Alma',
    personalidade: 'Personalidade',
    destino: 'Destino',
    proposito: 'Propósito',
    manifestacao_material: 'Manifestação Material',
} as const

export type SectionKey = keyof typeof SECTIONS

export const SECTION_KEYS: SectionKey[] = [
    'missao_da_alma',
    'personalidade',
    'destino',
    'proposito',
    'manifestacao_material',
]

export const ROUTES = {
    LANDING: '/',
    LOGIN: '/login',
    SIGNUP: '/signup',
    RESET_PASSWORD: '/reset-password',
    ONBOARDING: '/onboarding',
    PAYWALL: '/paywall',
    MAPA: '/mapa',
    PREVISOES: '/previsoes',
    PROFILE: '/perfil',
} as const
