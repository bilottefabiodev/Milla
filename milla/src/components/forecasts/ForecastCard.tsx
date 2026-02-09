import { motion } from 'motion/react'
import { Star, Moon, Sun, Volume2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Forecast, ForecastType } from '../../types/forecast'
import { AudioPlayer } from './AudioPlayer'

interface ForecastCardProps {
    forecast: Forecast;
    isExpanded?: boolean;
    onToggle?: () => void;
}

const FORECAST_ICONS: Record<ForecastType, typeof Star> = {
    weekly: Star,
    monthly: Moon,
    yearly: Sun,
}

const FORECAST_COLORS: Record<ForecastType, string> = {
    weekly: 'from-purple-500/20 to-purple-900/10',
    monthly: 'from-blue-500/20 to-blue-900/10',
    yearly: 'from-amber-500/20 to-amber-900/10',
}

export function ForecastCard({ forecast, isExpanded, onToggle }: ForecastCardProps) {
    const Icon = FORECAST_ICONS[forecast.type]
    const gradientColors = FORECAST_COLORS[forecast.type]

    // Format period dates
    const formatPeriod = () => {
        const start = new Date(forecast.period_start)
        const end = new Date(forecast.period_end)

        if (forecast.type === 'weekly') {
            return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
        } else if (forecast.type === 'monthly') {
            return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        } else {
            return start.getFullYear().toString()
        }
    }

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
                "relative overflow-hidden rounded-2xl border border-gold-900/20 transition-all duration-300",
                `bg-gradient-to-br ${gradientColors}`,
                isExpanded ? "col-span-full" : ""
            )}
        >
            {/* Card Header - Always Visible */}
            <button
                onClick={onToggle}
                className="w-full p-6 text-left flex items-start gap-4 hover:bg-white/5 transition-colors"
            >
                <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-gold-300" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gold-400/60 uppercase tracking-wider">
                            {forecast.type === 'weekly' ? 'Semanal' : forecast.type === 'monthly' ? 'Mensal' : 'Anual'}
                        </span>
                        <span className="text-xs text-gold-400/40">•</span>
                        <span className="text-xs text-gold-400/60">
                            {formatPeriod()}
                        </span>
                        {forecast.audio_url && (
                            <>
                                <span className="text-xs text-gold-400/40">•</span>
                                <Volume2 className="w-3. h-3.5 text-gold-400/60" />
                            </>
                        )}
                    </div>

                    <h3 className="font-serif text-xl text-gold-100 truncate pr-4">
                        {forecast.title}
                    </h3>

                    {!isExpanded && forecast.summary && (
                        <p className="mt-2 text-sm text-gold-200/60 line-clamp-2">
                            {forecast.summary}
                        </p>
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-6 space-y-6"
                >
                    {/* Audio Player */}
                    {forecast.audio_url && (
                        <AudioPlayer
                            audioUrl={forecast.audio_url}
                            duration={forecast.audio_duration_seconds}
                        />
                    )}

                    {/* Full Content */}
                    <div className="prose prose-invert prose-gold max-w-none">
                        <p className="text-gold-100/80 leading-relaxed whitespace-pre-wrap">
                            {forecast.content}
                        </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gold-400/40 pt-4 border-t border-gold-900/10">
                        <span>
                            Entregue em {new Date(forecast.delivered_at).toLocaleDateString('pt-BR')}
                        </span>
                        {forecast.expires_at && (
                            <span>
                                Válido até {new Date(forecast.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                        )}
                    </div>
                </motion.div>
            )}
        </motion.article>
    )
}
