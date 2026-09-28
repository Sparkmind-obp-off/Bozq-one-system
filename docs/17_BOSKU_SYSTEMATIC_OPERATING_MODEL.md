# BOSKU SYSTEMATIC OPERATING MODEL

## Purpose
Dokumen ini menjadi kontrak desain untuk memindahkan pekerjaan administratif yang repetitif dari kepala/operator ke sistem tanpa menghilangkan pekerjaan manusia yang membutuhkan kehadiran, hubungan, judgment, dan tanggung jawab langsung.

## Principle
Human tetap manusia. Programmatic menangani pekerjaan yang deterministik.

Pemilihan layer:
1. Human — physical work, customer relationship, judgment, accountability.
2. Programmatic — pekerjaan yang dapat direpresentasikan secara digital.
   - Systematic — data, state, search, calculation, workflow, reporting.
   - Automation — trigger/schedule/repetition yang sudah stabil.
   - Agentic — reasoning/orchestration hanya jika systematic dan automation terbukti tidak cukup.

Tidak ada kewajiban naik level. Gunakan layer paling sederhana yang aman.

## Current verified workload map

### Human
- Membuka dan menyiapkan tempat.
- Membersihkan area dan alat.
- Menjaga alat siap digunakan.
- Mencukur/melayani customer.
- Menjaga hubungan customer.
- Menangani situasi customer secara langsung.
- Judgment layanan dan kualitas.
- Review/approval atas data penting.

### Systematic
- Customer lookup.
- Customer history.
- Booking list.
- Visit/service record.
- Harga/service reference.
- Daily operational totals.
- Daily report preparation.
- Opening checklist.
- Stock/checklist status.
- Photo/documentation status.
- Payment/receipt state separation.
- Audit trail.

### Automation candidates
Hanya setelah workflow systematic stabil:
- Daily report preparation.
- Reminder/due detection.
- Checklist alerts.
- Repeated operational prompts.
- Aggregation/scheduled summaries.

### Agentic candidates
Belum diperlukan untuk workload inti saat ini. Kandidat hanya boleh muncul dari observation baru yang menunjukkan reasoning/orchestration kompleks dan measurable value.

## Design contract
Bosku One System harus membuat operator dapat: prepare → serve → clean → supervise tanpa membawa seluruh administrasi di kepala.

## Explicit non-goals
- Bukan pengganti Kasir Pro.
- Bukan autonomous WhatsApp sender.
- Bukan autonomous social media publisher.
- Bukan inventory ERP.
- Bukan agentic system hanya demi terlihat canggih.
- Bukan sumber transaksi alternatif yang bertentangan dengan transaction authority Kasir Pro.

## Kasir Pro boundary
Kasir Pro tetap menjadi transaction authority sampai official integration/API tersedia dan tervalidasi. Bosku One System boleh membantu preparation, context, tracking, reconciliation, dan reporting tanpa memalsukan transaksi.

## Failure-aware design
Service completed, payment recorded, dan receipt printed adalah state yang berbeda. Printer/API/internet failure tidak boleh membuat sistem menganggap sesuatu berhasil hanya karena langkah sebelumnya selesai.

## Stop rule
Jika systematic menyelesaikan workload dengan baik, jangan menambah automation atau agentic layer.
