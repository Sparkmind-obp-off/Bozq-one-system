# Bosku One System

Sistem operasional pelanggan, walk-in, booking opsional, dan kepastian harian untuk Bosku Cukur. **Kasir Pro tetap POS dan otoritas transaksi.** Lihat `docs/01`–`docs/11` untuk kontrak produk.

## Status (Phase 2 / Sprint 3–4)

**Selesai dan diuji:** autentikasi/peran, pelanggan (buat/ubah/cari/detail/riwayat), WhatsApp dinormalisasi tanpa menggabungkan nama yang mirip, capster dan layanan (buat/ubah/nonaktif/aktif kembali oleh owner), aturan harga berversi, walk-in anonim/teridentifikasi, alur status kunjungan, booking 1–8 orang dengan jejak per orang, layar Today, audit, proyeksi booking terpisah dari aktual Kasir Pro, serta inisialisasi owner lokal tanpa token manual.

**Belum:** jembatan impor CSV/Excel, data transaksi aktual, retensi/due/reminder, antrean offline tersimpan, BI pemilik penuh, skenario penerimaan MVP lintas fase, pilot. Jika jaringan putus, penulisan menampilkan kegagalan dan **tidak** dianggap tersimpan. Operasi cukur fisik tetap bisa berjalan.

**Deploy produksi belum dilakukan:** akun Cloudflare BYOK telah terautentikasi; database D1 Bosku belum dibuat. Upaya sebelumnya terhalang kuota, meski pemeriksaan terbaru menunjukkan kemungkinan slot kembali tersedia. `wrangler.jsonc` mengandung UUID D1 **placeholder hanya untuk lokal**, bukan database produksi. Jangan deploy dengan UUID tersebut; jangan gunakan atau hapus database proyek lain tanpa persetujuan.

## Jalankan secara lokal — tanpa token atau secret manual

Butuh Node.js 22+ dan npm; pemilik memilih username dan sandinya sendiri, **tidak ada sandi default**.

```sh
npm install
npm run db:migrate:local
npm run typecheck && npm test && npm run build
pm2 start ecosystem.config.cjs
# Buka http://localhost:3000 dari mesin yang menjalankan aplikasi,
# lalu buat akun pemilik pertama melalui UI.
```

Tidak perlu `.dev.vars`, API key, atau token bootstrap untuk setup lokal. Inisialisasi tanpa token hanya diterima melalui HTTP loopback (`localhost`/`127.0.0.1`, bukan alamat proxy publik). Setelah ada owner, endpoint inisialisasi tertutup. `npm run dev:sandbox` menjalankan tanpa PM2 di luar sandbox; `pm2 delete bosku-one-system` menghentikan preview. Database lokal berada di `.wrangler/`, terpisah dari produksi. Jangan pakai data pribadi untuk tes di preview sandbox.

## Panduan singkat

1. Pemilik membuat akun, masuk, membuka **Pengaturan** untuk menambah capster/layanan dan harga referensi (opsional), serta akun operator terpisah.
2. **Hari ini → Walk-in cepat:** pilih pelanggan/layanan/capster jika diketahui; semuanya opsional. Lanjutkan Tiba → Dilayani → Selesai. Ini tidak membuat booking ataupun pembayaran.
3. **Pelanggan:** simpan nama dan/atau WhatsApp, cari lalu lihat riwayat; pelanggan bernama sama tidak digabung otomatis.
4. **Booking:** pilih tanggal/jam dan tambah orang/layanan. Terkonfirmasi → Tiba → Dilayani → Selesai, atau Batal/Tidak hadir. Setiap orang memiliki rekam kunjungan tersendiri ketika tiba.
5. **Proyeksi** berdasarkan harga layanan yang diatur saat booking dibuat; tidak ada aktual sampai snapshot transaksi Kasir Pro diimpor pada fase selanjutnya. Harga yang hilang ditandai sebagai proyeksi tidak lengkap.

## API aktif

