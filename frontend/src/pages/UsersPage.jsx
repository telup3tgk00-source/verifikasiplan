import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'

const inputStyle = { width: '100%', height: 36, padding: '0 11px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box', color: '#1e293b' }

export default function UsersPage() {
    useEffect(() => { document.title = "Pengaturan | METRIK" }, [])

    const { role } = useAuthStore()
    const qc = useQueryClient()
    const [activeTab, setActiveTab] = useState('akun') // 'akun' | 'alasan'
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'verifikator', unit_penugasan: '' })
    const [reasonForm, setReasonForm] = useState({ value: '', label: '', sort_order: 0 })
    const [showReasonForm, setShowReasonForm] = useState(false)
    const [dialog, setDialog] = useState(null)

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/api/users/').then(r => r.data),
    })

    const { data: reasons = [], isLoading: isLoadingReasons } = useQuery({
        queryKey: ['reasons'],
        queryFn: () => api.get('/api/settings/reasons').then(r => r.data),
    })

    const createUser = useMutation({
        mutationFn: (data) => api.post('/api/users/', data),
        onSuccess: () => {
            toast.success('User berhasil dibuat')
            qc.invalidateQueries(['users'])
            setShowForm(false)
            setForm({ username: '', password: '', full_name: '', role: 'verifikator', unit_penugasan: '' })
        },
        onError: () => toast.error('Gagal membuat user'),
    })

    const deleteUser = useMutation({
        mutationFn: (id) => api.delete(`/api/users/${id}`),
        onSuccess: () => { toast.success('User dihapus'); qc.invalidateQueries(['users']) },
        onError: () => toast.error('Gagal menghapus user'),
    })

    const resetPassword = useMutation({
        mutationFn: ({ id, new_password }) => api.put(`/api/users/${id}/password`, { new_password }),
        onSuccess: () => toast.success('Password berhasil diubah'),
        onError: () => toast.error('Gagal mengubah password'),
    })

    const editUser = useMutation({
        mutationFn: ({ id, ...data }) => api.patch(`/api/users/${id}`, data),
        onSuccess: () => { toast.success('Data user diperbarui'); qc.invalidateQueries(['users']) },
        onError: () => toast.error('Gagal memperbarui user'),
    })

    const createReason = useMutation({
        mutationFn: (data) => api.post('/api/settings/reasons', data),
        onSuccess: () => {
            toast.success('Alasan berhasil ditambahkan')
            qc.invalidateQueries(['reasons'])
            setShowReasonForm(false)
            setReasonForm({ value: '', label: '', sort_order: 0 })
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Gagal menambah alasan'),
    })

    const deleteReason = useMutation({
        mutationFn: (id) => api.delete(`/api/settings/reasons/${id}`),
        onSuccess: () => { toast.success('Alasan dihapus'); qc.invalidateQueries(['reasons']) },
        onError: () => toast.error('Gagal menghapus alasan'),
    })

    if (role !== 'admin') return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Akses ditolak.</div>

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {dialog && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 10, width: 400, maxWidth: '90%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#0f172a' }}>{dialog.title}</h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{dialog.message}</p>
                        
                        {dialog.type === 'prompt' && (
                            <input
                                autoFocus
                                defaultValue={dialog.defaultValue}
                                placeholder={dialog.placeholder}
                                id="dialog-input"
                                style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, marginBottom: 20, boxSizing: 'border-box', outline: 'none' }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        dialog.onConfirm(e.target.value)
                                        setDialog(null)
                                    }
                                }}
                            />
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setDialog(null)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Batal</button>
                            <button 
                                onClick={() => {
                                    const val = dialog.type === 'prompt' ? document.getElementById('dialog-input').value : true;
                                    dialog.onConfirm(val)
                                    setDialog(null)
                                }} 
                                style={{ padding: '8px 16px', background: dialog.danger ? '#ef4444' : '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                                Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>Pengaturan Sistem</h1>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Kelola akun dan opsi konfigurasi sistem</p>
                </div>
                <button
                    onClick={() => activeTab === 'akun' ? setShowForm(!showForm) : setShowReasonForm(!showReasonForm)}
                    style={{
                        background: (activeTab === 'akun' ? showForm : showReasonForm) ? '#f1f5f9' : '#0f172a', 
                        color: (activeTab === 'akun' ? showForm : showReasonForm) ? '#374151' : '#fff',
                        border: '1px solid #e2e8f0', borderRadius: 7, padding: '8px 16px',
                        cursor: 'pointer', fontWeight: 500, fontSize: 12, transition: 'all 0.15s'
                    }}>
                    {(activeTab === 'akun' ? showForm : showReasonForm) ? 'Batal' : (activeTab === 'akun' ? 'Tambah User' : 'Tambah Alasan')}
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
                <div onClick={() => setActiveTab('akun')} style={{ paddingBottom: 10, cursor: 'pointer', fontSize: 13, fontWeight: activeTab === 'akun' ? 600 : 500, color: activeTab === 'akun' ? '#0f172a' : '#64748b', borderBottom: activeTab === 'akun' ? '2px solid #0f172a' : '2px solid transparent' }}>Kelola Akun</div>
                <div onClick={() => setActiveTab('alasan')} style={{ paddingBottom: 10, cursor: 'pointer', fontSize: 13, fontWeight: activeTab === 'alasan' ? 600 : 500, color: activeTab === 'alasan' ? '#0f172a' : '#64748b', borderBottom: activeTab === 'alasan' ? '2px solid #0f172a' : '2px solid transparent' }}>Alasan Perbedaan</div>
            </div>

            {activeTab === 'akun' ? (
                <>
                    {/* Form */}
            {showForm && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>User Baru</div>
                    <div className="grid-upload">
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
                        <div>
                            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 500 }}>Unit Penugasan (Opsional)</label>
                            <input
                                type="text" value={form.unit_penugasan} placeholder="Cth: 17100, 17110"
                                onChange={e => setForm(f => ({ ...f, unit_penugasan: e.target.value }))}
                                style={inputStyle}
                            />
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
                    <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    {['Nama Lengkap', 'Username', 'Role', 'Unit', ''].map(h => (
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
                                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 11, fontWeight: 500 }}>
                                            {u.unit_penugasan || '—'}
                                        </td>
                                        <td style={{ padding: '12px 16px', display: 'flex', gap: 6 }}>
                                            <button
                                                onClick={() => setDialog({
                                                    type: 'prompt', title: 'Atur Unit Penugasan',
                                                    message: `Masukkan Unit untuk user "${u.username}":\n(Pisahkan dengan koma jika lebih dari 1, contoh: 17100, 17110)`,
                                                    defaultValue: u.unit_penugasan || '',
                                                    onConfirm: (val) => { if(val !== null) editUser.mutate({ id: u.id, unit_penugasan: val }) }
                                                })}
                                                style={{ background: 'none', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                                                Set Unit
                                            </button>
                                            <button
                                                onClick={() => setDialog({
                                                    type: 'prompt', title: 'Ubah Sandi',
                                                    message: `Masukkan password baru untuk user "${u.username}":`,
                                                    onConfirm: (val) => { if(val) resetPassword.mutate({ id: u.id, new_password: val }) }
                                                })}
                                                style={{ background: 'none', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                                                Ubah Sandi
                                            </button>
                                            {u.username !== 'admin' && (
                                                <button
                                                    onClick={() => setDialog({
                                                        type: 'confirm', title: 'Hapus User', danger: true,
                                                        message: `Apakah Anda yakin ingin menghapus user "${u.username}"?`,
                                                        onConfirm: () => deleteUser.mutate(u.id)
                                                    })}
                                                    style={{ background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                                                    Hapus
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
                </>
            ) : (
                <>
                    {showReasonForm && (
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, marginBottom: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Opsi Alasan Baru</div>
                            <div className="grid-upload-3">
                                <div>
                                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 500 }}>Key / Value (unik, tanpa spasi)</label>
                                    <input placeholder="cth: meter_rusak" type="text" value={reasonForm.value} onChange={e => setReasonForm(f => ({ ...f, value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 500 }}>Label Teks (yang tampil di dropdown)</label>
                                    <input placeholder="cth: Meteran Rusak Total" type="text" value={reasonForm.label} onChange={e => setReasonForm(f => ({ ...f, label: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 500 }}>Urutan (Angka)</label>
                                    <input type="number" value={reasonForm.sort_order} onChange={e => setReasonForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                                </div>
                            </div>
                            <button
                                onClick={() => createReason.mutate(reasonForm)}
                                disabled={createReason.isPending || !reasonForm.value || !reasonForm.label}
                                style={{
                                    background: '#0f172a', color: '#fff', border: 'none', borderRadius: 7,
                                    padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                                    opacity: (createReason.isPending || !reasonForm.value || !reasonForm.label) ? 0.5 : 1
                                }}>
                                {createReason.isPending ? 'Menyimpan...' : 'Simpan Alasan'}
                            </button>
                        </div>
                    )}

                    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        {isLoadingReasons ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Memuat...</div>
                        ) : (
                            <div className="table-responsive">
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            {['Urutan', 'Key Value', 'Label Teks', 'Status', ''].map(h => (
                                                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reasons.map(r => (
                                            <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a', width: 60, textAlign: 'center' }}>{r.sort_order}</td>
                                                <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{r.value}</td>
                                                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{r.label}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: r.is_active ? '#f0fdf4' : '#f1f5f9', color: r.is_active ? '#16a34a' : '#64748b', border: `1px solid ${r.is_active ? '#bbf7d0' : '#e2e8f0'}` }}>
                                                        {r.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <button onClick={() => setDialog({
                                                        type: 'confirm', title: 'Hapus Alasan', danger: true,
                                                        message: `Hapus alasan "${r.label}"?`,
                                                        onConfirm: () => deleteReason.mutate(r.id)
                                                    })} style={{ background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}