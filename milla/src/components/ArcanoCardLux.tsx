import { motion } from "motion/react"
import { cn } from "../lib/utils"

interface ArcanoCardLuxProps {
    arcano: string | null
    size?: 'small' | 'large'
    active?: boolean
    className?: string
    onClick?: () => void
}

// Map Arcano names to image filenames in Storage
const STORAGE_URL = 'https://juwgugljvryvhcdnmwdh.supabase.co/storage/v1/object/public/cards'
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

function getArcanoImageUrl(arcano: string): string | null {
    const filename = ARCANO_IMAGES[arcano]
    if (!filename) return null
    return `${STORAGE_URL}/${filename}`
}

export function ArcanoCardLux({ arcano, size = 'small', active = false, className, onClick }: ArcanoCardLuxProps) {
    const imageUrl = arcano ? getArcanoImageUrl(arcano) : null

    // Size variants
    const sizeClasses = size === 'large'
        ? 'w-64 h-96 rounded-xl'
        : 'w-24 h-36 rounded-lg'

    return (
        <motion.div
            onClick={onClick}
            whileHover={{ scale: 1.05, rotateY: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={cn(
                "relative group transition-all duration-500 cursor-pointer perspective-1000",
                sizeClasses,
                active ? "ring-2 ring-gold-500 shadow-glow lg:shadow-glow-lg scale-105" : "opacity-80 hover:opacity-100",
                className
            )}
        >
            {/* Glow Effect Background */}
            <div className={cn(
                "absolute inset-0 bg-gold-400/20 blur-xl opacity-0 transition-opacity duration-500",
                active || "group-hover:opacity-100"
            )} />

            <div className="relative z-10 w-full h-full overflow-hidden bg-black/50 backdrop-blur-sm border border-gold-500/20"
                style={{ borderRadius: 'inherit' }}>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={arcano || 'Carta'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                        <span className="text-gold-500 text-2xl">🔮</span>
                    </div>
                )}

                {/* Mystic Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
            </div>
        </motion.div>
    )
}
