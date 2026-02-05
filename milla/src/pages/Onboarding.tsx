import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { track } from '../lib/analytics'
import { ROUTES } from '../lib/constants'

export default function Onboarding() {
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const { profile, isLoading: profileLoading, completeOnboarding, isOnboardingComplete } = useProfile(user?.id)

    const [fullName, setFullName] = useState('')
    const [birthdate, setBirthdate] = useState('')
    const [consentTerms, setConsentTerms] = useState(false)
    const [consentDisclaimer, setConsentDisclaimer] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (user) {
            track('onboarding_started', { user_id: user.id })
        }
    }, [user])

    if (authLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-milla-500"></div>
            </div>
        )
    }

    // Not logged in
    if (!user) {
        return <Navigate to={ROUTES.LOGIN} replace />
    }

    // Already completed
    if (isOnboardingComplete) {
        return <Navigate to={ROUTES.PAYWALL} replace />
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!consentTerms || !consentDisclaimer) {
            setError('Você precisa aceitar os termos para continuar')
            return
        }

        setLoading(true)

        try {
            await completeOnboarding(fullName, birthdate)
            navigate(ROUTES.PAYWALL)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar dados')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                <div className="card">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-milla-300 to-purple-300 bg-clip-text text-transparent">
                            Bem-vindo à Milla
                        </h1>
                        <p className="text-white/60 mt-2">
                            Precisamos de algumas informações para criar seu Mapa da Vida
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-white/80 mb-1">
                                Nome completo
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input-field"
                                placeholder="Seu nome completo"
                                required
                            />
                            <p className="text-xs text-white/40 mt-1">
                                Usado para personalizar suas interpretações
                            </p>
                        </div>

                        <div>
                            <label htmlFor="birthdate" className="block text-sm font-medium text-white/80 mb-1">
                                Data de nascimento
                            </label>
                            <input
                                id="birthdate"
                                type="date"
                                value={birthdate}
                                onChange={(e) => setBirthdate(e.target.value)}
                                className="input-field"
                                required
                            />
                            <p className="text-xs text-white/40 mt-1">
                                Essencial para os cálculos numerológicos
                            </p>
                        </div>

                        {/* Consents */}
                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={consentTerms}
                                    onChange={(e) => setConsentTerms(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-milla-500 focus:ring-milla-500"
                                />
                                <span className="text-sm text-white/70">
                                    Li e aceito os <a href="#" className="text-milla-400 underline">Termos de Uso</a> e a{' '}
                                    <a href="#" className="text-milla-400 underline">Política de Privacidade</a>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={consentDisclaimer}
                                    onChange={(e) => setConsentDisclaimer(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-milla-500 focus:ring-milla-500"
                                />
                                <span className="text-sm text-white/70">
                                    Entendo que Milla é uma ferramenta de autoconhecimento e entretenimento,
                                    não substituindo orientação profissional de saúde, finanças ou relacionamentos
                                </span>
                            </label>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !consentTerms || !consentDisclaimer}
                            className="btn-primary w-full"
                        >
                            {loading ? 'Salvando...' : 'Continuar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
