import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useReadings } from '../hooks/useReadings'
import { SECTIONS, SECTION_KEYS, type SectionKey } from '../lib/constants'

// Supabase Storage base URL for cards
const STORAGE_URL = 'https://juwgugljvryvhcdnmwdh.supabase.co/storage/v1/object/public/cards'

// Map Arcano names to image filenames in Storage
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

// Fallback gradient colors for missing images
const ARCANO_COLORS: Record<string, string> = {
    'O Mago': 'from-yellow-500 to-orange-500',
    'A Sacerdotisa': 'from-blue-500 to-indigo-500',
    'A Imperatriz': 'from-green-500 to-emerald-500',
    'O Imperador': 'from-red-500 to-rose-500',
    'O Hierofante': 'from-purple-500 to-violet-500',
    'Os Enamorados': 'from-pink-500 to-rose-400',
    'O Carro': 'from-amber-500 to-yellow-500',
    'A Justiça': 'from-slate-500 to-gray-500',
    'O Eremita': 'from-stone-500 to-neutral-500',
    'A Roda da Fortuna': 'from-cyan-500 to-teal-500',
    'A Força': 'from-orange-500 to-red-500',
    'O Pendurado': 'from-indigo-500 to-blue-500',
    'A Morte': 'from-gray-700 to-slate-800',
    'A Temperança': 'from-sky-500 to-blue-400',
    'O Diabo': 'from-red-700 to-rose-900',
    'A Torre': 'from-amber-600 to-orange-700',
    'A Estrela': 'from-yellow-400 to-amber-400',
    'A Lua': 'from-indigo-600 to-purple-700',
    'O Sol': 'from-yellow-500 to-orange-400',
    'O Julgamento': 'from-sky-600 to-blue-600',
    'O Mundo': 'from-emerald-500 to-teal-500',
    'O Louco': 'from-violet-500 to-purple-500',
}

function getArcanoImageUrl(arcano: string): string | null {
    const filename = ARCANO_IMAGES[arcano]
    if (!filename) return null
    return `${STORAGE_URL}/${filename}`
}

function ArcanoCard({
    arcano,
    size = 'small'
}: {
    arcano: string | null
    size?: 'small' | 'large'
}) {
    const imageUrl = arcano ? getArcanoImageUrl(arcano) : null
    const fallbackColor = arcano
        ? ARCANO_COLORS[arcano] || 'from-milla-500 to-purple-500'
        : 'from-gray-600 to-gray-700'

    const sizeClasses = size === 'large'
        ? 'w-24 h-36 rounded-xl'
        : 'w-16 h-24 rounded-lg'

    if (imageUrl) {
        return (
            <div className={`${sizeClasses} overflow-hidden shadow-lg flex-shrink-0`}>
                <img
                    src={imageUrl}
                    alt={arcano || 'Carta'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fallback to gradient on image load error
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.parentElement!.classList.add('bg-gradient-to-br', ...fallbackColor.split(' '))
                    }}
                />
            </div>
        )
    }

    return (
        <div className={`${sizeClasses} bg-gradient-to-br ${fallbackColor} flex items-center justify-center shadow-lg flex-shrink-0`}>
            {arcano ? (
                <span className="text-white text-2xl">🔮</span>
            ) : (
                <span className="text-white/50 text-xl">?</span>
            )}
        </div>
    )
}

function SectionCard({
    section,
    isActive,
    onClick,
    reading
}: {
    section: SectionKey
    isActive: boolean
    onClick: () => void
    reading?: { arcano: string; titulo: string } | null
}) {
    return (
        <button
            onClick={onClick}
            className={`relative flex-shrink-0 w-28 flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 ${isActive
                    ? 'bg-white/10 ring-2 ring-milla-400 scale-105'
                    : 'hover:bg-white/5'
                }`}
        >
            <ArcanoCard arcano={reading?.arcano || null} size="small" />
            <span className={`text-xs text-center font-medium ${isActive ? 'text-white' : 'text-white/70'}`}>
                {SECTIONS[section]}
            </span>
        </button>
    )
}

function ReadingContent({ reading }: {
    reading: {
        arcano: string
        titulo: string
        interpretacao: string
        sombra: string
        conselho: string
    } | null
}) {
    if (!reading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <h3 className="text-xl font-medium text-white/70">Gerando sua leitura...</h3>
                    <p className="text-white/50 mt-2">Isso pode levar alguns segundos.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header with Arcano */}
            <div className="flex items-start gap-6">
                <ArcanoCard arcano={reading.arcano} size="large" />

                <div className="flex-1">
                    <div className="text-sm text-milla-400 font-medium mb-1">{reading.arcano}</div>
                    <h2 className="text-2xl font-bold text-white mb-2">{reading.titulo}</h2>
                </div>
            </div>

            {/* Interpretation */}
            <div className="card">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span>✨</span> Interpretação
                </h3>
                <p className="text-white/80 leading-relaxed">{reading.interpretacao}</p>
            </div>

            {/* Shadow */}
            <div className="card border-red-500/20">
                <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <span>🌑</span> Sombra
                </h3>
                <p className="text-white/80 leading-relaxed">{reading.sombra}</p>
            </div>

            {/* Advice */}
            <div className="card border-green-500/20">
                <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <span>💡</span> Conselho
                </h3>
                <p className="text-white/80 leading-relaxed">{reading.conselho}</p>
            </div>
        </div>
    )
}

export default function MapaVida() {
    const { user } = useAuth()
    const { profile } = useProfile(user?.id)
    const { readings, isLoading } = useReadings(user?.id)

    const [activeSection, setActiveSection] = useState<SectionKey>('missao_da_alma')

    const activeReading = readings?.find(r => r.section === activeSection)?.content as {
        arcano: string
        titulo: string
        interpretacao: string
        sombra: string
        conselho: string
    } | undefined

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-milla-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Mapa da Vida</h1>
                        <p className="text-white/60">Olá, {profile?.full_name || 'Viajante'} ✨</p>
                    </div>
                </div>
            </header>

            {/* Section tabs */}
            <div className="p-4 border-b border-white/10">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {SECTION_KEYS.map(section => {
                        const reading = readings?.find(r => r.section === section)
                        return (
                            <SectionCard
                                key={section}
                                section={section}
                                isActive={activeSection === section}
                                onClick={() => setActiveSection(section)}
                                reading={reading?.content as { arcano: string; titulo: string } | undefined}
                            />
                        )
                    })}
                </div>
            </div>

            {/* Reading content */}
            <ReadingContent reading={activeReading || null} />
        </div>
    )
}
