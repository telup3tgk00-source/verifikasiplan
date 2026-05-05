import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'

const inputStyle = { width: '100%', height: 36, padding: '0 11px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box', color: '#1e293b' }

export default function UsersPage() {
    const { role } = useAuthStore()
    const qc = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'verifikator' })

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/api/users/').then(r => r.data),
    })

    const createUser = useMutation({
        mutationFn: (data) => api.post('/api/users/', data),
        onSuccess: () => {
            toast.success('User berhasil dibuat')
            qc.invalidateQueries(['users'])
            setShowForm(false)
            setForm({ username: '', password: '', full_name: '', role: 'verifikator' })
        },
        onError: () => toast.error('Gagal membuat user'),
    })

    const deleteUser = useMutation({
        mutationFn: (id) => api.delete(`/api/users/${id}`),
        onSuccess: () => { toast.success('User dihapus'); qc.invalidateQueries(['users']) },
        onError: () => toast.error('Gagal menghapus user'),
    })

    if (role !== 'admin') return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Akses ditolak.</div>

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>Kelola Akun</h1>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Manajemen akun verifikator dan admin</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        background: showForm ? '#f1f5f9' : '#0f172a', color: showForm ? '#374151' : '#fff',
                        border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 16px',
                        cursor: 'pointer', fontWeight: 500, fontSize: 12, transition: 'all 0.15s'
                    }}>
                    {showForm ? 'Batal' : 'Tambah User'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>User Baru</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                        {[['username', 'Username', 'text'], ['password', 'Password', 'password'], ['full_name', 'Nama Lengkap', 'text']].map(([key, label, type]) => (
                            <div key={key}>
                                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 500 }}>{label}</label>
                                <input
                                    type={type} value={form[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                        ))}
                        <div>
                            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 500 }}>Role</label>
                            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle}>
                                <option value="verifikator">Verifikator</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={() => createUser.mutate(form)}
                        disabled={createUser.isPending || !form.username || !form.password || !form.full_name}
                        style={{
                            background: '#0f172a', color: '#fff', border: 'none', borderRadius: 7,
                            padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                            opacity: (createUser.isPending || !form.username || !form.password) ? 0.5 : 1
                        }}>
                        {createUser.isPending ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            )}

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {isLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Memuat...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Nama Lengkap', 'Username', 'Role', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{u.full_name}</td>
                                    <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{u.username}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{
                                            padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                                            background: u.role === 'admin' ? '#eff6ff' : u.role === 'supervisor' ? '#fdf4ff' : '#f0fdf4',
                                            color: u.role === 'admin' ? '#1d4ed8' : u.role === 'supervisor' ? '#7c3aed' : '#16a34a',
                                            border: `1px solid ${u.role === 'admin' ? '#bfdbfe' : u.role === 'supervisor' ? '#e9d5ff' : '#bbf7d0'}`
                                        }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {u.username !== 'admin' && (
                                            <button
                                                onClick={() => { if (confirm(`Hapus user "${u.username}"?`)) deleteUser.mutate(u.id) }}
                                                style={{ background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                                                Hapus
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}