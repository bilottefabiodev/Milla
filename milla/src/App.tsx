import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { useSubscription } from './hooks/useSubscription'
import { ROUTES } from './lib/constants'

// Layout
import { AppLayout } from './components/layout'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ResetPassword from './pages/ResetPassword'
import Onboarding from './pages/Onboarding'
import Paywall from './pages/Paywall'
import MapaVida from './pages/MapaVida'
import Profile from './pages/Profile'

// Loading component
function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-milla-500"></div>
        </div>
    )
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth()
    const { isLoading: profileLoading, isOnboardingComplete } = useProfile(user?.id)
    const { isActive, isLoading: subLoading } = useSubscription(user?.id)

    if (authLoading || profileLoading || subLoading) {
        return <LoadingScreen />
    }

    // Not logged in
    if (!user) {
        return <Navigate to={ROUTES.LOGIN} replace />
    }

    // Onboarding incomplete
    if (!isOnboardingComplete) {
        return <Navigate to={ROUTES.ONBOARDING} replace />
    }

    // No active subscription
    if (!isActive) {
        return <Navigate to={ROUTES.PAYWALL} replace />
    }

    return <>{children}</>
}

// Auth route wrapper (redirect if already logged in)
function AuthRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const { isOnboardingComplete } = useProfile(user?.id)
    const { isActive } = useSubscription(user?.id)

    if (loading) {
        return <LoadingScreen />
    }

    if (user) {
        if (!isOnboardingComplete) {
            return <Navigate to={ROUTES.ONBOARDING} replace />
        }
        if (!isActive) {
            return <Navigate to={ROUTES.PAYWALL} replace />
        }
        return <Navigate to={ROUTES.MAPA} replace />
    }

    return <>{children}</>
}

export default function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path={ROUTES.LANDING} element={<Landing />} />

            {/* Auth routes */}
            <Route path={ROUTES.LOGIN} element={
                <AuthRoute><Login /></AuthRoute>
            } />
            <Route path={ROUTES.SIGNUP} element={
                <AuthRoute><Signup /></AuthRoute>
            } />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />

            {/* Onboarding (requires auth, but not subscription) */}
            <Route path={ROUTES.ONBOARDING} element={<Onboarding />} />

            {/* Paywall (requires auth + onboarding) */}
            <Route path={ROUTES.PAYWALL} element={<Paywall />} />

            {/* Protected routes with sidebar layout */}
            <Route element={
                <ProtectedRoute>
                    <AppLayout />
                </ProtectedRoute>
            }>
                <Route path={ROUTES.MAPA} element={<MapaVida />} />
                <Route path={ROUTES.PROFILE} element={<Profile />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
        </Routes>
    )
}
