import { prisma } from './prisma'

let tableInitialized = false

export async function ensureLockersTable() {
  if (tableInitialized) return

  try {
    // 1. Buat tabel lockers jika belum ada
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS lockers (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        nomor_loker VARCHAR(50) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'tersedia',
        user_id BIGINT NULL,
        nama_pemilik VARCHAR(255) NULL,
        role_pemilik VARCHAR(50) NULL,
        nomor_induk VARCHAR(100) NULL,
        nomor_kontak VARCHAR(100) NULL,
        keperluan TEXT NULL,
        isi_loker TEXT NULL,
        nomor_kunci VARCHAR(100) NULL,
        lokasi VARCHAR(255) DEFAULT 'Koridor Utama Sarpra',
        tanggal_mulai DATE NULL,
        tanggal_selesai DATE NULL,
        catatan TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lockers_status (status),
        INDEX idx_lockers_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    // 2. Cek apakah sudah ada 24 loker di database
    const countResult: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM lockers;`)
    const total = Number(countResult[0]?.total ?? countResult[0]?.TOTAL ?? 0)

    if (total === 0) {
      // Auto-seed 24 loker (LOK-01 s/d LOK-24)
      for (let i = 1; i <= 24; i++) {
        const numStr = String(i).padStart(2, '0')
        const nomorLoker = `LOK-${numStr}`
        const nomorKunci = `K-${numStr}`

        if (i === 1) {
          // Sample Loker 1: Guru Fisika
          await prisma.$executeRawUnsafe(
            `INSERT INTO lockers (nomor_loker, status, nama_pemilik, role_pemilik, nomor_induk, nomor_kontak, keperluan, isi_loker, nomor_kunci, lokasi, tanggal_mulai, catatan)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
            nomorLoker,
            'terisi',
            'Drs. Bambang Sudarsono, M.Pd',
            'guru',
            '197508122000031002',
            '081234567890',
            'Penyimpanan berkas ujian akhir semester & modul ajar fisika',
            '1. Dokumen Soal Ujian Tengah Semester & Kisi-kisi\n2. 2 Unit Multimeter Sanwa & Toolkit Eksperimen\n3. Modul Kurikulum Merdeka & Jurnal Nilai Siswa',
            nomorKunci,
            'Loker Bank A - Koridor Sarpra',
            'Kunci master dipegang petugas lab fisika'
          )
        } else if (i === 2) {
          // Sample Loker 2: Pengurus OSIS
          await prisma.$executeRawUnsafe(
            `INSERT INTO lockers (nomor_loker, status, nama_pemilik, role_pemilik, nomor_induk, nomor_kontak, keperluan, isi_loker, nomor_kunci, lokasi, tanggal_mulai, catatan)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
            nomorLoker,
            'terisi',
            'Anisa Maharani (Ketua OSIS)',
            'siswa',
            '23241005',
            '085798765432',
            'Inventaris dan dokumentasi arsip kegiatan OSIS periode 2026',
            '1. Stempel & Buku Notulen Rapat Pengurus OSIS\n2. 2 Unit Handy Talky (HT) Baofeng & Charger\n3. Dokumen LPJ Lomba Kebersihan Sarpra',
            nomorKunci,
            'Loker Bank A - Koridor Sarpra',
            'Kunci cadangan di ruang pembina kesiswaan'
          )
        } else if (i === 12) {
          // Sample Loker 12: Dalam Perbaikan
          await prisma.$executeRawUnsafe(
            `INSERT INTO lockers (nomor_loker, status, keperluan, nomor_kunci, lokasi, catatan)
             VALUES (?, ?, ?, ?, ?, ?)`,
            nomorLoker,
            'perbaikan',
            'Engsel pintu sedikit berderit dan silinder kunci perlu diganti',
            nomorKunci,
            'Loker Bank A - Koridor Sarpra',
            'Menunggu suku cadang silinder kunci baru dari teknisi sarpra'
          )
        } else {
          // Loker Tersedia
          await prisma.$executeRawUnsafe(
            `INSERT INTO lockers (nomor_loker, status, nomor_kunci, lokasi)
             VALUES (?, 'tersedia', ?, 'Loker Bank A - Koridor Sarpra')`,
            nomorLoker,
            nomorKunci
          )
        }
      }
    }

    tableInitialized = true
  } catch (error) {
    console.error('Error initializing lockers table:', error)
    // Jangan crash, izinkan percobaan ulang berikutnya
  }
}

