import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export default function ProgressPage() {
    useEffect(() => { document.title = "Progres Operator | METRIK" }, [])

    const { data: stats, isLoading } = useQuery({
        queryKey: ['progress-detail'],
        queryFn: () => api.get('/api/dashboard/stats').then(r => r.data),
        refetchInterval: 15000,
    })

    if (isLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#94a3b8', fontSize: 13 }}>
            Memuat data...
        </div>
    )

    const total = stats?.total || 1
    const bars = [
        { label: 'Setuju', val: stats?.verified_ok || 0, color: '#16a34a' },
        { label: 'Tidak Setuju', val: stats?.verified_reject || 0, color: '#dc2626' },
        { label: 'Investigasi', val: stats?.need_investigation || 0, color: '#d97706' },
        { label: 'Pending', val: stats?.pending || 0, color: '#e2e8f0' },
    ]

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>Monitoring Progres</h1>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Data diperbarui otomatis setiap 15 detik</p>
            </div>

            {/* Overall progress */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>Progres Keseluruhan</span>
                    <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 22 }}>{stats?.progress_pct || 0}%</span>
                </div>

                {/* Stacked bar */}
                <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
                    {bars.filter(b => b.val > 0).map(b => (
                        <div
                            key={b.label}
                            style={{ width: `${(b.val / total) * 100}%`, background: b.color, transition: 'width 0.5s ease' }}
                            title={`${b.label}: ${b.val.toLocaleString()}`}
                        />
                    ))}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {bars.map(b => (
                        <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color, border: b.color === '#e2e8f0' ? '1px solid #cbd5e1' : 'none' }} />
                            <span style={{ color: '#64748b' }}>{b.label}</span>
                            <strong style={{ color: '#0f172a' }}>{b.val.toLocaleString()}</strong>
                            <span style={{ color: '#94a3b8' }}>({Math.round((b.val / total) * 100)}%)</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {bars.map(b => (
                    <div key={b.label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color, border: b.color === '#e2e8f0' ? '1px solid #cbd5e1' : 'none', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{b.label}</span>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>{b.val.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{Math.round((b.val / total) * 100)}% dari total</div>
                    </div>
                ))}
            </div>
        </div>
    )
}