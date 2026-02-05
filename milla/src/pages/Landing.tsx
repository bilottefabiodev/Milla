import { Link } from 'react-router-dom'
import { ROUTES } from '../lib/constants'

export default function Landing() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Hero Section */}
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Logo/Title */}
                    <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-milla-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                        Milla
                    </h1>

                    <p className="text-xl md:text-2xl text-white/80 mb-4">
                        Seu Mapa da Vida
                    </p>

                    <p className="text-lg text-white/60 mb-12 max-w-2xl mx-auto">
                        Descubra sua essência através da Numerologia, Tarot e Psicologia.
                        Uma jornada de autoconhecimento única e personalizada.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to={ROUTES.SIGNUP} className="btn-primary text-lg px-8 py-4">
                            Começar Agora
                        </Link>
                        <Link to={ROUTES.LOGIN} className="btn-secondary text-lg px-8 py-4">
                            Já tenho conta
                        </Link>
                    </div>

                    {/* Features */}
                    <div className="mt-20 grid md:grid-cols-3 gap-8">
                        <div className="card-glow">
                            <div className="text-4xl mb-4">🌟</div>
                            <h3 className="text-xl font-semibold mb-2">Missão da Alma</h3>
                            <p className="text-white/60">
                                Descubra seu propósito de vida através da numerologia
                            </p>
                        </div>

                        <div className="card-glow">
                            <div className="text-4xl mb-4">🃏</div>
                            <h3 className="text-xl font-semibold mb-2">Arcanos Maiores</h3>
                            <p className="text-white/60">
                                Interpretações profundas baseadas no Tarot
                            </p>
                        </div>

                        <div className="card-glow">
                            <div className="text-4xl mb-4">✨</div>
                            <h3 className="text-xl font-semibold mb-2">Orientação Prática</h3>
                            <p className="text-white/60">
                                Conselhos acionáveis para sua evolução
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-white/40 text-sm">
                <p>
                    Milla é uma ferramenta de autoconhecimento e entretenimento.
                    <br />
                    Não substitui orientação profissional.
                </p>
            </footer>
        </div>
    )
}
