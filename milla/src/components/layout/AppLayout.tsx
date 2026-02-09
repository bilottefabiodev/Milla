import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-mystic-950 bg-[radial-gradient(circle_at_50%_0%,#12121a_0%,#0a0a0f_100%)]">
            <Sidebar />
            <main className="ml-56 min-h-screen">
                <Outlet />
            </main>
        </div>
    )
}
