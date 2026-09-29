# Bosku One System

Sistem operasional pelanggan, walk-in, booking, dan peluang kembali untuk Bosku Cukur. **Kasir Pro tetap otoritas pembayaran**; menyelesaikan layanan tidak membuat transaksi.

## Produksi

- **Aktif:** https://bosku-one-system.pages.dev — Cloudflare Pages BYOK dengan **Neon PostgreSQL sebagai satu-satunya database aktif aplikasi**. Pemilik telah menyetujui cutover D1 → Neon; commit Worker yang dideploy: `87d399a`.
- **Rollback/reference:** D1 `bosku-one-system-db` beserta binding, data dan migrasi 0001–0003 tetap utuh. **Tidak ada dual-write.** Setelah data baru masuk Neon, jangan mengalihkan balik tanpa menghentikan penulisan dan merekonsiliasi delta ke D1.
- GitHub: https://github.com/Sparkmind-obp-off/Bozq-one-system (`main`).
- Rahasia runtime `NEON_DATABASE_URL` dan selector `DB_PRIMARY` disimpan terenkripsi di Cloudflare Pages, tidak di repo. Kredensial lama yang muncul di chat sudah dirotasi. Peran runtime terbatas tidak dapat membuat schema.

## Alur operasional

- Sesi HttpOnly, role server-side dan audit; pelanggan, capster, katalog layanan/harga referensi, walk-in, booking 1–8 orang, Today.
- Pemilik dapat melakukan preview, validasi, dan commit eksplisit CSV Kasir Pro dengan perlindungan duplikat serta provenance. Nilai aktual berasal hanya dari transaksi yang diimpor, bukan dari status layanan atau proyeksi booking.
- Peluang kembali dihitung dari hari kunjungan selesai yang benar-benar tercatat. Consent WhatsApp awal unknown; pesan hanya dapat disiapkan jika kondisi dan persetujuan tepat, lalu pengguna sendiri yang membukanya dan menekan Kirim.
- Phase 6 Growth di Neon: profil dengan catatan dan asal, lifecycle dengan ambang hari yang dapat diubah pemilik, loyalty 4 kunjungan potong rambut terpilih → 1 hadiah manual yang diaudit dan tidak mencatat pembayaran, referensi pelanggan, draft kampanye tanpa pengiriman, antrean aksi manual, laporan harian/7-hari dan metrik aktual CSV. Status hadiah/aksi bukan bukti pembayaran atau pesan terkirim.
- Jika jaringan gagal, perubahan tidak dianggap tersimpan. Operasional fisik dan pembayaran di Kasir Pro tetap dapat berjalan.

## Panduan

1. Login sebagai owner, ganti sandi awal di Pengaturan, lalu atur capster/layanan. Catat walk-in di Hari ini atau buat booking opsional.
2. Tambah pelanggan/lihat riwayat. Nomor telepon tidak otomatis merupakan persetujuan kontak; catat jawaban pelanggan yang nyata.
3. Validasi CSV asli Kasir Pro sebelum commit. Jangan memasukkan transaksi atau consent contoh ke produksi.
4. Buka Growth untuk ringkasan dan antrean. Pemilik mengatur layanan potong rambut yang memenuhi program 4+1 serta ambang lifecycle; operator memberi kredit hanya untuk kunjungan selesai yang benar-benar memenuhi syarat, lalu mencatat penukaran pada kunjungan gratis selesai. Catat hasil tindakan manual secara jujur; draft kampanye tidak dikirim otomatis.
5. Saat koneksi terganggu, periksa data server sebelum mengulangi permintaan untuk menghindari duplikat.

## URI aktif

Mutasi browser memakai JSON + Origin same-origin; endpoint selain status/setup/login/logout memerlukan sesi. `/api/owner/*` hanya owner.

