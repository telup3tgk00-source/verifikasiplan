import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'

const STATUS_LABEL = {
    PENDING: 'Pending',
    VERIFIED_OK: 'Selesai',
    VERIFIED_REJECT: 'Tolak',
    NEED_INVESTIGATION: 'Investigasi'
}
const STATUS_STYLE = {
    PENDING:             { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
    VERIFIED_OK:         { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    VERIFIED_REJECT:     { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    NEED_INVESTIGATION:  { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
}

const REASON_OPTIONS = [
    { value: '', label: '— Pilih Alasan —' },
    { value: 'stand_aneh',       label: 'Stand Aneh / Tidak Wajar' },
    { value: 'biller_asal_foto', label: 'Biller Asal Foto' },
    { value: 'ai_salah_baca',    label: 'AI Salah Baca (Koreksi Stand)' },
    { value: 'beda_meter',       label: 'Beda Meter / Ganti Meter' },
    { value: 'lainnya',          label: 'Lainnya' },
]

function Badge({ status }) {
    const s = STATUS_STYLE[status] || STATUS_STYLE.PENDING
    return (
        <span style={{ padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            {STATUS_LABEL[status] || status}
        </span>
    )
}

const inputStyle = { height: 34, padding: '0 11px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, outline: 'none', background: '#fff', color: '#1e293b' }
const btnBase = { border: 'none', borderRadius: 6, padding: '9px 0', cursor: 'pointer', fontWeight: 600, fontSize: 12, width: '100%' }

export default function VerifikasiPage() {
    const { user, role } = useAuthStore()
    const qc = useQueryClient()
    const [page, setPage] = useState(1)
    const [filter, setFilter] = useState({ status: '', search: '', anomalyOnly: false, merekMismatch: false })
    const [selected, setSelected] = useState(null)
    const [note, setNote] = useState('')
    const [reasonType, setReasonType] = useState('')
    const [correctedStand, setCorrectedStand] = useState('')

    const { data: records = [], isLoading } = useQuery({
        queryKey: ['records', page, filter],
        queryFn: () => api.get('/api/records/', {
            params: {
                skip: (page - 1) * 20,
                limit: 20,
                record_type: 'beda',   // Verifikasi hanya untuk data BEDA
                status: filter.status || undefined,
                search: filter.search || undefined,
                anomaly_only: filter.anomalyOnly,
                merek_mismatch: filter.merekMismatch,
                assigned_to: role === 'verifikator' ? user?.id : undefined
            }
        }).then(r => r.data),
    })

    const verifyMutation = useMutation({
        mutationFn: ({ id, status, note, reasonType, correctedStand }) => api.patch(`/api/records/${id}`, {
            status,
            catatan: note,
            reason_type: reasonType || null,
            corrected_stand: correctedStand ? parseFloat(correctedStand) : null,
        }),
        onSuccess: () => {
            toast.success('Data berhasil disimpan')
            qc.invalidateQueries(['records'])
            qc.invalidateQueries(['dashboard-stats'])
            setSelected(null)
            setNote('')
            setReasonType('')
            setCorrectedStand('')
        },
        onError: () => toast.error('Gagal menyimpan'),
    })

    const openModal = (r) => {
        setSelected(r)
        setNote(r.catatan || '')
        setReasonType(r.reason_type || '')
        setCorrectedStand(r.corrected_stand ?? '')
    }

    const handleVerify = (status) => {
        if (!reasonType) return toast.error('Pilih alasan terlebih dahulu')
        verifyMutation.mutate({ id: selected.id, status, note, reasonType, correctedStand })
    }

    const currentSelisih = selected && reasonType === 'ai_salah_baca' && correctedStand !== '' && selected.stand_petugas != null 
        ? Number(correctedStand) - Number(selected.stand_petugas) 
        : (selected?.selisih ?? 0);
        
    const isSelisihZero = currentSelisih === 0;
    const selisihBg = isSelisihZero ? '#f0fdf4' : '#fef2f2';
    const selisihBorder = isSelisihZero ? '#bbf7d0' : '#fecaca';
    const selisihColor = isSelisihZero ? '#16a34a' : '#dc2626';

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {/* Header + Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>Verifikasi Data BEDA</h1>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Kerjakan data yang AI ≠ Biller — isi alasan dan koreksi jika perlu</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={filter.anomalyOnly} onChange={e => setFilter(f => ({ ...f, anomalyOnly: e.target.checked }))} style={{ accentColor: '#3b82f6' }} />
                        Anomali
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={filter.merekMismatch} onChange={e => setFilter(f => ({ ...f, merekMismatch: e.target.checked }))} style={{ accentColor: '#3b82f6' }} />
                        Merek Beda
                    </label>
                    <input
                        placeholder="Cari ID Pelanggan..."
                        value={filter.search}
                        onChange={e => { setFilter(f => ({ ...f, search: e.target.value })); setPage(1) }}
                        style={{ ...inputStyle, width: 200 }}
                    />
                    <select
                        value={filter.status}
                        onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1) }}
                        style={{ ...inputStyle, paddingLeft: 10 }}
                    >
                        <option value="">Semua Status</option>
                        {Object.entries(STATUS_LABEL).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Modal */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Kerjakan Data BEDA</h2>
                                <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>ID Pelanggan: <strong>{selected.id_pelanggan}</strong></p>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>

                        {/* Side-by-side data */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            {[
                                { title: 'Hasil AI', bg: '#f8fafc', border: '#e2e8f0', stand: selected.stand_ai, merek: selected.merek_ai, tipe: selected.tipe_ai },
                                { title: 'Stand Biller', bg: '#fffbeb', border: '#fde68a', stand: selected.stand_petugas, merek: selected.merek_petugas, tipe: selected.tipe_petugas },
                            ].map(col => (
                                <div key={col.title} style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 8, padding: 14 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>{col.title}</div>
                                    {[['Stand KWH', col.stand], ['Merek', col.merek], ['Tipe', col.tipe]].map(([k, v]) => (
                                        <div key={k} style={{ marginBottom: 8 }}>
                                            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>{k}</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                                                {k === 'Stand KWH' && col.title === 'Hasil AI' && reasonType === 'ai_salah_baca' && correctedStand !== '' ? (
                                                    <span>
                                                        <span style={{ color: '#16a34a' }}>{correctedStand}</span>
                                                        <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>{v ?? '—'}</span>
                                                    </span>
                                                ) : (
                                                    v ?? '—'
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Selisih */}
                        <div style={{ background: selisihBg, border: `1px solid ${selisihBorder}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                            <div>
                                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Selisih Stand</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: selisihColor, transition: 'color 0.2s' }}>
                                    {currentSelisih} KWH
                                </div>
                            </div>
                            {selected.is_anomaly && (
                                <span style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 5, fontSize: 11, fontWeight: 600 }}>
                                    ⚠ Anomali Tinggi
                                </span>
                            )}
                        </div>

                        {/* Alasan */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                Alasan Perbedaan <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                value={reasonType}
                                onChange={e => setReasonType(e.target.value)}
                                style={{ ...inputStyle, width: '100%', height: 36, paddingLeft: 11, boxSizing: 'border-box' }}
                            >
                                {REASON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        {/* Stand koreksi (muncul jika ai_salah_baca) */}
                        {reasonType === 'ai_salah_baca' && (
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                    Stand Koreksi (KWH)
                                </label>
                                <input
                                    type="number"
                                    value={correctedStand}
                                    onChange={e => setCorrectedStand(e.target.value)}
                                    placeholder="Masukkan stand yang benar..."
                                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                />
                            </div>
                        )}

                        {/* Catatan */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                                Catatan <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opsional)</span>
                            </label>
                            <textarea
                                value={note} onChange={e => setNote(e.target.value)}
                                rows={2}
                                placeholder="Catatan tambahan..."
                                style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 7, fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box', color: '#1e293b' }}
                            />
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <button onClick={() => handleVerify('VERIFIED_OK')} disabled={verifyMutation.isPending}
                                style={{ ...btnBase, background: '#16a34a', color: '#fff' }}>✓ Selesai / OK</button>
                            <button onClick={() => handleVerify('NEED_INVESTIGATION')} disabled={verifyMutation.isPending}
                                style={{ ...btnBase, background: '#d97706', color: '#fff' }}>⚑ Perlu Investigasi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {isLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Memuat data...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['ID Pelanggan', 'Stand AI', 'Stand Biller', 'Selisih', 'Merek AI / Biller', 'Alasan', 'Status', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0f172a' }}>{r.id_pelanggan}</td>
                                    <td style={{ padding: '10px 16px', color: '#374151' }}>
                                        {r.corrected_stand != null ? (
                                            <span>
                                                <span style={{ color: '#16a34a', fontWeight: 600 }}>{r.corrected_stand}</span>
                                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>{r.stand_ai}</span>
                                            </span>
                                        ) : (r.stand_ai ?? '—')}
                                    </td>
                                    <td style={{ padding: '10px 16px', color: '#374151' }}>{r.stand_petugas ?? '—'}</td>
                                    <td style={{ padding: '10px 16px', fontWeight: 600, color: (r.corrected_stand != null && r.stand_petugas != null ? Number(r.corrected_stand) - Number(r.stand_petugas) : (r.selisih || 0)) !== 0 ? '#dc2626' : '#16a34a' }}>
                                        {r.corrected_stand != null && r.stand_petugas != null ? Number(r.corrected_stand) - Number(r.stand_petugas) : (r.selisih ?? '—')}
                                    </td>
                                    <td style={{ padding: '10px 16px', color: '#64748b' }}>{r.merek_ai || '—'} / {r.merek_petugas || '—'}</td>
                                    <td style={{ padding: '10px 16px', color: '#64748b', fontSize: 11 }}>
                                        {r.reason_type
                                            ? REASON_OPTIONS.find(o => o.value === r.reason_type)?.label || r.reason_type
                                            : <span style={{ color: '#cbd5e1' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '10px 16px' }}><Badge status={r.status} /></td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <button
                                            onClick={() => openModal(r)}
                                            style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}
                                        >
                                            Kerjakan
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {records.length === 0 && (
                                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Tidak ada data BEDA yang perlu dikerjakan</td></tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: 5, cursor: page === 1 ? 'not-allowed' : 'pointer', background: '#fff', fontSize: 12, color: '#374151', opacity: page === 1 ? 0.4 : 1 }}>
                        Sebelumnya
                    </button>
                    <span style={{ color: '#64748b', fontSize: 12 }}>Hal. {page}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={records.length < 20}
                        style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: 5, cursor: records.length < 20 ? 'not-allowed' : 'pointer', background: '#fff', fontSize: 12, color: '#374151', opacity: records.length < 20 ? 0.4 : 1 }}>
                        Berikutnya
                    </button>
                </div>
            </div>
        </div>
    )
}