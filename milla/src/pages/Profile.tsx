import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useReadings } from '../hooks/useReadings'
import { track } from '../lib/analytics'
import { SECTIONS, SECTION_KEYS, type SectionKey } from '../lib/constants'
import { getCardImageUrl, getLocalCardImageUrl } from '../lib/supabase'
import type { ReadingContent } from '../types/database'
import { LogOut, Sparkles, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '../lib/utils'

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
            <div className="card-glass p-8 animate-pulse flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                <div className="w-32 h-48 bg-gold-400/10 rounded-xl" />
                <div className="h-6 w-48 bg-gold-400/10 rounded" />
                <div className="h-4 w-64 bg-white/5 rounded" />
                <div className="text-gold-400/60 font-serif tracking-widest text-sm animate-pulse">
                    Revelando Arcano...
                </div>
            </div>
        )
    }

    if (!content) {
        return (
            <div className="card-glass p-12 text-center text-white/40">
                <p className="font-serif italic">Selecione uma área para ver sua leitura</p>
            </div>
        )
    }

    const imageUrl = imgError
        ? getLocalCardImageUrl(content.arcano)
        : getCardImageUrl(content.arcano)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row gap-8"
        >
            {/* Left: Card Image */}
            <div className="w-full md:w-1/3 flex justify-center md:block">
                <div className="relative group perspective-1000 w-48 h-72 md:w-full md:max-w-xs md:h-96">
                    <div className="absolute inset-0 bg-gold-500/20 blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
                    <img
                        src={imageUrl}
                        alt={content.arcano}
                        onError={() => setImgError(true)}
                        className="relative z-10 w-full h-full object-cover rounded-xl shadow-2xl border border-gold-500/20"
                    />
                </div>
            </div>

            {/* Right: Content */}
            <div className="flex-1 space-y-6">
                <div>
                    <span className="text-xs font-serif text-gold-500 uppercase tracking-[0.2em] mb-1 block">Arcano Regente</span>
                    <h2 className="text-3xl md:text-4xl font-serif text-gold-100 mb-2">{content.titulo}</h2>
                    <div className="h-px w-24 bg-gradient-to-r from-gold-500/50 to-transparent" />
                </div>

                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <h3 className="text-sm font-serif text-gold-200 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-gold-500" />
                        Interpretação
                    </h3>
                    <p className="text-white/80 leading-relaxed font-sans">{content.interpretacao}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-950/10 p-4 rounded-lg border border-red-500/10">
                        <h4 className="text-xs font-serif text-red-400 uppercase tracking-widest mb-2">Sombra</h4>
                        <p className="text-white/60 text-sm leading-relaxed">{content.sombra}</p>
                    </div>
                    <div className="bg-emerald-950/10 p-4 rounded-lg border border-emerald-500/10">
                        <h4 className="text-xs font-serif text-emerald-400 uppercase tracking-widest mb-2">Conselho</h4>
                        <p className="text-white/60 text-sm leading-relaxed">{content.conselho}</p>
                    </div>
                </div>
            </div>
        </motion.div>
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
        <div className="flex overflow-x-auto gap-3 pb-4 pt-2 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gold-900 scrollbar-track-transparent">
            {SECTION_KEYS.map((section) => {
                const isActive = activeTab === section
                const hasReading = readingSections.has(section)

                return (
                    <button
                        key={section}
                        onClick={() => onTabChange(section)}
                        className={cn(
                            "relative shrink-0 px-5 py-2.5 rounded-sm text-xs font-serif uppercase tracking-widest transition-all duration-300 border border-transparent",
                            isActive
                                ? "bg-gold-500/10 text-gold-200 border-gold-500/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                                : "text-white/40 hover:text-gold-200/80 hover:bg-white/5"
                        )}
                    >
                        {SECTIONS[section]}
                        {hasReading && !isActive && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-gold-500 rounded-full" />
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
        <div className="min-h-screen bg-mystic-950 text-gold-100 pb-12">
            <div className="absolute inset-0 bg-[url('/bg-mystic.png')] bg-cover opacity-10 pointer-events-none fixed" />

            {/* Header */}
            <header className="relative z-10 px-6 py-6 border-b border-white/5 bg-mystic-950/50 backdrop-blur-md">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-serif text-gold-100 tracking-widest">Milla</h1>
                    <button
                        onClick={signOut}
                        className="text-white/40 hover:text-red-400 transition-colors duration-300 flex items-center gap-2 text-xs uppercase tracking-widest"
                    >
                        <LogOut className="w-4 h-4" /> Sair
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">

                {/* Astral Seal Header */}
                <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
                    {/* Seal Avatar */}
                    <div className="relative group">
                        {/* Rotating Rings */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-4 rounded-full border border-gold-500/30 border-dashed"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-1 rounded-full border border-gold-400/20"
                        />

                        <div className="w-32 h-32 rounded-full bg-mystic-900 border-2 border-gold-500/50 flex items-center justify-center relative z-10 overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                            <div className="text-4xl font-serif text-gold-200">
                                {profile?.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {/* Profile Info */}
                    <div className="text-center md:text-left space-y-2">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-gold-500 font-serif text-xs uppercase tracking-[0.3em]"
                        >
                            Viajante Astral
                        </motion.div>
                        <h2 className="text-4xl font-serif text-gold-100 tracking-wide">{profile?.full_name}</h2>
                        <p className="text-white/40 text-sm font-mono uppercase">
                            {profile?.birthdate && new Date(profile.birthdate).toLocaleDateString('pt-BR')}
                        </p>

                        {/* Status Indicators */}
                        <div className="pt-4 flex flex-wrap gap-4 justify-center md:justify-start">
                            {isGenerating && (
                                <div className="flex items-center gap-2 text-gold-400 animate-pulse">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-widest">Interpretando estrelas...</span>
                                </div>
                            )}
                            {hasAllReadings() && (
                                <div className="flex items-center gap-2 text-emerald-400/80">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-widest">Mapa Completo</span>
                                </div>
                            )}
                            {jobStatus === 'failed' && (
                                <div className="flex items-center gap-2 text-red-400/80 cursor-pointer hover:text-red-300 transition-colors" onClick={refetch}>
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-widest">Falha na conexão. Tentar novamente.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs & Content */}
                <div className="space-y-8">
                    <TabNavigation
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        readingSections={readingSections}
                    />

                    <ReadingCard
                        content={currentReading?.content}
                        isGenerating={isGenerating && !currentReading}
                    />
                </div>
            </main>
        </div>
    )
}
