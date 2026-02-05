import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../lib/constants'

export default function ResetPassword() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { resetPassword, updatePassword } = useAuth()

    const [email, setEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    // Check if we have a token in URL (recovery mode)
    const hasToken = !!searchParams.get('type')

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            await resetPassword(email)
            setSuccess('Email enviado! Verifique sua caixa de entrada.')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao enviar email')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem')
            return
        }

        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres')
            return
        }

        setLoading(true)

        try {
            await updatePassword(newPassword)
            navigate(ROUTES.LOGIN)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao atualizar senha')
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
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-milla-300 to-purple-300 bg-clip-text text-transparent">
                            Milla
                        </h1>
                        <p className="text-white/60 mt-2">
                            {hasToken ? 'Defina sua nova senha' : 'Recuperar senha'}
                        </p>
                    </div>

                    {/* Request Reset Form */}
                    {!hasToken && (
                        <form onSubmit={handleRequestReset} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
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

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm">
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full"
                            >
                                {loading ? 'Enviando...' : 'Enviar email de recuperação'}
                            </button>
                        </form>
                    )}

                    {/* Update Password Form */}
                    {hasToken && (
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-white/80 mb-1">
                                    Nova senha
                                </label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="input-field"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-1">
                                    Confirmar nova senha
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                                {loading ? 'Atualizando...' : 'Atualizar senha'}
                            </button>
                        </form>
                    )}

                    {/* Back to login */}
                    <p className="mt-6 text-center text-white/60 text-sm">
                        <Link to={ROUTES.LOGIN} className="text-milla-400 hover:text-milla-300">
                            Voltar ao login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
