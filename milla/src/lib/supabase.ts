import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper to get public storage URL
export function getCardImageUrl(arcano: string): string {
    const slug = arcano
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

    // Try Supabase Storage first
    const storageUrl = `${supabaseUrl}/storage/v1/object/public/cards/${slug}.webp`

    // Fallback will be handled in component with onError
    return storageUrl
}

export function getLocalCardImageUrl(arcano: string): string {
    const slug = arcano
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

    return `/cards/${slug}.webp`
}
