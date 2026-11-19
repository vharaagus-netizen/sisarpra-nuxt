# Execution Checklist: Fitur Pengadaan Barang (Sarpra & Laboratorium)

- [x] **Phase 1: Database Schema & TiDB Migration**
  - [x] Perbarui model `ProcurementRequest` di `prisma/schema.prisma` (tambahkan `nomor_pengajuan`, `jenis_pengadaan`, `lab_type`, `item_type`, `satuan`, `spesifikasi`)
  - [x] Eksekusi migrasi DDL pada database TiDB Cloud Serverless
  - [x] Jalankan `npx prisma generate` untuk sinkronisasi Prisma Client
  - [x] Verifikasi skema dengan test script singkat

- [x] **Phase 2: Backend API Endpoints (Strict Staff Access)**
  - [x] Perbarui `server/api/procurements/index.get.ts` (dukung filter `jenis_pengadaan: sarpra|lab`, status, bulan/tahun, ringkasan statistik biaya)
  - [x] Perbarui `server/api/procurements/store.post.ts` (validasi hanya Petugas & Admin, generate otomatis nomor pengajuan resmi)
  - [x] Perbarui `server/api/procurements/review.post.ts` (khusus Admin: update status, catatan admin, reviewer metadata)
  - [x] Buat `server/api/procurements/delete.post.ts` (pembatalan/penghapusan usulan oleh Admin)
  - [x] Uji coba otomatis semua API endpoint

- [x] **Phase 3: Frontend UI & Dokumen Cetak Resmi**
  - [x] Rancang `pages/procurements/index.vue`:
    - [x] Navigasi 2 Tab: 🏢 Pengadaan Sarpra & 🔬 Pengadaan Laboratorium
    - [x] Widget statistik terpisah (Total usulan, disetujui, estimasi anggaran Rp)
    - [x] Modal input Sarpra (Kategori Sarpra, Nama Barang, Penempatan, Urgensi, Biaya)
    - [x] Modal input Lab (Lab Komputer/IPA, Tipe Alat/Bahan Habis Pakai, Satuan, Merk/Spek, Biaya)
    - [x] Modal Tinjau / Review Persetujuan (Khusus Admin)
    - [x] Fitur Cetak Lembar Pengusulan Individual (Kop Surat Nusaputera, nomor surat, detail, 3 kolom tanda tangan)
    - [x] Fitur Cetak Rekapitulasi Laporan Pengadaan Bulanan/Tahunan
  - [x] Perbarui `layouts/default.vue` (posisikan menu di bagian Staff/Petugas & Admin)

- [x] **Phase 4: Build Verification & Deployment**
  - [x] Verifikasi build lokal `npm run build` (Exit code 0, 44 precache entries)
  - [ ] Push pembaruan ke GitHub & Vercel
