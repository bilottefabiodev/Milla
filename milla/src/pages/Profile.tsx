import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useReadings } from '../hooks/useReadings'
import { track } from '../lib/analytics'
import { SECTIONS, SECTION_KEYS, type SectionKey } from '../lib/constants'
import { getCardImageUrl, getLocalCardImageUrl } from '../lib/supabase'
import type { ReadingContent } from '../types/database'

// Reading Card Component
function ReadingCard({
    content,
    isGenerating
}: {
    content?: ReadingContent
    isGenerating: boolean
}) {
    const [imgError, setImgError] = useState(false)

    if (isGenerating) {
        return (
            <div className="card animate-pulse">
                <div className="flex items-start gap-6">
                    <div className="w-24 h-36 bg-white/10 rounded-lg shrink-0"></div>
                    <div className="flex-1 space-y-4">
                        <div className="h-6 bg-white/10 rounded w-3/4"></div>
                        <div className="h-4 bg-white/10 rounded w-full"></div>
                        <div className="h-4 bg-white/10 rounded w-5/6"></div>
                        <div className="h-4 bg-white/10 rounded w-4/6"></div>
                    </div>
                </div>
                <div className="mt-4 text-center text-white/40 text-sm">
                    ✨ Gerando sua interpretação...
                </div>
            </div>
        )
    }

    if (!content) {
        return (
            <div className="card text-center py-12">
                <p className="text-white/60">Interpretação ainda não disponível</p>
            </div>
        )
    }

    const imageUrl = imgError
        ? getLocalCardImageUrl(content.arcano)
        : getCardImageUrl(content.arcano)

    return (
        <div className="card space-y-6">
            {/* Header with Card Image */}
            <div className="flex items-start gap-6">
                <div className="shrink-0">
                    <img
                        src={imageUrl}
                        alt={content.arcano}
                        onError={() => setImgError(true)}
                        className="w-24 h-36 object-cover rounded-lg shadow-lg shadow-black/30"
                    />
                </div>
                <div>
                    <div className="text-milla-400 text-sm font-medium">{content.arcano}</div>
                    <h3 className="text-2xl font-bold mt-1">{content.titulo}</h3>
                </div>
            </div>

            {/* Interpretation */}
            <div>
                <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-2">
                    Interpretação
                </h4>
                <p className="text-white/90 leading-relaxed">{content.interpretacao}</p>
            </div>

            {/* Shadow */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-red-400/80 uppercase tracking-wide mb-2">
                    🌑 Sombra
                </h4>
                <p className="text-white/80 leading-relaxed">{content.sombra}</p>
            </div>

            {/* Advice */}
            <div className="bg-milla-500/5 border border-milla-500/10 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-milla-400 uppercase tracking-wide mb-2">
                    ✨ Conselho
                </h4>
                <p className="text-white/80 leading-relaxed">{content.conselho}</p>
            </div>
        </div>
    )
}

// Tab Navigation
function TabNavigation({
    activeTab,
    onTabChange,
    readingSections,
}: {
    activeTab: SectionKey
    onTabChange: (section: SectionKey) => void
    readingSections: Set<SectionKey>
}) {
    return (
        <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide">
            {SECTION_KEYS.map((section) => {
                const isActive = activeTab === section
                const hasReading = readingSections.has(section)

                return (
                    <button
                        key={section}
                        onClick={() => onTabChange(section)}
                        className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${isActive
                            ? 'bg-milla-500 text-white shadow-lg shadow-milla-500/30'
                            : hasReading
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                            }`}
                    >
                        {SECTIONS[section]}
                        {hasReading && !isActive && (
                            <span className="ml-1 text-xs">✓</span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

export default function Profile() {
    const { user, signOut } = useAuth()
    const { profile } = useProfile(user?.id)
    const { readings, getReadingBySection, getJobStatus, hasAllReadings, refetch } = useReadings(user?.id)

    const [activeTab, setActiveTab] = useState<SectionKey>('missao_da_alma')

    const jobStatus = getJobStatus()
    const isGenerating = jobStatus === 'pending' || jobStatus === 'processing'

    // Track tab changes
    const handleTabChange = (section: SectionKey) => {
        setActiveTab(section)
        track('tab_selected', { user_id: user?.id, section })
    }

    useEffect(() => {
        track('profile_viewed', { user_id: user?.id })
    }, [user?.id])

    // Build set of sections that have readings
    const readingSections = new Set(readings.map(r => r.section))

    const currentReading = getReadingBySection(activeTab)

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-milla-950/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-milla-300 to-purple-300 bg-clip-text text-transparent">
                            Milla
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {profile && (
                            <span className="text-white/60 text-sm hidden sm:block">
                                {profile.full_name}
                            </span>
                        )}
                        <button
                            onClick={signOut}
                            className="text-white/60 hover:text-white text-sm"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Profile Header */}
                <div className="card mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-milla-400 to-purple-500 flex items-center justify-center text-2xl font-bold">
                            {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">{profile?.full_name}</h2>
                            <p className="text-white/60 text-sm">
                                {profile?.birthdate && new Date(profile.birthdate).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>

                    {/* Status */}
                    {isGenerating && (
                        <div className="mt-4 bg-milla-500/10 border border-milla-500/20 rounded-xl p-4 flex items-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-milla-500"></div>
                            <span className="text-milla-300">Gerando suas interpretações...</span>
                        </div>
                    )}

                    {jobStatus === 'failed' && (
                        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                            <p className="text-red-400">Ocorreu um erro ao gerar suas interpretações.</p>
                            <button onClick={refetch} className="text-red-300 underline text-sm mt-2">
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {hasAllReadings() && (
                        <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                            <span className="text-green-400">✓ Seu Mapa da Vida está completo!</span>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <TabNavigation
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    readingSections={readingSections}
                />

                {/* Active Reading */}
                <div className="mt-6">
                    <ReadingCard
                        content={currentReading?.content}
                        isGenerating={isGenerating && !currentReading}
                    />
                </div>
            </main>
        </div>
    )
}