Semua `/api/*` nonpublik memakai cookie sesi HttpOnly, dan mutasi browser wajib JSON + `Origin` same-origin. Owner-only ditegakkan di server.

| Jalur | Akses | Fungsi |
|---|---|---|
| `/`, `GET /api/status` | publik | UI/status setup |
| `POST /api/bootstrap` | loopback lokal / secret produksi | Buat owner pertama, satu kali |
| `POST /api/login`, `POST /api/logout`, `GET /api/me` | sesuai sesi | Login/logout/profil |
| `GET/POST /api/customers`, `GET/PATCH /api/customers/:id` | tim | Pencarian (q), buat, detail/riwayat, ubah |
| `GET/POST /api/visits`, `PATCH /api/visits/:id/status` | tim | Walk-in dan status; GET menerima `date=YYYY-MM-DD` |
| `GET/POST /api/bookings`, `GET /api/bookings/:id`, `PATCH /api/bookings/:id/status` | tim | Booking multi-orang; GET list menerima `date` |
| `GET /api/today` | tim | Hitungan/proyeksi/aktual; menerima `date` |
| `GET /api/capsters`, `GET /api/services` | tim | Katalog aktif; owner boleh `?all=1` |
| `POST /api/owner/capsters`, `PATCH /api/owner/capsters/:id` | owner | Nama/status capster |
| `POST /api/owner/services`, `PATCH /api/owner/services/:id` | owner | Nama/status layanan & harga referensi |
| `GET /api/owner/overview`, `GET /api/owner/audit`, `POST /api/owner/users` | owner | Fondasi overview/audit/akun |

Untuk `POST /api/customers`, `POST /api/visits`, dan `POST /api/bookings`, kirim `id` UUID buatan klien. Retry dengan ID dan isi sama tidak membuat duplikat; ID sama dengan isi berbeda menghasilkan 409. Booking `people` adalah array 1–8 objek `{customer_id?, service_id?, capster_id?}`; pelanggan utama berlaku hanya untuk orang pertama, tidak otomatis untuk semua. Status terminal tidak dapat dibalik. Waktu booking memakai waktu lokal `Asia/Jakarta` berformat `YYYY-MM-DDTHH:mm`.

## Model data

D1: `business`, `branch`, `app_user`, `session`, `customer`, `capster`, `service`, `price_rule`, `visit`, `booking`, `booking_person`, `customer_consent`, `transaction_snapshot`, `sync_run`, `reminder`, `reminder_event`, `audit_event`. Migrasi `0001_foundation.sql` dan `0002_core_operations.sql` tidak menghapus data lama. `visit.service_id` opsional, dan setiap `booking_person` bisa dikaitkan ke satu visit saat tiba. `booking.projected_value` adalah snapshot referensi harga ketika dibuat; `transaction_snapshot` kelak menampung nilai aktual impor otoritatif. Keduanya tidak saling mengubah. Riwayat harga di `price_rule` mempertahankan tarif lama.

## Deploy BYOK (belum dilakukan)

Setelah slot database tersedia, buat **D1 Bosku tersendiri**: buat `bosku-one-system-db`, ganti UUID placeholder di `wrangler.jsonc`, jalankan `npx wrangler d1 migrations apply bosku-one-system-db --remote`, buat Pages project pada branch `main`, dan deploy `dist/` setelah build. Inisialisasi owner di **produksi** tetap membutuhkan pengamanan khusus: operator deployment dapat menghasilkan nilai acak secara internal dan memasangnya sebagai Pages secret `BOOTSTRAP_TOKEN`; nilainya tidak boleh masuk git/log. Tidak ada token yang perlu diberikan untuk Phase 2 lokal. Pastikan binding D1 benar sebelum deploy; jangan menerbitkan Worker yang menunjuk UUID placeholder.

**Produksi:** belum tersedia. **GitHub:** https://github.com/Sparkmind-obp-off/Bozq-one-system (`main`). **Selanjutnya:** Phase 3 / Sprint 5–6, impor transaksi aman; kemudian retensi/reminder/BI dan hardening sebelum pilot 7–14 hari.
