# Execution Checklist: Fitur Laporan Kerusakan Sarpras

- [x] **Phase 1: Database Schema & Migration**
  - [x] Tambahkan model `DamageReport` & `DamageActionLog` ke `prisma/schema.prisma`
  - [x] Tambahkan relasi inverse pada model `User`, `Room`, dan `Item`
  - [x] Buat tabel `damage_reports` dan `damage_action_logs` di TiDB Cloud
  - [x] Jalankan `npx prisma generate` untuk memperbarui Prisma Client
  - [x] Verifikasi skema database dengan test query singkat

- [x] **Phase 2: Backend API Endpoints**
  - [x] Buat `server/api/damages/index.get.ts` (Get all/filtered reports + stats)
  - [x] Buat `server/api/damages/report.post.ts` (Create damage report)
  - [x] Buat `server/api/damages/[id].get.ts` (Get detail report with logs)
  - [x] Buat `server/api/damages/action.post.ts` (Update status, technician, cost, action notes)
  - [x] Buat `server/api/damages/delete.post.ts` (Delete damage report)
  - [x] Verifikasi kelima endpoint dengan automated test script

- [x] **Phase 3: Frontend UI & Navigation**
  - [x] Buat `pages/damages/index.vue` dengan nuansa desain oranye SISARPRA
  - [x] Tambahkan link menu `🛠️ Laporan Kerusakan` pada `layouts/default.vue`
  - [x] Verifikasi kompilasi SFC template Vue tanpa error sintaks

- [x] **Phase 4: End-to-End Verification & Health Check**
  - [x] Jalankan integration test penuh (Siswa lapor -> Petugas tangani -> Selesai)
  - [x] Jalankan `npx nuxi build --prerender false` (Exit code 0)
  - [x] Bersihkan file scratch/test sementara
