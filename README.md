# Bosku One System

Sistem operasional pelanggan, walk-in, booking, dan peluang kembali untuk Bosku Cukur. **Kasir Pro tetap otoritas transaksi/pembayaran**; penyelesaian layanan tidak membuat transaksi.

## Status dan URL

- Produksi: https://bosku-one-system.pages.dev — Cloudflare Pages BYOK, **masih memakai Cloudflare D1** `bosku-one-system-db` (migrasi D1 0001–0003). Belum ada cutover ke Neon.
- GitHub: https://github.com/Sparkmind-obp-off/Bozq-one-system (`main`).
- **Phase 5 pre-cutover:** skema target Neon PostgreSQL, migrasi snapshot D1, integritas, dan adapter HTTP untuk staging telah diuji. Neon bukan database aktif produksi. Perubahan produksi membutuhkan persetujuan cutover eksplisit, penyegaran snapshot D1, rotasi rahasia yang sempat muncul di chat, dan smoke test baru.
- Phase 4: akun owner `boskuowner` berfungsi di produksi. Kredensial awal disampaikan secara privat; ganti sandi melalui Pengaturan. Smoke Phase 4 yang memerlukan data riil/consent belum lulus penuh.

## Fitur operasional

- Sesi HttpOnly, peran server-side dan audit. Pelanggan, capster, katalog layanan dan harga referensi; walk-in tanpa booking, booking 1–8 orang, lifecycle dan Today.
- Pemilik memilih CSV ekspor Kasir Pro (maks. 256 KB / 300 baris), pratinjau, validasi, konflik/duplikasi dan commit eksplisit. Nomor WhatsApp persis saja dapat menautkan pelanggan; nama saja tidak. Snapshot impor adalah bukti transaksi, bukan proyeksi booking.
- Pola kembali memakai hari kunjungan selesai berbeda: minimal 3 hari / 2 interval, median hingga 5 interval terbaru. Consent WhatsApp default `unknown`; hanya consent eksplisit memungkinkan persiapan reminder dan handoff WhatsApp manual. Tidak ada pengiriman otomatis.
- Tanpa transaksi hasil impor, nilai aktual tetap tidak tersedia. Kegagalan jaringan/API tidak dianggap penyimpanan berhasil; operasional fisik dan Kasir Pro tetap bisa berjalan.

## Cara menggunakan

1. Masuk dengan akun owner, ganti sandi awal; tambah capster/layanan di Pengaturan. Catat walk-in lewat Hari ini atau buat booking terpisah.
2. Tambah pelanggan, lihat riwayat dan peluang kembali. Nomor telepon tidak otomatis memberikan izin kontak; catat persetujuan langsung pelanggan sebelum pesan.
3. Tinjau CSV resmi Kasir Pro di Impor, baru konfirmasi jika isi benar. Jangan memasukkan transaksi contoh ke produksi.
4. Bila jaringan terganggu, periksa apakah perubahan tersimpan sebelum retry; pembayaran fisik tetap di Kasir Pro.

## API aktif

Mutasi browser memakai JSON dan Origin same-origin. `/api/status`, `/api/bootstrap`, `/api/login` publik; `/api/logout` boleh tanpa sesi untuk membersihkan cookie; endpoint lain memerlukan sesi. `/api/owner/*` hanya owner.

| URI | Fungsi |
|---|---|
| `/`, `/static/app.js`, `/static/style.css`; `GET /api/status` | UI/status |
| `POST /api/bootstrap`, `/api/login`, `/api/logout`, `/api/me/password`; `GET /api/me` | Akun, sesi, ubah sandi |
| `GET/POST /api/customers?q=...`, `GET/PATCH /api/customers/:id` | Pelanggan dan riwayat |
| `GET/POST /api/visits?date=YYYY-MM-DD`, `PATCH /api/visits/:id/status` | Walk-in dan visit |
| `GET/POST /api/bookings?date=YYYY-MM-DD`, `GET /api/bookings/:id`, `PATCH /api/bookings/:id/status` | Booking multi-orang |
| `GET /api/today?date=YYYY-MM-DD`, `/api/capsters`, `/api/services` | Today dan katalog |
| `POST/PATCH /api/owner/capsters[/:id]`, `/api/owner/services[/:id]`; `GET /api/owner/audit` | Admin dan audit |
| `POST /api/owner/import/preview`, `/api/owner/import/commit`; `GET /api/owner/import/runs` | Impor CSV |
| `GET /api/returns?date=YYYY-MM-DD`, `GET /api/returns/:id` | Return/due |
| `POST /api/customers/:id/consent`, `/api/reminders/prepare`, `/api/reminders/:id/handoff` | Persetujuan/pengingat manual |

