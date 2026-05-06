import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'

const selectStyle = { width: '100%', height: 36, padding: '0 11px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none', color: '#1e293b', boxSizing: 'border-box' }

export default function ExportPage() {
    const { role } = useAuthStore()
    const [loading, setLoading] = useState(false)
    const [filter, setFilter] = useState({ status: '', session_id: '', record_type: '' })

    const { data: sessions = [] } = useQuery({
        queryKey: ['sessions'],
        queryFn: () => api.get('/api/upload/sessions').then(r => r.data),
    })

    async function handleExport() {
        if (!filter.session_id) return toast.error('Pilih sesi terlebih dahulu')
        setLoading(true)
        try {
            const res = await api.get('/api/export/', {
                params: {
                    session_id: filter.session_id,
                    filter_status: filter.status || 'all',
                    record_type: filter.record_type || 'all',
                },
                responseType: 'blob',
            })
            const url = URL.createObjectURL(res.data)
            const a = document.createElement('a')
            a.href = url
            const tipe = filter.record_type ? `_${filter.record_type}` : ''
            a.download = `hasil_final${tipe}_sesi${filter.session_id}_${new Date().toISOString().slice(0, 10)}.xlsx`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('File berhasil didownload')
        } catch {
            toast.error('Gagal export data')
        } finally {
            setLoading(false)
        }
    }

    if (role !== 'admin' && role !== 'supervisor') return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Akses ditolak.</div>

    const selectedSession = sessions.find(s => String(s.id) === String(filter.session_id))

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>Export Excel</h1>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Download hasil verifikasi: gabungan data Match + Beda dalam format .xlsx</p>
            </div>

            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 24, maxWidth: 500 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 18 }}>Parameter Export</div>

                {/* Session selector */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 500 }}>Sesi Upload</label>
                    <select value={filter.session_id} onChange={e => setFilter(f => ({ ...f, session_id: e.target.value }))} style={selectStyle}>
                        <option value="">Pilih sesi...</option>
                        {sessions.filter(s => s.status === 'done').map(s => (
                            <option key={s.id} value={s.id}>
                                {s.batch_name ? s.batch_name : `Sesi #${s.id}`} — {s.file_match_name || s.file_beda_name} ({s.total_match?.toLocaleString() ?? 0} match, {s.total_beda?.toLocaleString() ?? 0} beda)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Summary card */}
                {selectedSession && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                        {[
                            { label: 'Total', val: selectedSession.total_records, color: '#374151', bg: '#f8fafc', border: '#e2e8f0' },
                            { label: 'Match', val: selectedSession.total_match, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                            { label: 'Beda', val: selectedSession.total_beda, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                        ].map(({ label, val, color, bg, border }) => (
                            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 7, padding: '10px 14px', textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color }}>{val?.toLocaleString() ?? '—'}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Record type filter */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 500 }}>Tipe Data</label>
                    <select value={filter.record_type} onChange={e => setFilter(f => ({ ...f, record_type: e.target.value }))} style={selectStyle}>
                        <option value="">Semua (Match + Beda)</option>
                        <option value="match">Match Saja</option>
                        <option value="beda">Beda Saja</option>
                    </select>
                </div>

                {/* Status filter */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5, fontWeight: 500 }}>Filter Status</label>
                    <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} style={selectStyle}>
                        <option value="">Semua Status</option>
                        <option value="VERIFIED_OK">Selesai / OK</option>
                        <option value="VERIFIED_REJECT">Tolak</option>
                        <option value="NEED_INVESTIGATION">Investigasi</option>
                        <option value="PENDING">Pending</option>
                    </select>
                </div>

                <button
                    onClick={handleExport}
                    disabled={loading || !filter.session_id}
                    style={{
                        background: '#0f172a', color: '#fff', border: 'none', borderRadius: 7,
                        padding: '10px 24px', cursor: loading || !filter.session_id ? 'not-allowed' : 'pointer',
                        fontWeight: 600, fontSize: 13, opacity: loading || !filter.session_id ? 0.5 : 1,
                        transition: 'opacity 0.15s', width: '100%'
                    }}>
                    {loading ? 'Mengexport...' : '⬇ Download Excel'}
                </button>

                <div style={{ marginTop: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 7, fontSize: 11, color: '#64748b', border: '1px solid #e2e8f0' }}>
                    File akan berisi kolom <strong>Tipe (Match/Beda)</strong>, <strong>Alasan Beda</strong>, dan <strong>Stand Koreksi</strong> dengan pewarnaan status otomatis.
                </div>
            </div>
        </div>
    )
}