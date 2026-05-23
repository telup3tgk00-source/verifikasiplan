# Changelog

Semua perubahan penting pada proyek "Sistem Verifikasi KWH Meter PLN (METRIK)" akan dicatat dalam file ini.
Format yang digunakan didasarkan pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-24
### Ditambahkan (Added)
- **Dashboard UID Khusus Eksekutif**: Menambahkan halaman analitik khusus tier UID yang memuat Peringkat Kinerja UP3, Tren Harian (7 hari), Sebaran Tipe Anomali, dan Peringatan Bottleneck SLA.
- **Fitur Maker & Checker (QA Mode)**: Menambahkan mode *Read-Only* di halaman `Verifikasi Data` untuk mencegah perubahan tidak disengaja terhadap data yang sudah selesai.
- **Sistem Override/Anulir Keputusan**: Manajer (ULP/UP3/UID) kini memiliki wewenang untuk menekan tombol "Anulir / Revisi Keputusan" untuk memperbaiki kesalahan input dari Verifikator. Revisi tercatat di tabel `audit_logs`.
- **Integrasi Versioning**: Versi aplikasi sekarang ditampilkan di UI (Sidebar & Footer) dan terhubung dengan konfigurasi backend FastAPI Swagger Docs.

### Diubah (Changed)
- **UI Estetika**: Penghapusan emoji *dummy* untuk memberikan tampilan yang lebih profesional dan standar BUMN/Enterprise.
- **Export Excel**: Sistem _export_ disinkronkan secara *real-time* untuk selalu mengambil data terbaru hasil _Override_, memastikan validitas data.

## [1.0.0] - 2026-05-23
### Ditambahkan (Added)
- **Multi-Tier Role Architecture**: Struktur organisasi dari Super Admin -> UID -> UP3 -> ULP -> Verifikator, lengkap dengan isolasi data (`kode_unit`).
- **Autentikasi JWT**: Login aman berbasis JWT token.
- **Auto-Split Task**: Fitur "Pembagian Tugas" di tingkat ULP, membagi otomatis ribuan ID pelanggan secara adil kepada seluruh verifikator.
- **Progres Operator**: Dasbor bagi ULP untuk mengawasi langsung kecepatan verifikasi harian anak buahnya.
- **Chunking Bulk Delete**: Fitur penghapusan ratusan ribu (*bulk delete*) secara efisien menggunakan teknik *chunking* SQLite/PostgreSQL untuk mencegah kehabisan SSD/Memory akibat *Write-Ahead Logging* (WAL).
- **Extensi Auto-Sync Cookie ACMT**: Pembuatan *proxy bypass* untuk menarik foto meter ACMT tanpa masalah kedaluwarsa sesi (Cookie Session).

---
*Dokumen ini sangat disarankan untuk dilampirkan dalam Bab Metodologi Pengembangan Perangkat Lunak untuk laporan Skripsi/Tugas Akhir.*
