import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'

// ─── Foto Meter Helpers ───────────────────────────────────────────────────────
const FOTO_MONTHS = 6   // jumlah bulan ke belakang yang ditampilkan
const FOTO_PER_MONTH = 3

function getBlthList() {
    const list = []
    const now = new Date()
    for (let i = 0; i < FOTO_MONTHS; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        list.push(`${y}${m}`)
    }
    return list
}

function FotoModal({ foto, onClose }) {
    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200,
                     display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}
        >
            <div onClick={e => e.stopPropagation()}
                 style={{ background: '#1e293b', borderRadius: 10, padding: 16, maxWidth: '90vw', maxHeight: '90vh',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>
                        PHOTO {foto.fotoke} &mdash; {foto.blth.slice(0,4)}/{foto.blth.slice(4)} &nbsp;|&nbsp; {foto.idpel}
                    </span>
                    <button onClick={onClose}
                        style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 5,
                                 width: 26, height: 26, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
                </div>
                {foto.loading && <div style={{ color: '#94a3b8', padding: 40, fontSize: 13 }}>Memuat foto...</div>}
                {foto.error  && <div style={{ color: '#f87171', padding: 20, fontSize: 12, textAlign: 'center' }}>{foto.error}</div>}
                {foto.url    && <img src={foto.url} alt="foto meter"
                    style={{ maxWidth: '80vw', maxHeight: '75vh', borderRadius: 6, objectFit: 'contain' }} />}
            </div>
        </div>
    )
}