| Jalur | Tujuan |
|---|---|
| `/`, `/static/app.js`, `/static/style.css`; `GET /api/status` | UI dan status |
| `POST /api/bootstrap`, `/api/login`, `/api/logout`, `/api/me/password`; `GET /api/me` | Akun dan sesi |
| `GET/POST /api/customers?q=...`, `GET/PATCH /api/customers/:id` | Pelanggan/riwayat |
| `GET/POST /api/visits?date=YYYY-MM-DD`, `PATCH /api/visits/:id/status` | Walk-in/visit |
| `GET/POST /api/bookings?date=YYYY-MM-DD`, `GET /api/bookings/:id`, `PATCH /api/bookings/:id/status` | Booking/lifecycle |
| `GET /api/today?date=YYYY-MM-DD`, `/api/capsters`, `/api/services` | Today/katalog |
| `POST/PATCH /api/owner/capsters[/:id]`, `/api/owner/services[/:id]`; `GET /api/owner/audit`, `/api/owner/database-target` | Admin, audit, verifikasi backend oleh owner |
| `POST /api/owner/import/preview`, `/api/owner/import/commit`; `GET /api/owner/import/runs` | CSV Kasir Pro |
| `GET /api/returns?date=YYYY-MM-DD`, `GET /api/returns/:id` | Retention/due |
| `POST /api/customers/:id/consent`, `/api/reminders/prepare`, `/api/reminders/:id/handoff` | Consent dan reminder manual |
| `GET /api/growth/customers/:id`, `PATCH /api/growth/customers/:id/notes`, `POST /api/growth/customers/:id/source` | Profil Growth, catatan dan asal |
| `GET /api/growth/program`, `POST /api/growth/loyalty/award`, `/api/growth/loyalty/redeem` | Program 4+1, kredit dan penukaran manual |
| `GET/POST /api/growth/queue`, `PATCH /api/growth/queue/:id`; `GET/POST /api/growth/referrals` | Antrean dan rujukan |
| `GET /api/growth/campaigns`, `/api/growth/report?date=YYYY-MM-DD` | Draft kampanye dan laporan berdasarkan data tersedia |
| `POST /api/owner/growth/program`, `/api/owner/growth/campaigns`; `PUT /api/owner/growth/settings` | Pengaturan terbatas pemilik |

Customer/visit/booking create memakai UUID klien untuk retry aman; waktu bisnis Asia/Jakarta.

## Database dan bukti cutover

- PostgreSQL `database/migrations/0001`–`0006`: tabel operasional dengan nama/kolom kompatibel D1, sumber pelanggan eksplisit, program/kredit/hadiah loyalty, view aktual Kasir Pro, ledger migrasi PostgreSQL dan salinan sejarah migrasi D1. Migrasi 0005 menambah metadata Growth, rujukan, draft kampanye, antrean aksi dan fungsi loyalty terisolasi; 0006 memberi hak runtime terbatas. Ketiadaan data finansial/loyalitas tidak ditampilkan sebagai hasil rekayasa.
- `database/apply.py` memakai transaksi, lock dan checksum. `database/migrate_d1.py` menyalin export D1 privat dengan perbandingan jumlah dan kolom; `database/verify.py` memeriksa CRUD/FK/unique/loyalitas/analitik dengan rollback data uji. Script admin membutuhkan paket di `database/requirements.txt` dan URL melalui environment/secret, **bukan file repo/chat**.
- Tepat sebelum cutover, export D1 terbaru (18 tabel/19 baris, 0 FK error) cocok field-by-field dengan Neon. Worker baru lebih dahulu dideploy dengan default D1 dan diuji; setelah persetujuan owner, secret `DB_PRIMARY` diaktifkan untuk Neon dan build yang sama di-deploy via CF BYOK. Owner-only `/api/owner/database-target` melakukan query PostgreSQL nyata dan mengembalikan `engine: neon`, `verified: true`.
- Smoke produksi Neon: URL/aset, login/sesi, API terautentikasi, Today, pelanggan, capster/layanan, walk-in dan booking sampai selesai, return/consent yang aman, preview CSV saja, audit, logout/re-login, dan browser mobile 390px lulus. Data uji bertanda khusus dibersihkan; **tidak ada transaksi, consent, atau pesan WhatsApp fiktif**. D1 tetap dapat dibaca. Hasil post-cleanup kembali sama dengan snapshot D1 untuk 18 tabel/19 baris.

## Batas integrasi yang ditunda

Kasir Pro API **DEFERRED — PAID API ACCESS REQUIRED**. Kontrak future POS adapter, sumber kebenaran transaksi CSV, fingerprint/duplikat, autentikasi, sinkronisasi dan kegagalan dijelaskan di `docs/39_BOSKU_POS_INTEGRATION_BOUNDARY.md`. Belum ada WhatsApp API, otomatisasi kampanye, pembayaran maupun hasil pertumbuhan yang dapat diklaim dari data kosong.

## Pengembangan dan rollback

Node.js 22+, `npm install`, `npm run db:migrate:local`, `npm test && npm run typecheck && npm run build`; preview lokal: `pm2 start ecosystem.config.cjs`, http://localhost:3000. Jangan menaruh ekspor D1/credential di repo. Detail proses dan evidensi: `docs/10_BOSKU_COMPLETION_CHECKLIST_AND_DECISION_REGISTER.md`.

**Rollback:** hentikan mutasi; bandingkan catatan baru Neon dengan D1 dan rekonsiliasi sebelum berpindah. Dengan otorisasi CF BYOK, set Pages secret `DB_PRIMARY` menjadi `d1`, deploy kembali build teruji, lalu pastikan probe owner mengembalikan `d1` dan jalankan smoke auth/API. D1 tidak boleh dihapus pada fase ini. Pantau produksi setelah cutover; impor transaksi nyata dan due/reminder berbasis consent pelanggan sungguhan belum dapat diklaim terverifikasi sampai ada data nyata.
