-- =====================================================================
-- SISARPRA SMA NUSAPUTERA SEMARANG
-- Database Schema & Initial Seed for TiDB / MySQL
-- =====================================================================

-- Set Character Set & Timezone
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. Table: users
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'siswa' COMMENT 'admin, petugas, guru, siswa',
  `nomor_induk` VARCHAR(100) DEFAULT NULL,
  `no_telepon` VARCHAR(50) DEFAULT NULL,
  `kelas_jurusan` VARCHAR(100) DEFAULT NULL,
  `remember_token` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. Table: categories
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_kategori` VARCHAR(255) NOT NULL,
  `deskripsi` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. Table: rooms
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode_ruang` VARCHAR(100) NOT NULL,
  `nama_ruang` VARCHAR(255) NOT NULL,
  `kapasitas` INT NOT NULL DEFAULT 0,
  `lokasi` VARCHAR(255) DEFAULT NULL,
  `fasilitas` TEXT DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'tersedia' COMMENT 'tersedia, perbaikan, tidak_tersedia',
  `foto` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rooms_kode_ruang_unique` (`kode_ruang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. Table: items
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `items`;
CREATE TABLE `items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `kode_barang` VARCHAR(100) NOT NULL,
  `nama_barang` VARCHAR(255) NOT NULL,
  `merk` VARCHAR(255) DEFAULT NULL,
  `spesifikasi` TEXT DEFAULT NULL,
  `total_stok` INT NOT NULL DEFAULT 1,
  `stok_tersedia` INT NOT NULL DEFAULT 1,
  `kondisi` VARCHAR(50) NOT NULL DEFAULT 'baik' COMMENT 'baik, rusak_ringan, rusak_berat',
  `lokasi_penyimpanan` VARCHAR(255) DEFAULT NULL,
  `foto` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `items_kode_barang_unique` (`kode_barang`),
  KEY `items_category_id_foreign` (`category_id`),
  CONSTRAINT `items_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. Table: room_reservations
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `room_reservations`;
CREATE TABLE `room_reservations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nomor_peminjaman` VARCHAR(100) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `room_id` BIGINT UNSIGNED NOT NULL,
  `tanggal_pinjam` DATE NOT NULL,
  `jam_mulai` TIME NOT NULL,
  `jam_selesai` TIME NOT NULL,
  `tujuan_kegiatan` TEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'pending, disetujui, ditolak, selesai, batal',
  `catatan_petugas` TEXT DEFAULT NULL,
  `approved_by` BIGINT UNSIGNED DEFAULT NULL,
  `kondisi_kebersihan` VARCHAR(50) DEFAULT 'bersih' COMMENT 'bersih, kotor',
  `kondisi_fasilitas` VARCHAR(50) DEFAULT 'baik' COMMENT 'baik, rusak_ringan, rusak_berat',
  `catatan_pengembalian` TEXT DEFAULT NULL,
  `checked_at` TIMESTAMP NULL DEFAULT NULL,
  `checked_by` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_reservations_nomor_peminjaman_unique` (`nomor_peminjaman`),
  KEY `room_reservations_user_id_foreign` (`user_id`),
  KEY `room_reservations_room_id_foreign` (`room_id`),
  KEY `room_reservations_approved_by_foreign` (`approved_by`),
  KEY `room_reservations_checked_by_foreign` (`checked_by`),
  CONSTRAINT `room_reservations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `room_reservations_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `room_reservations_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `room_reservations_checked_by_foreign` FOREIGN KEY (`checked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. Table: item_loans
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `item_loans`;
CREATE TABLE `item_loans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nomor_peminjaman` VARCHAR(100) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `tanggal_pinjam` DATE NOT NULL,
  `tanggal_rencana_kembali` DATE NOT NULL,
  `tanggal_realisasi_kembali` DATETIME DEFAULT NULL,
  `keperluan` TEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'pending, disetujui, sedang_dipinjam, selesai, ditolak, batal',
  `approved_by` BIGINT UNSIGNED DEFAULT NULL,
  `catatan` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_loans_nomor_peminjaman_unique` (`nomor_peminjaman`),
  KEY `item_loans_user_id_foreign` (`user_id`),
  KEY `item_loans_approved_by_foreign` (`approved_by`),
  CONSTRAINT `item_loans_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `item_loans_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. Table: item_loan_details
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `item_loan_details`;
CREATE TABLE `item_loan_details` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_loan_id` BIGINT UNSIGNED NOT NULL,
  `item_id` BIGINT UNSIGNED NOT NULL,
  `jumlah` INT NOT NULL DEFAULT 1,
  `kondisi_sebelum` VARCHAR(50) DEFAULT 'baik',
  `kondisi_sesudah` VARCHAR(50) DEFAULT NULL,
  `catatan_kondisi` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_loan_details_item_loan_id_foreign` (`item_loan_id`),
  KEY `item_loan_details_item_id_foreign` (`item_id`),
  CONSTRAINT `item_loan_details_item_loan_id_foreign` FOREIGN KEY (`item_loan_id`) REFERENCES `item_loans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `item_loan_details_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. Table: procurement_requests
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `procurement_requests`;
CREATE TABLE `procurement_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `nama_barang` VARCHAR(255) NOT NULL,
  `kategori` VARCHAR(100) DEFAULT 'Umum',
  `jumlah` INT NOT NULL DEFAULT 1,
  `estimasi_biaya` BIGINT DEFAULT NULL,
  `urgensi` VARCHAR(50) DEFAULT 'sedang' COMMENT 'rendah, sedang, tinggi, mendesak',
  `alasan_kebutuhan` TEXT NOT NULL,
  `lokasi_penempatan` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'menunggu_review' COMMENT 'menunggu_review, disetujui, dianggarkan, ditolak, terealisasi',
  `catatan_admin` TEXT DEFAULT NULL,
  `reviewed_by` BIGINT UNSIGNED DEFAULT NULL,
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `procurement_requests_user_id_foreign` (`user_id`),
  KEY `procurement_requests_reviewed_by_foreign` (`reviewed_by`),
  CONSTRAINT `procurement_requests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `procurement_requests_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


-- =====================================================================
-- INITIAL DATA SEED (Pengguna Akun Default, Ruangan, & Inventaris)
-- Password default semua akun: password
-- Bcrypt Hash: $2y$12$e7r9Q6X1qQ66gR76x77.e.x0/Z390K238E1Q.xJdG1o274tL0Qe6S
-- =====================================================================

-- 1. Pengguna Awal
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `nomor_induk`, `no_telepon`, `kelas_jurusan`) VALUES
(1, 'Administrator Sarpra', 'admin@sisarpra.test', '$2y$12$6q53eQc7cM70.G4nO6Z3MeNn/v8wGqJ28o759e6c1.L6yP0e6c1de', 'admin', '198501012010011001', '081234567890', NULL),
(2, 'Petugas Sarana Prasarana', 'petugas@sisarpra.test', '$2y$12$6q53eQc7cM70.G4nO6Z3MeNn/v8wGqJ28o759e6c1.L6yP0e6c1de', 'petugas', '199002022015021002', '081234567891', NULL),
(3, 'Budi Santoso, S.Pd', 'guru@sisarpra.test', '$2y$12$6q53eQc7cM70.G4nO6Z3MeNn/v8wGqJ28o759e6c1.L6yP0e6c1de', 'guru', '198803032014031003', '081234567892', NULL),
(4, 'Ahmad Fauzi (Ketua OSIS)', 'siswa@sisarpra.test', '$2y$12$6q53eQc7cM70.G4nO6Z3MeNn/v8wGqJ28o759e6c1.L6yP0e6c1de', 'siswa', '202310052', '081234567893', 'XI RPL 1')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 2. Kategori Inventaris
INSERT INTO `categories` (`id`, `nama_kategori`, `deskripsi`) VALUES
(1, 'Elektronik & Multimedia', 'Peralatan elektronik penunjang belajar mengajar dan kegiatan sekolah'),
(2, 'Alat Olahraga', 'Peralatan aktivitas jasmani dan ekstrakurikuler'),
(3, 'Peralatan Event & Upacara', 'Perlengkapan panggung, sound, dan keperluan umum sekolah')
ON DUPLICATE KEY UPDATE `nama_kategori`=VALUES(`nama_kategori`);

-- 3. Ruangan Master
INSERT INTO `rooms` (`id`, `kode_ruang`, `nama_ruang`, `kapasitas`, `lokasi`, `fasilitas`, `status`) VALUES
(1, 'LAB-KOM-01', 'Laboratorium Komputer 1', 40, 'Gedung B Lantai 2', '40 Unit PC Client, 1 PC Server, AC 2 Unit, Proyektor Epson, Sound System Mini', 'tersedia'),
(2, 'AULA-UTAMA', 'Aula Pertemuan Utama', 250, 'Gedung Utama Lantai 3', 'Panggung, Sound System Standar Acara, 200 Kursi Lipat, AC Central, 2 Layar Lebar', 'tersedia'),
(3, 'R-MULTIMEDIA', 'Ruang Multimedia & Podcast', 15, 'Gedung C Lantai 1', 'Mic Condenser, Mixer Audio, Green Screen, Kamera Sony, Lighting Studio', 'tersedia'),
(4, 'R-RAPAT-GR', 'Ruang Rapat Guru', 30, 'Gedung A Lantai 1', 'Meja Bundar Konferensi, TV Smart 65 Inch, AC, Whiteboard Kaca', 'tersedia')
ON DUPLICATE KEY UPDATE `nama_ruang`=VALUES(`nama_ruang`);

-- 4. Barang Inventaris Master
INSERT INTO `items` (`id`, `category_id`, `kode_barang`, `nama_barang`, `merk`, `spesifikasi`, `total_stok`, `stok_tersedia`, `kondisi`, `lokasi_penyimpanan`) VALUES
(1, 1, 'ELK-PRJ-001', 'Proyektor Epson EB-X400', 'Epson', '3300 Lumens, HDMI/VGA Port, Tas & Remote lengkap', 4, 4, 'baik', 'Ruang Sarpras Gedung A'),
(2, 1, 'ELK-HDMI-001', 'Kabel HDMI 15 Meter', 'Vention', 'Gold-plated, support 4K 60Hz', 5, 5, 'baik', 'Ruang Sarpras Gedung A'),
(3, 3, 'EVT-MIC-001', 'Wireless Microphone Set (2 Mic)', 'Shure SVX288', 'Dual Handheld Wireless System + Receiver', 3, 3, 'baik', 'Gudang Sound System'),
(4, 3, 'EVT-SPK-001', 'Speaker Portable Trolley 12 Inch', 'Baretone MAX12HB', 'Baterai Cas, Bluetooth, USB, Roda Trolley', 2, 2, 'baik', 'Gudang Sound System'),
(5, 2, 'OLG-BSK-001', 'Bola Basket Molten GG7X', 'Molten', 'Size 7, PU Leather Official Match Ball', 8, 8, 'baik', 'Gudang Olahraga Lapangan')
ON DUPLICATE KEY UPDATE `nama_barang`=VALUES(`nama_barang`);

