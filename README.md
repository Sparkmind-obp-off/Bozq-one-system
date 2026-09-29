# Bosku One System

Sistem operasional pelanggan, walk-in, booking, dan peluang kembali untuk Bosku Cukur. **Kasir Pro tetap otoritas pembayaran**; penyelesaian layanan bukan transaksi.

## Status dan URL

- Produksi: https://bosku-one-system.pages.dev — Cloudflare Pages BYOK, **masih memakai D1** `bosku-one-system-db`. Akun owner berfungsi. D1 dan migrasi 0001–0003 tidak dihapus.
- GitHub: https://github.com/Sparkmind-obp-off/Bozq-one-system (`main`).
- Neon PostgreSQL adalah **target migrasi yang telah diuji, bukan backend produksi saat ini**. Empat migrasi PostgreSQL, salinan snapshot D1 dan tes staging sudah lulus. Secret runtime Neon yang telah dirotasi disimpan terenkripsi di Pages sebagai `NEON_DATABASE_URL`, tetapi **belum dipakai**. Penyeleksi DB di `src/index.tsx` default D1; `DB_PRIMARY=neon` hanya boleh diaktifkan sesudah persetujuan cutover eksplisit dan snapshot/parity terbaru.
- Phase 4 tetap PARTIAL hingga impor nyata dan reminder dengan consent asli diuji. Tidak ada data bisnis fiktif yang dipakai untuk klaim hasil.

## Fitur saat ini

- Autentikasi/sesi HttpOnly, role dan audit server-side. Pelanggan, capster, layanan/harga referensi, walk-in, booking 1–8 orang, Today.
- CSV ekspor Kasir Pro: preview, validasi, deduplikasi, provenance dan commit eksplisit owner. Nilai aktual hanya dari impor transaksi; booking tidak berubah menjadi pembayaran.
- Peluang kembali memakai kunjungan selesai yang teramati (minimal tiga hari kunjungan). Consent WhatsApp default unknown dan pesan hanya dibuka untuk dikirim manual oleh pengguna.
- Ketika jaringan/API gagal, perubahan tidak dianggap berhasil. Operasi cukur dan pembayaran fisik tetap berlangsung di Kasir Pro.

## Panduan

1. Masuk sebagai owner, ganti sandi awal di Pengaturan, dan atur capster/layanan. Catat walk-in di Hari ini atau buat booking opsional.
2. Tambah pelanggan, lihat riwayat. Jangan memperlakukan nomor WhatsApp sebagai persetujuan. Hanya catat consent dari pernyataan pelanggan yang nyata.
3. Pemilik memvalidasi CSV yang benar-benar diekspor dari Kasir Pro sebelum commit. Jangan memasukkan transaksi contoh ke produksi.
4. Jika koneksi putus atau respons tidak jelas, periksa data server sebelum retry. UUID klien pada create membantu pencegahan duplikat.

## URI aktif

Mutasi browser memakai JSON + Origin same-origin; selain status/setup/login/logout, API butuh sesi. `/api/owner/*` hanya owner.

| Jalur | Tujuan |
|---|---|
| `/`, `/static/app.js`, `/static/style.css`; `GET /api/status` | UI dan status |
| `POST /api/bootstrap`, `/api/login`, `/api/logout`, `/api/me/password`; `GET /api/me` | Akun dan sesi |
| `GET/POST /api/customers?q=...`, `GET/PATCH /api/customers/:id` | Pelanggan dan riwayat |
| `GET/POST /api/visits?date=YYYY-MM-DD`, `PATCH /api/visits/:id/status` | Walk-in/visit |
| `GET/POST /api/bookings?date=YYYY-MM-DD`, `GET /api/bookings/:id`, `PATCH /api/bookings/:id/status` | Booking dan lifecycle |
| `GET /api/today?date=YYYY-MM-DD`, `/api/capsters`, `/api/services` | Today/katalog |
| `POST/PATCH /api/owner/capsters[/:id]`, `/api/owner/services[/:id]`; `GET /api/owner/audit` | Admin/audit |
| `POST /api/owner/import/preview`, `/api/owner/import/commit`; `GET /api/owner/import/runs` | Impor CSV |
| `GET /api/returns?date=YYYY-MM-DD`, `GET /api/returns/:id` | Retention/due |
| `POST /api/customers/:id/consent`, `/api/reminders/prepare`, `/api/reminders/:id/handoff` | Consent/reminder manual |

## Data dan migrasi pra-cutover

D1: 17 tabel operasional + riwayat migrasi, masih **satu-satunya sumber aktif produksi**. Neon: skema operasional dengan nama/kolom selaras D1; `customer_source`, `loyalty_program`, `loyalty_credit`, `loyalty_reward`, view aktual Kasir Pro, ledger PostgreSQL dan salinan sejarah D1. Tanpa transaksi nyata, metrik revenue menyatakan `INSUFFICIENT_DATA`. Neon sample table bawaan yang tidak terkait Bosku dibiarkan utuh. Tidak ada seeding harga atau consent.

- Migrasi PostgreSQL `database/migrations/0001`–`0004`: deterministik dan checksum-verifikasi lewat `database/apply.py`. `database/migrate_d1.py` membandingkan jumlah dan seluruh kolom rekam D1 sebelum mengubah target, menolak konflik, dan mempertahankan 3 catatan riwayat migrasi. `database/verify.py` menguji CRUD/constraint/relasi/loyalitas/analytics di dalam transaksi yang di-rollback.
- Snapshot D1 produksi terbaru diekspor ke berkas **privat di luar repo**, 18 tabel / 19 baris, FK valid; sama persis dengan Neon pada saat pemeriksaan. Snapshot harus **diambil ulang tepat sebelum cutover** untuk mendeteksi setiap delta.
- `src/neon-db.ts` adalah adapter HTTP Hono untuk staging. `DB_PRIMARY` kosong/default `d1` memakai D1; nilai lain gagal tertutup, dan Neon tanpa secret merespons 503. Hanya satu backend dipilih per request—tidak ada dual-write. Kode penyeleksi yang disiapkan **belum dideploy**, sehingga produksi masih D1 meski secret Neon sudah tersedia.
- D1 dibiarkan sebagai sumber rollback; setelah Neon menerima penulisan baru, rollback ke D1 perlu menghentikan penulisan dan merekonsiliasi perubahan Neon dahulu. Jangan melakukan rollback diam-diam yang menghilangkan rekam baru.

## Pengembangan/deployment

Node.js 22+, `npm install`, `npm run db:migrate:local`, `npm test && npm run typecheck && npm run build`. Lokal bisa dijalankan dengan `pm2 start ecosystem.config.cjs` pada http://localhost:3000. Administrator Neon memakai `database/requirements.txt`, `database/apply.py`, `database/migrate_d1.py`, `database/verify.py` dan koneksi yang diberikan melalui environment/secret, **bukan repo/chat**. Jangan commit ekspor D1 atau credential.

**Belum boleh deploy cutover** tanpa persetujuan tertulis yang secara jelas menyetujui perpindahan database produksi D1 → Neon. Setelah izin: refresh snapshot D1 dan parity; jalankan tes/typecheck/build; pakai CF BYOK Deploy untuk code yang memilih Neon; smoke produksi (auth/customer/visit/booking/import/report) dan pastikan permintaan benar-benar mencapai Neon; jaga D1 sebagai rollback. Detail evidence dan keterbatasan ada di `docs/10_BOSKU_COMPLETION_CHECKLIST_AND_DECISION_REGISTER.md`.
