import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Arcano name to filename mapping (matches Supabase Storage)
const ARCANO_IMAGES: Record<string, string> = {
    'O Mago': 'o_mago.png',
    'A Sacerdotisa': 'a_sacerdotisa.png',
    'A Imperatriz': 'a_imperatriz.png',
    'O Imperador': 'o_imperador.png',
    'O Hierofante': 'o_hierofante.png',
    'Os Enamorados': 'os_enamorados.png',
    'O Carro': 'o_carro.png',
    'A Justiça': 'a_justica.png',
    'O Eremita': 'o_eremita.png',
    'A Roda da Fortuna': 'a_roda_da_fortuna.png',
    'A Força': 'a_forca.png',
    'O Pendurado': 'o_pendurado.png',
    'A Morte': 'a_morte.png',
    'A Temperança': 'a_temperanca.png',
    'O Diabo': 'o_diabo.png',
    'A Torre': 'a_torre.png',
    'A Estrela': 'a_estrela.png',
    'A Lua': 'a_lua.png',
    'O Sol': 'o_sol.png',
    'O Julgamento': 'o_julgamento.png',
    'O Mundo': 'o_mundo.png',
    'O Louco': 'o_louco.png',
}

// Helper to get public storage URL
export function getCardImageUrl(arcano: string): string {
    const filename = ARCANO_IMAGES[arcano]
    if (!filename) {
        // Fallback: try to convert name to slug
        const slug = arcano
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
        return `${supabaseUrl}/storage/v1/object/public/cards/${slug}.png`
    }
    return `${supabaseUrl}/storage/v1/object/public/cards/${filename}`
}

export function getLocalCardImageUrl(arcano: string): string {
    const filename = ARCANO_IMAGES[arcano]
    if (!filename) {
        const slug = arcano
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
        return `/cards/${slug}.png`
    }
    return `/cards/${filename}`
}

