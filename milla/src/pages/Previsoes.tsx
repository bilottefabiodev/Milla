import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, Calendar, Star, Moon, Sun } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useForecasts } from '../hooks/useForecasts'
import { ForecastCard } from '../components/forecasts/ForecastCard'
import { cn } from '../lib/utils'
import type { ForecastType } from '../types/forecast'

type TabType = 'all' | ForecastType

interface TabConfig {
    label: string;
    icon: typeof Star;
}

const TABS: Record<TabType, TabConfig> = {
    all: { label: 'Todas', icon: Calendar },
    weekly: { label: 'Semanal', icon: Star },
    monthly: { label: 'Mensal', icon: Moon },
    yearly: { label: 'Anual', icon: Sun },
}

const TAB_ORDER: TabType[] = ['all', 'weekly', 'monthly', 'yearly']

export default function Previsoes() {
    const { user } = useAuth()
    const { profile } = useProfile(user?.id)
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const { forecasts, isLoading } = useForecasts(user?.id, {
        type: activeTab === 'all' ? undefined : activeTab,
    })

    const handleToggle = (id: string) => {
        setExpandedId(expandedId === id ? null : id)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-mystic-950">
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="text-4xl"
                    >
                        🔮
                    </motion.div>
                    <div className="text-gold-400 font-serif tracking-widest animate-pulse">
                        Consultando o Futuro...
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-mystic-950 text-gold-100 overflow-hidden relative">
            {/* Background */}
            <div className="absolute inset-0 bg-[url('/bg-mystic.png')] bg-cover opacity-20 pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 px-8 py-6 border-b border-white/5 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-serif text-gold-100 tracking-wide flex items-center gap-3">
                            <Sparkles className="w-7 h-7 text-gold-400" />
                            Previsões
                        </h1>
                        <p className="text-gold-400/60 font-serif text-sm tracking-widest mt-1">
                            Suas orientações numerológicas, {profile?.full_name?.split(' ')[0] || 'Viajante'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <nav className="relative z-10 px-8 py-4 border-b border-white/5 bg-mystic-900/30 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide">
                    {TAB_ORDER.map((tab) => {
                        const config = TABS[tab]
                        const Icon = config.icon
                        const isActive = activeTab === tab

                        return (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab)
                                    setExpandedId(null)
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full font-serif text-sm tracking-wide transition-all",
                                    isActive
                                        ? "bg-gold-500/20 text-gold-200 border border-gold-500/30"
                                        : "text-gold-400/60 hover:text-gold-300 hover:bg-gold-500/10"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {config.label}
                            </button>
                        )
                    })}
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-thin scrollbar-thumb-gold-900 scrollbar-track-transparent relative z-10">
                <div className="max-w-7xl mx-auto">
                    {forecasts.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="text-6xl mb-6"
                            >
                                ✨
                            </motion.div>
                            <h3 className="text-xl font-serif text-gold-200/60 tracking-widest mb-2">
                                Nenhuma previsão disponível
                            </h3>
                            <p className="text-gold-400/40 max-w-md">
                                Suas previsões serão geradas automaticamente. Volte em breve!
                            </p>
                        </motion.div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <AnimatePresence mode="popLayout">
                                {forecasts.map((forecast) => (
                                    <ForecastCard
                                        key={forecast.id}
                                        forecast={forecast}
                                        isExpanded={expandedId === forecast.id}
                                        onToggle={() => handleToggle(forecast.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
