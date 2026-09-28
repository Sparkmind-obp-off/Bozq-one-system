# Bosku One System

Lapisan operasional pelanggan, walk-in, booking, dan peluang kembali untuk Bosku Cukur. **Kasir Pro tetap otoritas transaksi/pembayaran.** Bosku tidak membuat transaksi saat kunjungan selesai.

## Status & URL

- Produksi CF BYOK: https://bosku-one-system.pages.dev (`main`, Cloudflare Pages); D1 khusus `bosku-one-system-db`, migrasi 0001–0003.
- GitHub: https://github.com/Sparkmind-obp-off/Bozq-one-system
- Phase 4: akar masalah setup produksi (frontend menimpa header `Content-Type` saat mengirim kode setup) diperbaiki dan dideploy. Owner `boskuowner` dibuat dengan sandi acak yang disampaikan **terpisah dan privat**; sandi tidak ada di repo. Segera masuk dan ganti sandi di **Pengaturan → Keamanan akun**; semua sesi akan dicabut.
- Produksi telah diuji: bootstrap, login, cookie HttpOnly/Secure/SameSite=Lax/Path=/, refresh, API terautentikasi, logout, penolakan sesi lama, re-login, Today, pelanggan, walk-in, layanan, capster, booking, pratinjau CSV, return dengan riwayat tak cukup, consent unknown, audit dan browser mobile 390px. Rekam uji bertanda khusus dibersihkan; audit uji disimpan. **Belum diverifikasi di produksi:** commit impor transaksi riil dan due/reminder yang memerlukan riwayat dan consent pelanggan sungguhan. Jangan menciptakan transaksi, riwayat atau persetujuan palsu untuk menaikkan status pengujian; Phase 4 tetap PARTIAL sampai gate tersebut terverifikasi.

## Fitur yang sudah ada

- Login/sesi HttpOnly, server-side roles, audit; customer, capster, layanan/harga referensi, walk-in tanpa booking, booking 1–8 orang dan lifecycle, layar Today. Proyeksi harga booking tidak pernah dicatat sebagai pembayaran.
- Pemilik dapat memilih CSV ekspor Kasir Pro (maksimal 256 KB / 300 baris), pratinjau/dry-run, memetakan kolom tanggal/total/ID/nomor secara opsional, meninjau konflik dan baru menyimpan secara eksplisit. Mendukung alias umum tanggal/total/ID/nama/nomor/layanan/metode/referensi. Tanggal waktu lokal `YYYY-MM-DD[THH:mm]`; total rupiah bulat. File dengan baris invalid atau konflik external ID tidak disimpan. ID eksternal, file hash, nomor baris, timestamp, sumber, laporan `sync_run` dan audit tetap tersimpan. Impor ulang dilewati; tanpa ID eksternal, dedupe menggunakan hash berkas dan nomor baris (berkas berbeda dengan isi identik yang diurut ulang tidak dijamin dedupe). Hanya nomor WhatsApp persis yang boleh menautkan pelanggan otomatis; nama saja tidak cukup. Impor tidak membuat kunjungan.
- Return dari hari kunjungan selesai yang tercatat (bukan dari booking atau transaksi tanpa visit). Memerlukan tiga hari kunjungan berbeda / dua interval. Median maksimal lima interval terbaru, jendela perkiraan median +/- max(2 hari, 20% dibulatkan ke atas). Status: `unknown`, `insufficient_history`, `active_pattern`, `due_soon`, `due`, `overdue`; bukan prediksi kepastian. Hanya maksimal 101 catatan kunjungan terakhir / 100 pelanggan per tampilan pada MVP.
- Consent WhatsApp reminder awal `unknown`. Petugas mencatat jawaban pelanggan langsung dengan sumber/catatan, diaudit; persetujuan dicek lagi saat siapkan pesan dan saat handoff. Pengingat hanya dari due/overdue, dibuka lewat WhatsApp oleh pengguna dan **pengguna sendiri yang menekan Kirim**. Tidak ada otomatisasi WhatsApp atau klaim pesan terkirim.
- Nilai aktual Today hanya dari `transaction_snapshot` hasil impor CSV. Tanpa impor tampil **Actual transaction data belum tersedia**; snapshot belum direkonsiliasi ke laporan Kasir Pro.

## Panduan

1. Buka URL produksi, login menggunakan kredensial yang disampaikan privat, lalu ganti sandi. Tambah capster/layanan dari Pengaturan; pada Hari ini catat walk-in tanpa booking dan lanjutkan status bila diperlukan. Setup owner baru tidak dapat diulang karena sudah ada owner.
2. Tambah pelanggan dengan nama/WhatsApp opsional; jangan menganggap nomor yang tersimpan sebagai consent. Booking dapat mencakup beberapa orang.
3. Pemilik membuka **Impor Kasir Pro**, pilih CSV resmi yang dimiliki, validasi tanpa menyimpan, tinjau semua ringkasan, baru konfirmasi. Jika tidak cocok dengan ekspor nyata, jangan impor; mapping penuh masih pending.
4. Buka **Peluang kembali** untuk melihat bukti interval dan kandidat. Catat persetujuan pelanggan di detail secara eksplisit; review pesan lalu pilih buka WhatsApp. Tidak ada pengiriman otomatis.
5. Bila jaringan gagal, jangan menganggap operasi tercatat. Jika respons bukan JSON atau sesi kedaluwarsa, aplikasi menampilkan kegagalan yang jelas; muat ulang/periksa data sebelum mengulangi permintaan. Operasi fisik dan pembayaran di Kasir Pro tetap berjalan.