function LatestPhoto({ idpel, blth }) {
    const [fotoState, setFotoState] = useState({ loading: true, url: null, error: null })
    const [showFull, setShowFull] = useState(false)

    useEffect(() => {
        let isMounted = true
        setFotoState({ loading: true, url: null, error: null })
        const token = useAuthStore.getState().token
        fetch(`/api/foto?idpel=${encodeURIComponent(idpel)}&blth=${blth}&fotoke=1`, { headers: { Authorization: `Bearer ${token}` } })
            .then(async r => {
                if (!r.ok) {
                    const err = await r.json().catch(() => ({}))
                    throw new Error(err.detail || `HTTP ${r.status}`)
                }
                const blob = await r.blob()
                if (isMounted) setFotoState({ loading: false, url: URL.createObjectURL(blob), error: null })
            })
            .catch(e => {
                const msg = e.message.includes('401') || e.message.includes('EXPIRED') || e.message.includes('belum diset') 
                    ? 'Sesi ACMT harus di input ulang' 
                    : e.message;
                if (isMounted) setFotoState({ loading: false, url: null, error: msg })
            })
        return () => { isMounted = false }
    }, [idpel, blth])

    return (
        <>
            <div 
                onClick={() => fotoState.url && setShowFull(true)}
                style={{ width: '100%', height: 400, background: '#0f172a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 16, cursor: fotoState.url ? 'zoom-in' : 'default', position: 'relative' }}
                title={fotoState.url ? "Klik untuk perbesar" : ""}
            >
                {fotoState.loading && <div style={{ fontSize: 11, color: '#94a3b8' }}>Memuat foto terbaru...</div>}
                {fotoState.error && <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', padding: 10 }}>{fotoState.error}</div>}
                {fotoState.url && (
                    <>
                        <img src={fotoState.url} alt="Latest" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 10, pointerEvents: 'none' }}>
                            🔍 Perbesar
                        </div>
                    </>
                )}
            </div>
            {showFull && (
                <FotoModal 
                    foto={{ idpel, blth, fotoke: 1, url: fotoState.url, loading: false, error: null }} 
                    onClose={() => setShowFull(false)} 
                />
            )}
        </>
    )
}

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

// Alasan perbedaan sekarang diambil dinamis dari API

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

// ─── ACMT Session Panel ───────────────────────────────────────────────────────
const COOKIE_FIELDS = [
    { key: 'JSESSIONID',    label: 'JSESSIONID',    placeholder: '81EA7996B2C3D4E5F6A7...' },
    { key: 'Pool_ACMTJava', label: 'Pool_ACMTJava', placeholder: '2990909632.16927.0000' },
    { key: 'TS017170f7',    label: 'TS017170f7',    placeholder: '0111e437098a28f5...' },
    { key: 'TS01be508d',    label: 'TS01be508d',    placeholder: '0111e437098a28f5...' },
]

function AcmtSessionPanel() {
    const [status, setStatus]       = useState(null)
    const [showForm, setShowForm]   = useState(false)
    const [showGuide, setShowGuide] = useState(false)
    const [saving, setSaving]       = useState(false)
    const [fields, setFields]       = useState({
        JSESSIONID: '', Pool_ACMTJava: '', TS017170f7: '', TS01be508d: ''
    })

    const loadStatus = async () => {
        try {
            const r = await api.get('/api/foto/session/status')
            setStatus(r.data)
        } catch { setStatus(null) }
    }

    useEffect(() => { loadStatus() }, [])

    const handleSave = async () => {
        if (!fields.JSESSIONID.trim()) {
            alert('JSESSIONID wajib diisi')
            return
        }
        // Rakit cookie string — skip field yang kosong
        const cookieString = COOKIE_FIELDS
            .filter(f => fields[f.key].trim())
            .map(f => `${f.key}=${fields[f.key].trim()}`)
            .join('; ')

        setSaving(true)
        try {
            await api.post('/api/foto/session', { cookie_string: cookieString, set_by: 'admin' })
            setFields({ JSESSIONID: '', Pool_ACMTJava: '', TS017170f7: '', TS01be508d: '' })
            setShowForm(false)
            await loadStatus()
        } catch(e) { alert('Gagal menyimpan: ' + (e.response?.data?.detail || e.message)) }
        finally { setSaving(false) }
    }

    const hasSession = status?.has_session
    const setAt      = status?.set_at ? new Date(status.set_at).toLocaleString('id-ID') : null
    const cookieKeys = status?.cookie_keys || []

    return (
        <div style={{ background: hasSession ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${hasSession ? '#bbf7d0' : '#fecaca'}`,
                      borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                      display: 'flex', gap: 12, flexDirection: 'column' }}>
            {/* Status bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                               color: hasSession ? '#15803d' : '#dc2626', letterSpacing: '0.5px' }}>
                    {hasSession ? '● Sesi ACMT Aktif' : '○ Sesi ACMT Belum Diset'}
                </span>
                {setAt && <span style={{ fontSize: 11, color: '#64748b' }}>diset {setAt} oleh {status.set_by}</span>}
                {cookieKeys.length > 0 && (
                    <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9',
                                   border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 7px',
                                   fontFamily: 'monospace' }}>
                        {cookieKeys.join(' · ')}
                    </span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button onClick={() => { setShowGuide(g => !g); setShowForm(false) }}
                        style={{ fontSize: 11, padding: '3px 10px', border: '1px solid #94a3b8',
                                 borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#374151' }}>
                        ? Cara copy cookie
                    </button>
                    <button onClick={() => { setShowForm(f => !f); setShowGuide(false) }}
                        style={{ fontSize: 11, padding: '3px 10px', border: 'none', borderRadius: 4,
                                 background: hasSession ? '#16a34a' : '#dc2626',
                                 color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                        {hasSession ? '↻ Update Cookie' : '+ Set Cookie ACMT'}
                    </button>
                </div>
            </div>

            {/* Panduan */}
            {showGuide && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, fontSize: 11, color: '#374151', lineHeight: 1.7 }}>
                    <strong>Cara ambil nilai cookie dari DevTools (Chrome):</strong>
                    <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                        <li>Buka <a href="https://portalapp.iconpln.co.id/acmt/index.jsp" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>portalapp.iconpln.co.id/acmt/index.jsp</a></li>
                        <li>Login dengan username &amp; password, isi CAPTCHA</li>
                        <li>Tekan <kbd style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: 3 }}>F12</kbd> &rarr; tab <strong>Application</strong> &rarr; <strong>Cookies</strong> &rarr; <code>portalapp.iconpln.co.id</code></li>
                        <li>Cari baris <strong>JSESSIONID</strong> &rarr; klik &rarr; copy kolom <strong>Value</strong></li>
                        <li>Lakukan hal yang sama untuk <strong>Pool_ACMTJava</strong>, <strong>TS017170f7</strong>, <strong>TS01be508d</strong></li>
                        <li>Paste masing-masing nilai ke field yang sesuai di form ini</li>
                    </ol>
                    <p style={{ margin: '8px 0 0', color: '#64748b' }}>⏱ Cookie berlaku beberapa jam. Update kembali jika foto tidak muncul.</p>
                </div>
            )}

            {/* Form: 4 input field terpisah */}
            {showForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {COOKIE_FIELDS.map(f => (
                            <div key={f.key}>
                                <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b',
                                                display: 'block', marginBottom: 3, fontFamily: 'monospace',
                                                textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    {f.label}
                                    {f.key === 'JSESSIONID' && <span style={{ color: '#ef4444' }}> *</span>}
                                </label>
                                <input
                                    value={fields[f.key]}
                                    onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                                    placeholder={f.placeholder}
                                    style={{ width: '100%', height: 30, padding: '0 8px',
                                             border: `1px solid ${f.key === 'JSESSIONID' && !fields[f.key] ? '#fca5a5' : '#d1d5db'}`,
                                             borderRadius: 5, fontSize: 11, fontFamily: 'monospace',
                                             outline: 'none', boxSizing: 'border-box', color: '#1e293b' }}
                                />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={handleSave} disabled={saving || !fields.JSESSIONID.trim()}
                            style={{ padding: '0 16px', height: 32, background: '#2563eb', color: '#fff',
                                     border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12,
                                     fontWeight: 600, opacity: saving || !fields.JSESSIONID.trim() ? 0.5 : 1 }}>
                            {saving ? 'Menyimpan...' : 'Simpan Cookie'}
                        </button>
                        <button onClick={() => setShowForm(false)}
                            style={{ padding: '0 10px', height: 32, background: '#f1f5f9', color: '#374151',
                                     border: '1px solid #e2e8f0', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                            Batal
                        </button>
                        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>
                            * Copy nilai dari kolom Value di DevTools
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function VerifikasiPage() {
    const { user, role } = useAuthStore()
    const qc = useQueryClient()

    const { data: reasons = [] } = useQuery({
        queryKey: ['reasons'],
        queryFn: () => api.get('/api/settings/reasons').then(r => r.data),
    })
    const [page, setPage] = useState(1)
    const [filter, setFilter] = useState({ status: '', search: '', anomalyOnly: false, merekMismatch: false, sessionId: '' })
    const [selected, setSelected] = useState(null)
    const [note, setNote] = useState('')
    const [reasonType, setReasonType] = useState('')
    const [correctedStand, setCorrectedStand] = useState('')
    const [activeFoto, setActiveFoto] = useState(null)   // { idpel, blth, fotoke, loading, url, error }
    const [expandedFoto, setExpandedFoto] = useState(null) // idpel yang sedang di-expand

    const blthList = getBlthList()

    const { data: sessions = [] } = useQuery({
        queryKey: ['sessions-list'],
        queryFn: () => api.get('/api/upload/sessions').then(r => r.data)
    })

    // Tentukan bulan ACMT yang aktif:
    // 1. Prioritas: bulan_verifikasi dari sesi yang dipilih di filter
    // 2. Fallback: bulan kalender berjalan (untuk sesi lama yang belum punya bulan_verifikasi)
    const selectedSession = sessions.find(s => String(s.id) === String(filter.sessionId))
    const activeBulan = selectedSession?.bulan_verifikasi || blthList[0]

    const handleFotoClick = async (idpel, blth, fotoke) => {
        setActiveFoto({ idpel, blth, fotoke, loading: true, url: null, error: null })
        try {
            const token = useAuthStore.getState().token
            const resp = await fetch(
                `/api/foto?idpel=${encodeURIComponent(idpel)}&blth=${blth}&fotoke=${fotoke}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}))
                throw new Error(err.detail || `HTTP ${resp.status}`)
            }
            const blob = await resp.blob()
            const url  = URL.createObjectURL(blob)
            setActiveFoto(prev => ({ ...prev, loading: false, url }))
        } catch (e) {
            const msg = e.message.includes('401') || e.message.includes('EXPIRED') || e.message.includes('belum diset') 
                ? 'Sesi ACMT harus di input ulang' 
                : e.message;
            setActiveFoto(prev => ({ ...prev, loading: false, error: msg }))
            if (msg.includes('input ulang')) toast.error(msg)
        }
    }

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
                assigned_to: role === 'verifikator' ? user?.id : undefined,
                session_id: filter.sessionId || undefined
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

    const navigateModal = (direction) => {
        if (!selected || records.length === 0) return
        const idx = records.findIndex(r => r.id === selected.id)
        if (idx === -1) return
        const newIdx = idx + direction
        if (newIdx >= 0 && newIdx < records.length) {
            openModal(records[newIdx])
        }
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
            {/* Foto Meter Modal */}
            {activeFoto && <FotoModal foto={activeFoto} onClose={() => setActiveFoto(null)} />}
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
                        style={{ ...inputStyle, width: 160 }}
                    />
                    <select
                        value={filter.sessionId}
                        onChange={e => { setFilter(f => ({ ...f, sessionId: e.target.value })); setPage(1) }}
                        style={{ ...inputStyle, paddingLeft: 10, maxWidth: 200 }}
                    >
                        <option value="">{role === 'verifikator' ? 'Semua Tugas Saya' : 'Semua Sesi'}</option>
                        {sessions.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.batch_name ? s.batch_name : `Sesi #${s.id}`} ({new Date(s.created_at).toLocaleDateString('id-ID')})
                            </option>
                        ))}
                    </select>
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

            {/* Panel Sesi ACMT */}
            <AcmtSessionPanel />

            {/* Modal */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 800, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', display: 'flex', gap: 24 }}>
                        
                        {/* Kiri: Foto Terbaru */}
                        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                Foto Terbaru
                                <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontFamily: 'monospace' }}>
                                    {activeBulan.slice(0,4)}/{activeBulan.slice(4)}
                                </span>
                                {!selectedSession?.bulan_verifikasi && filter.sessionId && (
                                    <span style={{ fontSize: 10, color: '#d97706' }} title="Batch ini diupload sebelum fitur kunci bulan, menggunakan bulan kalender sebagai fallback">⚠</span>
                                )}
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <LatestPhoto idpel={selected.id_pelanggan} blth={activeBulan} />
                            </div>
                            
                            {/* Navigasi Next/Prev di bawah foto */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                                <button 
                                    onClick={() => navigateModal(-1)}
                                    disabled={records.findIndex(r => r.id === selected.id) <= 0}
                                    style={{ flex: 1, padding: '8px 0', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: records.findIndex(r => r.id === selected.id) <= 0 ? 'not-allowed' : 'pointer', opacity: records.findIndex(r => r.id === selected.id) <= 0 ? 0.5 : 1 }}
                                >
                                    &larr; Sebelumnya
                                </button>
                                <button 
                                    onClick={() => navigateModal(1)}
                                    disabled={records.findIndex(r => r.id === selected.id) >= records.length - 1}
                                    style={{ flex: 1, padding: '8px 0', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: records.findIndex(r => r.id === selected.id) >= records.length - 1 ? 'not-allowed' : 'pointer', opacity: records.findIndex(r => r.id === selected.id) >= records.length - 1 ? 0.5 : 1 }}
                                >
                                    Berikutnya &rarr;
                                </button>
                            </div>
                        </div>

                        {/* Kanan: Form Verifikasi */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                                <option value="">— Pilih Alasan —</option>
                                {reasons.filter(r => r.is_active || r.value === reasonType).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 'auto' }}>
                            <button onClick={() => handleVerify('VERIFIED_OK')} disabled={verifyMutation.isPending}
                                style={{ ...btnBase, background: '#16a34a', color: '#fff' }}>✓ Selesai / OK</button>
                            <button onClick={() => handleVerify('NEED_INVESTIGATION')} disabled={verifyMutation.isPending}
                                style={{ ...btnBase, background: '#d97706', color: '#fff' }}>⚑ Perlu Investigasi</button>
                        </div>
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
                                {['ID Pelanggan', 'Stand AI', 'Stand Biller', 'Selisih', 'Merek AI / Biller', 'Alasan', 'Status', 'Foto', ''].map(h => (
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
                                            ? reasons.find(o => o.value === r.reason_type)?.label || r.reason_type
                                            : <span style={{ color: '#cbd5e1' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '10px 16px' }}><Badge status={r.status} /></td>
                                    {/* Kolom Foto */}
                                    <td style={{ padding: '10px 16px', minWidth: 120 }}>
                                        <button
                                            onClick={() => setExpandedFoto(expandedFoto === r.id_pelanggan ? null : r.id_pelanggan)}
                                            style={{ background: expandedFoto === r.id_pelanggan ? '#dbeafe' : '#f1f5f9',
                                                     color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 5,
                                                     padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}
                                        >
                                            📷 Foto
                                        </button>
                                        {expandedFoto === r.id_pelanggan && (
                                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                {blthList.map(blth =>
                                                    Array.from({ length: FOTO_PER_MONTH }, (_, i) => i + 1).map(fk => (
                                                        <button
                                                            key={`${blth}-${fk}`}
                                                            onClick={() => handleFotoClick(r.id_pelanggan, blth, String(fk))}
                                                            style={{ background: '#fff', border: '1px solid #e2e8f0',
                                                                     borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
                                                                     fontSize: 10, color: '#374151', textAlign: 'left',
                                                                     whiteSpace: 'nowrap' }}
                                                        >
                                                            PHOTO {fk} - {blth}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </td>
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