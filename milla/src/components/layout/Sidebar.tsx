import { NavLink, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'

// Icons as simple SVG components
const MapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
)

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
)

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
)

const HelpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
)

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
)

interface NavItemProps {
    to: string
    icon: React.ReactNode
    label: string
}

function NavItem({ to, icon, label }: NavItemProps) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-gradient-to-r from-milla-500/20 to-purple-500/20 text-white border-l-4 border-milla-400'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
            }
        >
            {icon}
            <span className="font-medium">{label}</span>
        </NavLink>
    )
}

export default function Sidebar() {
    const navigate = useNavigate()

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate(ROUTES.LANDING)
    }

    return (
        <aside className="fixed left-0 top-0 h-screen w-56 bg-black/30 backdrop-blur-xl border-r border-white/10 flex flex-col z-50">
            {/* Logo */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    <span className="text-xl font-bold bg-gradient-to-r from-milla-400 to-purple-400 bg-clip-text text-transparent">
                        Milla
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                <NavItem to={ROUTES.MAPA} icon={<MapIcon />} label="Mapa da Vida" />
                <NavItem to={ROUTES.PROFILE} icon={<UserIcon />} label="Perfil" />
            </nav>

            {/* Bottom section */}
            <div className="p-4 border-t border-white/10 space-y-2">
                <button
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl 
                     bg-gradient-to-r from-milla-500/30 to-purple-500/30 
                     text-white hover:from-milla-500/40 hover:to-purple-500/40 
                     transition-all duration-200"
                >
                    <SparklesIcon />
                    <span className="font-medium">Premium</span>
                </button>

                <button
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl 
                     text-white/50 hover:text-white hover:bg-white/5 
                     transition-all duration-200"
                >
                    <HelpIcon />
                    <span className="font-medium">Ajuda</span>
                </button>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl 
                     text-red-400/70 hover:text-red-400 hover:bg-red-500/10 
                     transition-all duration-200"
                >
                    <LogoutIcon />
                    <span className="font-medium">Sair</span>
                </button>
            </div>
        </aside>
    )
}
