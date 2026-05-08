import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import NotificationBell from './NotificationBell'
import logoImg from '../assets/logo.png'

const navItems = [
    { to: '/', label: 'Dashboard', exact: true },
    { to: '/upload', label: 'Upload Match & Beda' },
    { to: '/verifikasi', label: 'Verifikasi Data' },
    { to: '/assignment', label: 'Pembagian Tugas', roles: ['admin', 'supervisor'] },
    { to: '/progress', label: 'Progres Operator', roles: ['admin', 'supervisor'] },
    { to: '/export', label: 'Export Excel', roles: ['admin', 'supervisor'] },
    { to: '/users', label: 'Pengaturan', roles: ['admin'] },
]

export default function Layout() {
    const { fullName, role, logout } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    function handleLogout() {
        if (window.confirm('Apakah Anda yakin ingin keluar?')) {
            logout()
            navigate('/login')
        }
    }

    const initials = fullName ? fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U'
    const activeLabel = navItems.find(i => i.to === location.pathname)?.label || 'Aplikasi'

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9 }}></div>
            )}
            
            {/* Sidebar */}
            <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 10 }}>
                <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={logoImg} alt="METRIK" style={{ height: 40, width: 'auto', objectFit: 'contain', marginBottom: 8 }} />
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', textTransform: 'uppercase', textAlign: 'center' }}>Sistem Verifikasi Meter KWH</div>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
                    {navItems.map(item => {
                        if (item.roles && !item.roles.includes(role)) return null
                        return (
                            <NavLink
                                key={item.to} to={item.to}
                                end={item.exact}
                                onClick={() => setIsSidebarOpen(false)}
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
                <div className="topbar-glass" style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', letterSpacing: '-0.2px' }}>{activeLabel}</div>
                    </div>
                    <NotificationBell />
                </div>

                <div className="animate-fade-in" style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
                    <Outlet />
                </div>
            </div>
        </div>
    )
}