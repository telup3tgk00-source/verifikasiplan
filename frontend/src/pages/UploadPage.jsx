import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'

const inputStyle = { width: '100%', height: 36, padding: '0 11px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box', color: '#1e293b' }

export default function UploadPage() {
    const { role } = useAuthStore()
    const qc = useQueryClient()
    const [fileAI, setFileAI] = useState(null)
    const [filePetugas, setFilePetugas] = useState(null)
    const refAI = useRef()
    const refPetugas = useRef()

    const { data: sessions = [] } = useQuery({
        queryKey: ['sessions'],
        queryFn: () => api.get('/api/upload/sessions').then(r => r.data),
    })

    const upload = useMutation({
        mutationFn: () => {
            const fd = new FormData()
            fd.append('file_ai', fileAI)
            fd.append('file_petugas', filePetugas)
            return api.post('/api/upload/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        },
        onSuccess: () => {
            toast.success('File berhasil diupload, sedang diproses')
            qc.invalidateQueries(['sessions'])
            qc.invalidateQueries(['dashboard-stats'])
            setFileAI(null); setFilePetugas(null)
            if (refAI.current) refAI.current.value = ''
            if (refPetugas.current) refPetugas.current.value = ''
        },
        onError: () => toast.error('Gagal upload file'),
    })

    const deleteSession = useMutation({
        mutationFn: (id) => api.delete(`/api/upload/sessions/${id}`),
        onSuccess: () => { toast.success('Sesi dihapus'); qc.invalidateQueries(['sessions']); qc.invalidateQueries(['dashboard-stats']) },
        onError: () => toast.error('Gagal hapus sesi'),
    })

    if (role !== 'admin') return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Akses ditolak.</div>

    const canUpload = fileAI && filePetugas && !upload.isPending

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>Upload & Matching</h1>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Upload dua file Excel untuk dicocokkan berdasarkan ID Pelanggan</p>
            </div>

            {/* Upload card */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Upload File Baru</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    {[
                        { label: 'File Hasil AI', ref: refAI, set: setFileAI, val: fileAI },
                        { label: 'File Input Petugas', ref: refPetugas, set: setFilePetugas, val: filePetugas },
                    ].map(({ label, ref, set, val }) => (
                        <div key={label}
                            onClick={() => ref.current.click()}
                            style={{
                                border: `1.5px dashed ${val ? '#86efac' : '#cbd5e1'}`,
                                borderRadius: 8, padding: '20px 16px', textAlign: 'center',
                                cursor: 'pointer', background: val ? '#f0fdf4' : '#f8fafc',
                                transition: 'all 0.15s'
                            }}
                        >
                            <input type="file" accept=".xlsx,.xls" ref={ref} style={{ display: 'none' }} onChange={e => set(e.target.files[0])} />
                            <div style={{ width: 32, height: 32, borderRadius: 6, background: val ? '#dcfce7' : '#f1f5f9', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 14, height: 14, border: `2px solid ${val ? '#16a34a' : '#94a3b8'}`, borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: val ? '#16a34a' : '#374151', marginBottom: 2 }}>{val ? val.name : label}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{val ? `${(val.size / 1024).toFixed(1)} KB` : 'Klik untuk pilih .xlsx'}</div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => upload.mutate()}
                    disabled={!canUpload}
                    style={{
                        background: canUpload ? '#0f172a' : '#cbd5e1',
                        color: '#fff', border: 'none', borderRadius: 7,
                        padding: '10px 24px', cursor: canUpload ? 'pointer' : 'not-allowed',
                        fontWeight: 600, fontSize: 13, transition: 'background 0.15s'
                    }}
                >
                    {upload.isPending ? 'Memproses...' : 'Upload & Proses'}
                </button>
            </div>

            {/* Session history */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                    Riwayat Sesi Upload
                </div>
                {!sessions.length ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Belum ada sesi upload.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Sesi', 'File AI', 'File Petugas', 'Total', 'Status', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map(s => (
                                <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0f172a' }}>#{s.id}</td>
                                    <td style={{ padding: '10px 16px', color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.file_ai_name}</td>
                                    <td style={{ padding: '10px 16px', color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.file_petugas_name}</td>
                                    <td style={{ padding: '10px 16px', color: '#374151' }}>{s.total_records?.toLocaleString() || '—'}</td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{
                                            padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                                            background: s.status === 'done' ? '#f0fdf4' : s.status === 'processing' ? '#fffbeb' : '#fef2f2',
                                            color: s.status === 'done' ? '#16a34a' : s.status === 'processing' ? '#d97706' : '#dc2626',
                                            border: `1px solid ${s.status === 'done' ? '#bbf7d0' : s.status === 'processing' ? '#fde68a' : '#fecaca'}`
                                        }}>
                                            {s.status === 'done' ? 'Selesai' : s.status === 'processing' ? 'Diproses' : s.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <button
                                            onClick={() => { if (confirm('Hapus sesi ini? Data record akan dihapus.')) deleteSession.mutate(s.id) }}
                                            style={{ background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}
                                        >
                                            Hapus
                                        </button>
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