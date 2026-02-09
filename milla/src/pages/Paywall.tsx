import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useSubscription } from '../hooks/useSubscription'
import { track } from '../lib/analytics'
import { ROUTES } from '../lib/constants'

export default function Paywall() {
    const { user, loading: authLoading } = useAuth()
    const { isOnboardingComplete, isLoading: profileLoading } = useProfile(user?.id)
    const { isActive, isLoading: subLoading } = useSubscription(user?.id)

    useEffect(() => {
        if (user) {
            track('paywall_viewed', { user_id: user.id })
        }
    }, [user])

    if (authLoading || profileLoading || subLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
            </div>
        )
    }

    // Not logged in
    if (!user) {
        return <Navigate to={ROUTES.LOGIN} replace />
    }

    // Onboarding incomplete
    if (!isOnboardingComplete) {
        return <Navigate to={ROUTES.ONBOARDING} replace />
    }

    // Already has active subscription
    if (isActive) {
        return <Navigate to={ROUTES.PROFILE} replace />
    }

    const plans = [
        {
            id: 'quarterly',
            name: 'Trimestral',
            price: 'R$ 49,90',
            period: '/3 meses',
            description: 'Acesso completo por 3 meses',
            popular: false,
        },
        {
            id: 'yearly',
            name: 'Anual',
            price: 'R$ 149,90',
            period: '/ano',
            description: 'Economize 25%!',
            popular: true,
        },
    ]

    const handleSelectPlan = (planId: string) => {
        track('subscription_started', { user_id: user?.id, plan: planId })
        // TODO: Integrar com gateway de pagamento
        // Por enquanto, será feito via seed para desenvolvimento
        alert(`Plano ${planId} selecionado. Integração de pagamento pendente.\n\nPara testes, use o seed SQL para ativar uma subscription.`)
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-3xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-serif font-bold text-gold-200 tracking-wider">
                        Desbloqueie seu Mapa da Vida
                    </h1>
                    <p className="text-gold-100/60 mt-4 text-lg font-light">
                        Escolha um plano para acessar todas as suas interpretações personalizadas
                    </p>
                </div>

                {/* Plans */}
                <div className="grid md:grid-cols-2 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`card relative transition-all duration-300 ${plan.popular
                                ? 'border-gold-500 shadow-gold-500/20 shadow-xl scale-105 z-10 bg-mystic-900/60'
                                : 'border-gold-800/30 hover:border-gold-600/50 hover:bg-mystic-900/40'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-gradient-to-r from-gold-500 to-gold-700 text-white text-xs font-serif font-bold px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                        Mais Popular
                                    </span>
                                </div>
                            )}

                            <div className="text-center pt-4">
                                <h2 className="text-xl font-serif font-semibold text-gold-300">{plan.name}</h2>
                                <div className="mt-4 text-gold-100">
                                    <span className="text-4xl font-serif font-bold">{plan.price}</span>
                                    <span className="text-gold-400/60 font-medium">{plan.period}</span>
                                </div>
                                <p className="text-gold-200/50 mt-2 text-sm">{plan.description}</p>
                            </div>

                            {/* Features */}
                            <ul className="mt-8 space-y-3">
                                {[
                                    'Missão da Alma',
                                    'Personalidade',
                                    'Destino',
                                    'Propósito',
                                    'Manifestação Material',
                                ].map((feature) => (
                                    <li key={feature} className="flex items-center gap-2 text-gold-100/80">
                                        <svg className="w-5 h-5 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleSelectPlan(plan.id)}
                                className={`w-full mt-8 ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                Escolher {plan.name}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Disclaimer */}
                <p className="text-center text-white/40 text-sm mt-8">
                    Pagamento seguro. Cancele quando quiser.
                </p>
            </div>
        </div>
    )
}