## API aktif

Mutasi browser harus JSON dengan `Origin` same-origin. `/api/status`, `/api/bootstrap`, `/api/login` bersifat publik; `/api/logout` aman dipanggil tanpa sesi untuk membersihkan cookie. API lainnya memerlukan sesi. `/api/owner/*` hanya owner, diperiksa di server.

| URI | Fungsi |
|---|---|
| `GET /`, `/static/app.js`, `/static/style.css` | UI mobile |
| `GET /api/status`; `POST /api/bootstrap`; `POST /api/login`, `/api/logout`; `GET /api/me`; `POST /api/me/password` | Health/setup/auth dan ganti sandi (`current_password`, `new_password`) |
| `GET/POST /api/customers?q=...`, `GET/PATCH /api/customers/:id` | Pelanggan & riwayat |
| `GET/POST /api/visits?date=YYYY-MM-DD`, `PATCH /api/visits/:id/status` | Walk-in/visit |
| `GET/POST /api/bookings?date=YYYY-MM-DD`, `GET /api/bookings/:id`, `PATCH /api/bookings/:id/status` | Booking |
| `GET /api/today?date=YYYY-MM-DD` | Hitungan & keuangan terpisah |
| `GET /api/capsters`, `/api/services`; `POST/PATCH /api/owner/capsters[/:id]`, `/api/owner/services[/:id]` | Katalog |
| `GET /api/returns?date=YYYY-MM-DD`, `GET /api/returns/:id` | Pola dan due |
| `POST /api/customers/:id/consent` | Jawaban pelanggan (`status`, `source=customer_explicit`, `notes`) |
| `POST /api/reminders/prepare`, `POST /api/reminders/:id/handoff` | Siapkan dan buka tautan WhatsApp, tidak mengirim |
| `POST /api/owner/import/preview`, `/api/owner/import/commit`; `GET /api/owner/import/runs` | CSV (`csv`, opsional `mapping`; commit memerlukan `confirm_file_id` dari preview) |
| `GET /api/owner/overview`, `/api/owner/audit`; `POST /api/owner/users` | Administrasi |

Untuk create customer/visit/booking, klien mengirim UUID `id` agar retry aman. `booking.people` berisi 1–8 objek `{customer_id?, service_id?, capster_id?}`. Waktu memakai Asia/Jakarta.

## Data dan deployment

D1: `business`, `branch`, `app_user`, `session`, `customer`, `customer_consent`, `capster`, `service`, `price_rule`, `visit`, `booking`, `booking_person`, `sync_run`, `transaction_snapshot`, `reminder`, `reminder_event`, `audit_event`. `0003_import_retention.sql` menambah linkage opsional, provenance dan indeks tanpa menghapus data. `wrangler.jsonc` menggunakan UUID D1 produksi khusus; `--local` memakai data terpisah. Rahasia hanya di Cloudflare Pages secrets.

Lokal: Node.js 22+, `npm install`, `npm run db:migrate:local`, `npm test && npm run typecheck && npm run build`, lalu `pm2 start ecosystem.config.cjs` dan buka http://localhost:3000. Produksi: migrasi dengan `npx wrangler d1 migrations apply bosku-one-system-db --remote`, build, dan CF BYOK `npx wrangler pages deploy dist --project-name bosku-one-system`; jangan deploy tanpa binding D1 benar.

## Pending / batasan

- Gunakan data nyata yang telah diotorisasi untuk menguji commit impor Kasir Pro, tiga kunjungan pada hari berbeda, due candidate dan pesan manual hanya setelah consent pelanggan sungguhan. Tanpa bukti itu, produksi terautentikasi sudah dapat digunakan tetapi gate Phase 4 belum PASS.
- Validasi ekspor Kasir Pro nyata; Excel/XLSX, pemetaan semua kolom dan rekonsiliasi/manual identity review. API Kasir Pro resmi belum diverifikasi/diimplementasikan.
- Daftar riwayat event pengingat di UI, konfigurasi template, offline write queue, BI penuh, baseline retensi, pengujian pilot 7–14 hari. Jangan mengklaim ROI/retention lift sebelum ada bukti.

Lihat `docs/10_BOSKU_COMPLETION_CHECKLIST_AND_DECISION_REGISTER.md` untuk checklist dan batasan saat ini.
