import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../lib/constants'

export default function Login() {
    const navigate = useNavigate()
    const { signIn } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await signIn(email, password)
            navigate(ROUTES.PROFILE)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao fazer login')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="card">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-serif font-bold text-gold-200 tracking-wider">
                            Milla
                        </h1>
                        <p className="text-gold-300/60 mt-2 font-light">Entre na sua conta</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gold-300 mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gold-300 mb-1">
                                Senha
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full"
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>

                    {/* Links */}
                    <div className="mt-6 text-center space-y-2">
                        <Link
                            to={ROUTES.RESET_PASSWORD}
                            className="text-gold-400 hover:text-gold-300 text-sm transition-colors"
                        >
                            Esqueci minha senha
                        </Link>
                        <p className="text-gold-300/60 text-sm">
                            Não tem conta?{' '}
                            <Link to={ROUTES.SIGNUP} className="text-gold-400 hover:text-gold-300 font-medium transition-colors">
                                Criar conta
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
