# SISARPRA - SMA NUSAPUTERA SEMARANG
## Sistem Informasi Sarana & Prasarana Sekolah (Nuxt 3 Full-Stack + TiDB Cloud)

Aplikasi manajemen sarana dan prasarana sekolah modern berbasis **Nuxt 3**, **Tailwind CSS**, **Nitro Server Engine**, **Prisma ORM**, dan **TiDB Cloud (Serverless MySQL)**.

---

### 🏛️ Identitas & Informasi Sekolah
- **Institusi:** SMA NUSAPUTERA SEMARANG
- **Alamat:** Jl. Ki Mangunsarkoro No.59 Semarang Tengah
- **Telepon:** 024 - 3542444
- **Email:** sma_nusaputera@yahoo.id / info@smanusaputera.sch.id
- **Logo:** `public/images/logo.png`

---

### 🎨 Desain & Animasi Modern
- **Gaya 1 (Minimalis Elegan):** Glassmorphism cards, micro-borders, clean typography (Figtree).
- **Gaya 2 (Aurora Glow):** Ambient gradient mesh orbs di latar belakang (`@keyframes aurora-float-*`).
- **Gaya 4 (Radar Pulse Status):** Indikator status live interaktif (`.status-dot-radar-*`).

---

### 📦 Panduan Instalasi & Menjalankan

#### 1. Persiapan Database di TiDB Cloud
Pastikan database `sisarpra` sudah dibuat di TiDB Cloud SQL Editor:
```sql
CREATE DATABASE IF NOT EXISTS sisarpra;
USE sisarpra;
```
Kemudian salin dan jalankan seluruh isi file `sisarpra_tidb_schema.sql` di SQL Editor TiDB Cloud.

#### 2. Install Dependencies & Generate Prisma Client
Buka Terminal (PowerShell atau Command Prompt) di folder proyek ini:
```bash
cd d:\xampp\htdocs\sisarpra-nuxt
npm install
npx prisma generate
```

#### 3. Jalankan Server Nuxt Development
```bash
npm run dev
```
Aplikasi akan aktif di **`http://localhost:3000`** (atau port network yang ditampilkan di terminal).

---

### 🔑 Akun Demo Pengujian (Password semua akun: `password`)
| Role | Email | Nama Pengguna | Akses |
|---|---|---|---|
| **Super Admin** | `admin@sisarpra.test` | Administrator Sarpra | Akses Penuh: Approval, Master Inventaris, Master Ruang, Rekapitulasi Laporan |
| **Petugas Sarpra** | `petugas@sisarpra.test` | Petugas Sarana Prasarana | Approval Pengajuan, Cek Fisik Pengembalian, Inventarisir |
| **Guru** | `guru@sisarpra.test` | Budi Santoso, S.Pd | Peminjaman Ruang/Barang, Usulan Sarana Baru |
| **Siswa / OSIS** | `siswa@sisarpra.test` | Ahmad Fauzi | Peminjaman Ruang/Barang, Usulan Sarana Baru |

---

### 📄 Fitur Cetak Dokumen Resmi (KOP Surat SMA Nusaputera)
- **Cetak Surat Izin Ruangan:** Tersedia pada menu *Peminjaman Ruang* untuk reservasi yang telah disetujui.
- **Cetak Surat Jalan Barang:** Tersedia pada menu *Peminjaman Barang* untuk peminjaman aktif.
- **Cetak Laporan Rekapitulasi:** Tersedia pada menu *Laporan & Rekapitulasi* lengkap dengan tanda tangan Kepala Sekolah & Koordinator Sarpras.