Customer/visit/booking create memakai UUID klien untuk retry aman; waktu aktivitas adalah waktu bisnis Asia/Jakarta.

## Arsitektur data dan migrasi Phase 5

D1 adalah **satu-satunya database produksi aktif**. Neon PostgreSQL adalah target yang telah dimigrasi dari snapshot D1 privat, bukan backend aktif bersamaan. D1 dan migrasi lamanya tidak dihapus. Lihat `docs/10_BOSKU_COMPLETION_CHECKLIST_AND_DECISION_REGISTER.md` untuk pemetaan, jumlah data dan gate cutover.

- `database/migrations/0001_initial.sql`: 17 tabel operasional yang memetakan nama/kolom D1 (`business`, `branch`, `app_user`, `session`, `customer`, `visit`, `booking`, `booking_person`, `service`, `capster`, `price_rule`, `customer_consent`, `sync_run`, `transaction_snapshot`, `reminder`, `reminder_event`, `audit_event`). Waktu lokal tetap TEXT ISO untuk salin-lossless dan kompatibilitas API lama.
- `0002_growth.sql`: sumber akuisisi eksplisit `customer_source`, program/kredit/hadiah loyalitas `loyalty_program`, `loyalty_credit`, `loyalty_reward`, dan view analitik yang hanya membaca transaksi impor; bukan data/izin pelanggan yang diisi otomatis.
- `0003_source_history.sql`: simpan 3 catatan sejarah migrasi D1 secara terpisah. `0004_consent_order.sql`: penanda urutan consent untuk kesetaraan SQLite `rowid`.
- `database/apply.py` memakai ledger versi/checksum + transaksi; `database/migrate_d1.py` memverifikasi D1 export dan kesetaraan setiap kolom sebelum mengubah target, menolak konflik, lalu menulis satu transaksi PostgreSQL. `database/verify.py` menguji FK/unique/check/CRUD/loyalty/analitik dan me-*rollback* semua data uji.
- `src/neon-db.ts` adalah adapter HTTP Neon untuk pengujian Hono pra-cutover; **belum diaktifkan/diikat sebagai secret produksi**. Tidak ada dual-write atau sinkronisasi D1/Neon. Sebelum cutover, verifikasi kembali seluruh query, snapshot delta, dan buat rencana rollback berbasis D1.
- Tidak ada seed harga/katalog atau riwayat transaksi fiktif; ketiadaan transaksi/loyalitas/acquisition dilaporkan `INSUFFICIENT_DATA`. Tabel contoh bawaan Neon `playing_with_neon` (50 baris, tidak terkait Bosku) tidak disentuh.

**Rahasia:** berikan `DATABASE_URL` hanya lewat secret/environment, jangan melalui git/chat. Jangan menjalankan migrasi memakai kredensial yang sudah terekspos untuk cutover; rotasi dulu. Kode dan dokumentasi tidak mengandung URL/password. Script Python admin membutuhkan `psycopg[binary]`, bukan dependency Worker. Jangan menjalankan file ekspor dari dalam repo; simpan di lokasi privat di luar workspace.

## Pengembangan dan deployment

Node.js 22+, `npm install`, `npm run db:migrate:local`, `npm test && npm run typecheck && npm run build`, lalu `pm2 start ecosystem.config.cjs` dan buka http://localhost:3000. Untuk skema target Neon, jalankan script `database/apply.py`, lalu `database/migrate_d1.py` terhadap ekspor privat, lalu `database/verify.py` hanya dengan URL yang diberikan aman melalui environment. **Jangan menyalakan adapter Neon di Pages sekarang.** Saat cutover disetujui, gunakan CF BYOK Deploy setelah seluruh tes dan smoke staging lulus; `wrangler.jsonc` dan D1 produksi tetap dipertahankan sampai rollback tidak diperlukan.

## Batasan / langkah berikutnya

- Export D1 terbaru, deteksi perubahan sejak snapshot, cocokkan record-by-record, rotasi password Neon, dan siapkan staging Pages/secret yang tidak mengalihkan produksi. Cutover memerlukan persetujuan eksplisit dan smoke produksi setelahnya.
- Verifikasi impor CSV Kasir Pro asli, riwayat return cukup dan reminder berbasis consent sungguhan; jangan mengklaim pertumbuhan tanpa bukti.
- Excel/mapping ekspor penuh, offline queue, UI riwayat reminder, BI lanjut dan pilot 7–14 hari masih terbuka.
