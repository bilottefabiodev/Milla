import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { cn } from '../../lib/utils'

interface AudioPlayerProps {
    audioUrl: string;
    duration?: number | null;
    className?: string;
}

export function AudioPlayer({ audioUrl, duration, className }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [totalDuration, setTotalDuration] = useState(duration || 0)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
        const handleLoadedMetadata = () => setTotalDuration(audio.duration)
        const handleEnded = () => setIsPlaying(false)

        audio.addEventListener('timeupdate', handleTimeUpdate)
        audio.addEventListener('loadedmetadata', handleLoadedMetadata)
        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate)
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
            audio.removeEventListener('ended', handleEnded)
        }
    }, [])

    const togglePlay = () => {
        if (!audioRef.current) return

        if (isPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const toggleMute = () => {
        if (!audioRef.current) return
        audioRef.current.muted = !isMuted
        setIsMuted(!isMuted)
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return
        const time = parseFloat(e.target.value)
        audioRef.current.currentTime = time
        setCurrentTime(time)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

    return (
        <div className={cn(
            "flex items-center gap-4 p-4 rounded-xl bg-mystic-900/50 border border-gold-900/20",
            className
        )}>
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            {/* Play/Pause Button */}
            <motion.button
                onClick={togglePlay}
                whileTap={{ scale: 0.95 }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/30 transition-colors"
            >
                {isPlaying ? (
                    <Pause className="w-5 h-5 text-gold-200" />
                ) : (
                    <Play className="w-5 h-5 text-gold-200 ml-0.5" />
                )}
            </motion.button>

            {/* Progress Bar */}
            <div className="flex-1 flex flex-col gap-1">
                <input
                    type="range"
                    min={0}
                    max={totalDuration}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-mystic-800"
                    style={{
                        background: `linear-gradient(to right, rgb(212 175 55 / 0.6) 0%, rgb(212 175 55 / 0.6) ${progress}%, rgb(23 20 33) ${progress}%, rgb(23 20 33) 100%)`,
                    }}
                />
                <div className="flex justify-between text-xs text-gold-400/60">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(totalDuration)}</span>
                </div>
            </div>

            {/* Mute Button */}
            <button
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-gold-500/10 transition-colors"
            >
                {isMuted ? (
                    <VolumeX className="w-5 h-5 text-gold-400/60" />
                ) : (
                    <Volume2 className="w-5 h-5 text-gold-400/60" />
                )}
            </button>
        </div>
    )
}
