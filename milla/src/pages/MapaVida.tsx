import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useReadings } from '../hooks/useReadings'
import { SECTIONS, SECTION_KEYS, type SectionKey } from '../lib/constants'
import { ArcanoCardLux } from '../components/ArcanoCardLux'
import { cn } from '../lib/utils'
import { Sparkles, Moon, Sun, Scroll } from 'lucide-react'

// Layout Components
function GrimoireDivider() {
    return (
        <div className="flex items-center justify-center py-6 opacity-60">
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
            <div className="mx-4 text-gold-400">✨</div>
            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
        </div>
    )
}

function SectionCarousel({
    activeSection,
    onSelect,
    readings
}: {
    activeSection: SectionKey
    onSelect: (s: SectionKey) => void
    readings: any[] | undefined
}) {
    return (
        <div className="w-full overflow-x-auto pb-8 pt-4 scrollbar-hide">
            <div className="flex px-8 gap-6 min-w-max">
                {SECTION_KEYS.map((section, index) => {
                    const reading = readings?.find(r => r.section === section)
                    const isActive = activeSection === section

                    return (
                        <motion.button
                            key={section}
                            onClick={() => onSelect(section)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                                "relative group flex flex-col items-center gap-3 transition-all duration-300 outline-none",
                                isActive ? "scale-110 z-10" : "opacity-60 hover:opacity-100 hover:-translate-y-2"
                            )}
                        >
                            <ArcanoCardLux
                                arcano={reading?.content?.arcano || null}
                                size="small"
                                active={isActive}
                            />

                            <motion.span
                                className={cn(
                                    "text-xs font-serif tracking-widest uppercase transition-colors duration-300",
                                    isActive ? "text-gold-300 font-bold" : "text-white/40"
                                )}
                            >
                                {SECTIONS[section]}
                            </motion.span>

                            {isActive && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className="w-1 h-1 rounded-full bg-gold-400 absolute -bottom-2"
                                />
                            )}
                        </motion.button>
                    )
                })}
            </div>
        </div>
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
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="mb-6 opacity-30"
                >
                    <Sparkles size={48} className="text-gold-200" />
                </motion.div>
                <h3 className="text-xl font-serif text-gold-200/50 tracking-widest">
                    Aguardando Revelação...
                </h3>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 min-h-full"
        >
            {/* Left Column: Card Display */}
            <div className="lg:col-span-4 flex flex-col items-center lg:items-start lg:sticky lg:top-8 self-start">
                <ArcanoCardLux arcano={reading.arcano} size="large" active />

                <div className="mt-8 text-center lg:text-left w-full">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xs font-serif text-gold-400 uppercase tracking-[0.3em] mb-2"
                    >
                        Arcano Regente
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-4xl md:text-5xl font-serif text-gold-100 leading-tight mb-2"
                    >
                        {reading.titulo}
                    </motion.h2>
                    <div className="h-1 w-20 bg-gold-500/30 rounded-full my-4 mx-auto lg:mx-0" />
                </div>
            </div>

            {/* Right Column: Grimoire Content */}
            <div className="lg:col-span-8 space-y-8 pb-12">

                {/* Interpretation */}
                <section className="relative">
                    <h3 className="text-grimorie-header flex items-center gap-3">
                        <Scroll className="w-5 h-5 text-gold-500" />
                        Interpretação
                    </h3>
                    <p className="text-grimorie-body first-letter:text-5xl first-letter:font-serif first-letter:text-gold-300 first-letter:mr-3 first-letter:float-left first-letter:leading-none">
                        {reading.interpretacao}
                    </p>
                </section>

                <GrimoireDivider />

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Shadow */}
                    <section className="bg-red-950/20 p-6 rounded-xl border border-red-900/10 hover:border-red-900/30 transition-colors">
                        <h3 className="text-grimorie-header text-red-400/80 border-red-900/20 flex items-center gap-3">
                            <Moon className="w-5 h-5" />
                            Sombra
                        </h3>
                        <p className="text-white/70 italic leading-relaxed">
                            {reading.sombra}
                        </p>
                    </section>

                    {/* Advice */}
                    <section className="bg-emerald-950/20 p-6 rounded-xl border border-emerald-900/10 hover:border-emerald-900/30 transition-colors">
                        <h3 className="text-grimorie-header text-emerald-400/80 border-emerald-900/20 flex items-center gap-3">
                            <Sun className="w-5 h-5" />
                            Conselho
                        </h3>
                        <p className="text-white/70 italic leading-relaxed">
                            {reading.conselho}
                        </p>
                    </section>
                </div>
            </div>
        </motion.div>
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
            <div className="min-h-screen flex items-center justify-center bg-mystic-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin-slow text-4xl">🔮</div>
                    <div className="text-gold-400 font-serif tracking-widest animate-pulse">
                        Consultando os Astros...
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-mystic-950 text-gold-100 overflow-hidden relative">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 bg-[url('/bg-mystic.png')] bg-cover opacity-20 pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 px-8 py-6 border-b border-white/5 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-serif text-gold-100 tracking-wide">Mapa da Vida</h1>
                        <p className="text-gold-400/60 font-serif text-sm tracking-widest mt-1">
                            Bem-vindo, {profile?.full_name || 'Viajante'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col max-w-7xl mx-auto w-full relative z-10">

                {/* Navigation Carousel */}
                <div className="border-b border-white/5 bg-mystic-900/30 backdrop-blur-xl">
                    <SectionCarousel
                        activeSection={activeSection}
                        onSelect={setActiveSection}
                        readings={readings}
                    />
                </div>

                {/* Reading Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-thin scrollbar-thumb-gold-900 scrollbar-track-transparent">
                    <AnimatePresence mode="wait">
                        <ReadingContent key={activeSection} reading={activeReading || null} />
                    </AnimatePresence>
                </div>
            </main>
        </div>
    )
}
