# Implementation Plan: Fitur Pencatatan & Laporan Kerusakan Sarpras

Fitur ini menyediakan sistem pelaporan dan pelacakan tiket kerusakan fasilitas, barang inventaris, maupun ruangan sekolah secara terpadu untuk SISARPRA SMA Nusaputera Semarang.

---

## Architecture & Dependency Mapping

```
Prisma Schema (DamageReport, DamageActionLog)
        │
        ▼
Server Endpoints:
  ├── server/api/damages/index.get.ts    (Daftar tiket, stats, filter)
  ├── server/api/damages/report.post.ts  (Buat tiket laporan baru)
  ├── server/api/damages/[id].get.ts     (Detail tiket & kronologi log)
  ├── server/api/damages/action.post.ts  (Update status, teknisi, biaya)
  └── server/api/damages/delete.post.ts  (Hapus tiket)
        │
        ▼
UI Components & Pages:
  ├── pages/damages/index.vue            (Dashboard, form lapor, tiket card/table, modal detail & aksi)
  └── layouts/default.vue                (Navigasi sidebar: "🛠️ Laporan Kerusakan")
        │
        ▼
Integration & End-to-End Testing:
  └── test_damages_flow.js               (Pengujian otomatis alur pelaporan hingga selesai)
```

---

## Phased Execution Strategy

### Phase 1: Database Layer & Schema Migration
- Update `prisma/schema.prisma` dengan model `DamageReport` dan `DamageActionLog`.
- Tambahkan relasi inverse pada model `User`, `Room`, dan `Item`.
- Jalankan `npx prisma db push` ke TiDB Cloud dan generate Prisma Client (`npx prisma generate`).
- *Verification Gate*: Script verifikasi koneksi query Prisma untuk tabel baru.

### Phase 2: Backend API Endpoints (H3/Nitro)
- Buat `server/api/damages/index.get.ts`: Ambil tiket dengan pemisahan akses (siswa hanya melihat laporannya; guru/petugas/admin melihat semua), agregasi metrik (Total, Menunggu, Diproses, Selesai, Mendesak), dan opsi filter.
- Buat `server/api/damages/report.post.ts`: Endpoint pengajuan tiket kerusakan dengan validasi input, nomor tiket otomatis (`DMG-YYYYMM-XXXX`), dan sinkronisasi kondisi aset jika `item_id` disertakan.
- Buat `server/api/damages/[id].get.ts`: Detail tiket + relasi user pelapor, teknisi, ruangan, item, dan log riwayat penanganan.
- Buat `server/api/damages/action.post.ts`: Khusus Petugas/Admin untuk memperbarui status pengerjaan, menugaskan teknisi, mengisi catatan tindakan, dan biaya.
- Buat `server/api/damages/delete.post.ts`: Menghapus atau membatalkan tiket.
- *Verification Gate*: Script API automated test (`test_damages_api.js`) memverifikasi status HTTP 200, 401, 403, dan respon JSON.

### Phase 3: Frontend UI Page & Navigation
- Buat halaman `pages/damages/index.vue`:
  - Indikator ringkasan tiket (Statistik Kartu)
  - Tab filter cepat (*Semua, Menunggu Tinjauan, Sedang Dikerjakan, Menunggu Sparepart, Selesai*)
  - Modal Form Buat Laporan Kerusakan (Pilihan Ruang, Barang, Urgensi, Deskripsi, Foto)
  - Tampilan Kartu & Tabel Responsif
  - Modal Detail Kronologi Penanganan (*Action Timeline*)
  - Modal Tindakan Petugas (*Update Status, Teknisi, Biaya*)
- Update `layouts/default.vue`: Tambahkan menu item `🛠️ Laporan Kerusakan` di Menu Utama sidebar.
- *Verification Gate*: SFC compilation check via `@vue/compiler-sfc` dan Nuxt prerender check.

### Phase 4: Integration Testing & Verification
- Menjalankan skenario E2E:
  1. Siswa membuat laporan AC/Proyektor rusak
  2. Petugas melihat tiket masuk dan mengubah status ke `diproses`
  3. Petugas menyelesaikan perbaikan dan mencatat biaya
  4. Siswa melihat status berubah menjadi `selesai`
- Production build validation (`npx nuxi build --prerender false`).
