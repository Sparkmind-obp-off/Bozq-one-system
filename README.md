# Bosku One System

Lapisan operasional Bosku Cukur untuk pelanggan, kunjungan, retensi, kepastian harian, dan visibilitas pemilik. **Kasir Pro tetap sumber transaksi/POS.** Spesifikasi produk lengkap di `docs/01`–`docs/11`.

## Status implementasi (Sesi 1 / Fase 1)

- **Selesai:** aplikasi Hono + Cloudflare Pages, tampilan responsif dasar, migrasi D1 untuk domain inti, inisialisasi pemilik sekali pakai, login/logout dengan cookie HttpOnly, akun operator/capster dibuat pemilik, pembatasan owner di server, audit pembuatan akun, error handling, serta tes fondasi.
- **Belum:** CRUD pelanggan/kunjungan dan walk-in, Today, booking, CSV/Excel impor, return engine, reminder, BI aktual, antrean offline, penerimaan skenario A–M, dan pilot. Kartu modul yang belum tersedia sengaja tidak dapat diklik.
- **Status deploy:** belum dideploy ke produksi. Akun Cloudflare BYOK sudah terautentikasi, tetapi pembuatan D1 baru gagal karena kuota akun penuh. ID D1 di `wrangler.jsonc` adalah **placeholder lokal**, BUKAN database produksi. Jangan deploy sebelum mendapat D1 Bosku tersendiri, mengganti ID, menerapkan migrasi, dan mengatur secret. Jangan menghapus/menggunakan D1 milik proyek lain tanpa persetujuan.

## Cara menjalankan lokal

Persyaratan Node.js 22+ dan npm. Tidak ada kredensial default.

```sh
npm install
cp .dev.vars.example .dev.vars
# Ubah BOOTSTRAP_TOKEN di .dev.vars menjadi token acak >= 32 karakter; jangan commit.
npm run db:migrate:local
npm run typecheck && npm test && npm run build
pm2 start ecosystem.config.cjs
# Buka http://localhost:3000 dan siapkan akun pemilik dengan token tadi.
```

`npm run dev:sandbox` menjalankan Wrangler langsung untuk lingkungan non-PM2. `pm2 delete bosku-one-system` menghentikan preview. Database lokal di `.wrangler/` terpisah dari produksi. Jangan memakai password uji di lingkungan nyata.

## Entry point

| Jalur | Akses | Fungsi |
|---|---|---|
| `/` | publik | Halaman masuk/inisialisasi; modul mendatang ditandai jelas |
| `GET /api/status` | publik | Status inisialisasi, tanpa detail pribadi |
| `POST /api/bootstrap` | secret `X-Bootstrap-Token` | Buat pemilik pertama satu kali; body `name,username,password` |
| `POST /api/login` | publik | Masuk; body `username,password` |
| `POST /api/logout` | sesi | Hapus sesi |
| `GET /api/me` | sesi | Profil/peran pengguna aktif |
| `GET /api/owner/overview` | owner | Hitungan data dasar (bukan revenue) |
| `GET /api/owner/audit` | owner | 50 catatan audit terakhir |
| `POST /api/owner/users` | owner | Buat operator/capster; body `name,username,password,role` |

Mutasi JSON selain bootstrap membutuhkan header `Origin` yang sama dengan situs. Sandi minimal 12 karakter; lima kegagalan login mengunci akun selama 15 menit. Token sesi disimpan sebagai hash SHA-256 di D1, kedaluwarsa dalam tujuh hari. Tidak ada token atau sandi dalam log aplikasi. `BOOTSTRAP_TOKEN` hanya untuk inisialisasi pertama dan harus disimpan sebagai secret di Cloudflare Pages saat produksi.

## Data dan arsitektur

- Hono Worker di Cloudflare Pages; CSS/JS statis di `public/static`.
- D1: `business`, `branch`, `app_user`, `session`, `capster`, `customer`, `customer_consent`, `service`, `price_rule`, `visit`, `booking`, `transaction_snapshot`, `sync_run`, `reminder`, `reminder_event`, `audit_event`.
- Model inti saat ini masih skema awal, bukan bukti semua alur sudah berfungsi. `transaction_snapshot` bersifat snapshot impor, bukan ledger POS. Tidak ada impor/riwayat demo yang dibuat di produksi.
- Username unik; satu cabang default dibuat saat bootstrap tetapi skema memiliki `business_id`/`branch_id` untuk ekspansi di kemudian hari.

## Deploy BYOK (tertahan oleh kapasitas D1)

1. Sediakan **slot D1 baru** di akun Cloudflare pengguna (upgrade kapasitas atau pilih sumber daya yang aman untuk dihapus secara eksplisit). Jangan memakai database proyek lain.
2. `npx wrangler d1 create bosku-one-system-db`; ganti placeholder `database_id` di `wrangler.jsonc` dengan UUID yang diberikan.
3. `npx wrangler d1 migrations apply bosku-one-system-db --remote`.
4. `npx wrangler pages project create bosku-one-system --production-branch main --compatibility-date 2025-09-01` (hanya pertama kali).
5. Atur `BOOTSTRAP_TOKEN` via `npx wrangler pages secret put BOOTSTRAP_TOKEN --project-name bosku-one-system`, gunakan nilai acak >= 32 karakter dari input aman, bukan kode sumber.
6. `npm run build && npx wrangler pages deploy dist --project-name bosku-one-system`; lalu uji URL dan buat pemilik melalui UI. Cek binding D1 di Pages sebelum inisialisasi.

**URL produksi:** belum ada. **GitHub:** https://github.com/Sparkmind-obp-off/Bozq-one-system (branch `main`).

## Langkah berikutnya

Sesi 2 / Sprint 3: pelanggan dan kunjungan, pencarian cepat, riwayat, dan walk-in tanpa booking. Lanjutkan sprint berikutnya sesuai `docs/11`; jangan klaim MVP selesai sebelum skenario penerimaan A–M lolos dan pilot 7–14 hari dimulai.
