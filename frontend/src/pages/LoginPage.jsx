import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'
import { toast } from 'sonner'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const { setAuth } = useAuthStore()
    const navigate = useNavigate()

    async function handleLogin(e) {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await api.post('/api/auth/login', { username, password })
            setAuth(res.data.access_token, res.data.role, res.data.full_name)
            toast.success(`Selamat datang, ${res.data.full_name}!`)
            navigate('/')
        } catch {
            toast.error('Username atau password salah!')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-mesh" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="animate-slide-up" style={{ width: 380, position: 'relative', zIndex: 10 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: 16, marginBottom: 20, border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                        <div style={{ width: 24, height: 24, border: '3px solid #60a5fa', borderRadius: 4, transform: 'rotate(15deg)' }} />
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', margin: '0 0 8px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>PLN Verification</h1>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Sistem Verifikasi Meter KWH</p>
                </div>

                {/* Card */}
                <div className="glass" style={{ borderRadius: 16, padding: '36px 32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: 8, letterSpacing: '0.3px' }}>Username</label>
                            <input
                                type="text" value={username} onChange={e => setUsername(e.target.value)}
                                placeholder="Masukkan username"
                                style={{ width: '100%', height: 44, padding: '0 14px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 8, outline: 'none', fontSize: 14, color: '#1e293b', boxSizing: 'border-box', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.2)'; }}
                                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.8)'; e.target.style.background = 'rgba(255,255,255,0.6)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: 28 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: 8, letterSpacing: '0.3px' }}>Password</label>
                            <input
                                type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="Masukkan password"
                                style={{ width: '100%', height: 44, padding: '0 14px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 8, outline: 'none', fontSize: 14, color: '#1e293b', boxSizing: 'border-box', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
                                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.2)'; }}
                                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.8)'; e.target.style.background = 'rgba(255,255,255,0.6)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
                                required
                            />
                        </div>
                        <button
                            type="submit" disabled={loading}
                            className="btn-primary"
                            style={{ width: '100%', height: 44, border: 'none', borderRadius: 8, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, letterSpacing: '0.2px', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Memproses...' : 'Masuk ke Aplikasi'}
                        </button>
                    </form>
                </div>

                {/* Hint */}
                <div className="delay-200 animate-fade-in" style={{ marginTop: 24, padding: '12px', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', borderRadius: 8, fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Default: <span style={{ fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>admin</span> / <span style={{ fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>admin123</span>
                </div>
            </div>
        </div>
    )
}