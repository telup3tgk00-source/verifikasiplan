import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import NotificationBell from './NotificationBell'

const navItems = [
    { to: '/', label: 'Dashboard', exact: true },
    { to: '/upload', label: 'Upload & Matching' },
    { to: '/verifikasi', label: 'Verifikasi Data' },
    { to: '/assignment', label: 'Pembagian Tugas', roles: ['admin', 'supervisor'] },
    { to: '/progress', label: 'Progres Operator', roles: ['admin', 'supervisor'] },
    { to: '/export', label: 'Export Excel', roles: ['admin', 'supervisor'] },
    { to: '/users', label: 'Kelola Akun', roles: ['admin'] },
]

export default function Layout() {
    const { fullName, role, logout } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()

    function handleLogout() {
        logout()
        navigate('/login')
    }

    const initials = fullName ? fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U'
    const activeLabel = navItems.find(i => i.to === location.pathname)?.label || 'Aplikasi'

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Sidebar */}
            <div className="sidebar" style={{ width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 10 }}>
                <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 10, height: 10, border: '2px solid white', borderRadius: 2 }}></div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>PLN Verifikasi</div>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', textTransform: 'uppercase', paddingLeft: 34 }}>Sistem Meter KWH</div>
                </div>

                <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
                    {navItems.map(item => {
                        if (item.roles && !item.roles.includes(role)) return null
                        return (
                            <NavLink
                                key={item.to} to={item.to}
                                end={item.exact}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                style={{ borderRadius: 6 }}
                            >
                                {item.label}
                            </NavLink>
                        )
                    })}
                </nav>

                <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.2))', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#60a5fa', flexShrink: 0 }}>
                        {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{role}</div>
                    </div>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11, fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#ef4444'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.4)'} title="Logout">Keluar</button>
                </div>
            </div>

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                {/* Topbar */}
                <div className="topbar-glass" style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', letterSpacing: '-0.2px' }}>{activeLabel}</div>
                    <NotificationBell />
                </div>

                <div className="animate-fade-in" style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
                    <Outlet />
                </div>
            </div>
        </div>
    )
}