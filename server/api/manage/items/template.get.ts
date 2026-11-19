import ExcelJS from 'exceljs'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SISARPRA - SMA NUSAPUTERA'
  workbook.created = new Date()

  // Sheet 1: Template Data Barang
  const worksheet = workbook.addWorksheet('Data Barang Inventaris', {
    views: [{ showGridLines: true }]
  })

  // 1. Kolom Header
  worksheet.columns = [
    { header: 'Kode Barang *', key: 'kode_barang', width: 22 },
    { header: 'Nama Barang *', key: 'nama_barang', width: 34 },
    { header: 'Kategori *', key: 'kategori', width: 24 },
    { header: 'Merk / Brand', key: 'merk', width: 22 },
    { header: 'Spesifikasi Lengkap', key: 'spesifikasi', width: 45 },
    { header: 'Total Stok *', key: 'total_stok', width: 16 },
    { header: 'Stok Tersedia', key: 'stok_tersedia', width: 16 },
    { header: 'Kondisi (baik/rusak_ringan/rusak_berat) *', key: 'kondisi', width: 36 },
    { header: 'Lokasi Penyimpanan', key: 'lokasi_penyimpanan', width: 30 },
  ]

  // Styling Header Row (Tema Oranye SISARPRA)
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF6F00' } // Orange Primary Accent #FF6F00
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 28

  // 2. Baris Contoh Data
  const sampleData = [
    {
      kode_barang: 'BRG-ELK-001',
      nama_barang: 'Proyektor Epson EB-X500',
      kategori: 'Elektronik & Multimedia',
      merk: 'Epson',
      spesifikasi: '3600 Lumens, XGA Resolution, Port HDMI & VGA, Remote Asli',
      total_stok: 6,
      stok_tersedia: 6,
      kondisi: 'baik',
      lokasi_penyimpanan: 'Lemari Elektronik Sarpras A1'
    },
    {
      kode_barang: 'BRG-SND-002',
      nama_barang: 'Wireless Microphone Mic Klip',
      kategori: 'Sound System & Audio',
      merk: 'Sennheiser',
      spesifikasi: 'Dual UHF Receiver, Baterai AA 1.5V, Jangkauan 50m Tanpa Hambatan',
      total_stok: 4,
      stok_tersedia: 4,
      kondisi: 'baik',
      lokasi_penyimpanan: 'Gudang Audio Lantai 1'
    },
    {
      kode_barang: 'BRG-OLA-003',
      nama_barang: 'Bola Basket Molten GG7X',
      kategori: 'Peralatan Olahraga',
      merk: 'Molten',
      spesifikasi: 'Kulit Sintetis Composite Premium, Standar FIBA Size 7',
      total_stok: 12,
      stok_tersedia: 10,
      kondisi: 'baik',
      lokasi_penyimpanan: 'Rak Ruang Olahraga Lt. 1'
    },
    {
      kode_barang: 'BRG-KBL-004',
      nama_barang: 'Roll Kabel Listrik 25 Meter',
      kategori: 'Kelistrikan & Perkakas',
      merk: 'Uticon',
      spesifikasi: '4 Stop Kontak Kuningan Berpenutup, Kabel Tembaga 3x1.5mm',
      total_stok: 8,
      stok_tersedia: 8,
      kondisi: 'baik',
      lokasi_penyimpanan: 'Kotak Perkakas Sarpras'
    },
    {
      kode_barang: 'BRG-LAB-005',
      nama_barang: 'Mikroskop Monokuler Siswa',
      kategori: 'Laboratorium Sains',
      merk: 'Olympus',
      spesifikasi: 'Pembesaran 40x - 1000x, Lampu LED Reflektor, Lensa Kaca Halus',
      total_stok: 15,
      stok_tersedia: 14,
      kondisi: 'baik',
      lokasi_penyimpanan: 'Lemari Kaca Lab Biologi'
    },
  ]

  sampleData.forEach((item, index) => {
    const row = worksheet.addRow(item)
    row.alignment = { vertical: 'middle', horizontal: 'left' }
    row.font = { name: 'Arial', size: 10 }
    row.height = 22

    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF7EE' } // Light Warm Cream #FFF7EE
      }
    }
  })

  // Border styling
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      }
    })
  })

  // Sheet 2: Daftar Kategori yang sudah ada di database sebagai referensi
  try {
    const categories = await prisma.category.findMany({
      select: { nama_kategori: true, deskripsi: true },
      orderBy: { nama_kategori: 'asc' }
    })

    if (categories.length > 0) {
      const catSheet = workbook.addWorksheet('Referensi Kategori', {
        views: [{ showGridLines: true }]
      })

      catSheet.columns = [
        { header: 'Nama Kategori yang Terdaftar', key: 'nama_kategori', width: 35 },
        { header: 'Keterangan', key: 'deskripsi', width: 45 },
      ]

      const catHeader = catSheet.getRow(1)
      catHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 }
      catHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE76F51' } // Terracotta #E76F51
      }
      catHeader.height = 26

      categories.forEach((cat) => {
        catSheet.addRow({
          nama_kategori: cat.nama_kategori,
          deskripsi: cat.deskripsi || 'Kategori aset sarana sekolah'
        })
      })
    }
  } catch (e) {
    // Abaikan jika database query gagal pada preview
  }

  const buffer = await workbook.xlsx.writeBuffer()

  setHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="Template_Import_Barang_SISARPRA.xlsx"',
    'Content-Length': String(buffer.byteLength)
  })

  return buffer
})
