import ExcelJS from 'exceljs'

export default defineEventHandler(async (event) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SISARPRA - SMA NUSAPUTERA'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Data Ruangan', {
    views: [{ showGridLines: true }]
  })

  // 1. Kolom Header Template Ruangan
  worksheet.columns = [
    { header: 'Kode Ruangan *', key: 'kode_ruang', width: 22 },
    { header: 'Nama Ruangan *', key: 'nama_ruang', width: 32 },
    { header: 'Kapasitas (Orang)', key: 'kapasitas', width: 20 },
    { header: 'Lokasi Ruangan', key: 'lokasi', width: 28 },
    { header: 'Fasilitas Ruangan', key: 'fasilitas', width: 45 },
    { header: 'Status (tersedia/perbaikan/tidak_tersedia) *', key: 'status', width: 36 },
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
      kode_ruang: 'RNG-LAB-KOMP1',
      nama_ruang: 'Laboratorium Komputer 1',
      kapasitas: 40,
      lokasi: 'Gedung B Lantai 2',
      fasilitas: '40 PC Core i5, AC 2 PK, Proyektor Epson, Wi-Fi 100Mbps',
      status: 'tersedia'
    },
    {
      kode_ruang: 'RNG-AULA-UTAMA',
      nama_ruang: 'Aula Pertemuan Utama',
      kapasitas: 250,
      lokasi: 'Gedung Utama Lantai 1',
      fasilitas: 'Sound System Line Array, Panggung, AC Central, 250 Kursi',
      status: 'tersedia'
    },
    {
      kode_ruang: 'RNG-LAB-BAHASA',
      nama_ruang: 'Laboratorium Bahasa',
      kapasitas: 36,
      lokasi: 'Gedung B Lantai 1',
      fasilitas: '36 Headset Audio, Komputer Guru, Whiteboard Interaktif',
      status: 'tersedia'
    },
    {
      kode_ruang: 'RNG-RAPAT-GR',
      nama_ruang: 'Ruang Rapat Guru',
      kapasitas: 30,
      lokasi: 'Gedung A Lantai 1',
      fasilitas: 'Meja Rapat Oval, Smart TV 65 Inch, AC, Wi-Fi Sekolah',
      status: 'tersedia'
    },
    {
      kode_ruang: 'RNG-UKR-MEDIS',
      nama_ruang: 'Ruang UKS & Medis',
      kapasitas: 10,
      lokasi: 'Gedung C Lantai 1',
      fasilitas: '3 Tempat Tidur Medis, Kotak P3K Lengkap, Timbangan Badan, AC',
      status: 'tersedia'
    },
  ]

  sampleData.forEach((item, index) => {
    const row = worksheet.addRow(item)
    row.alignment = { vertical: 'middle', horizontal: 'left' }
    row.font = { name: 'Arial', size: 10 }
    row.height = 22

    // Alternating background for easy reading
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF7EE' } // Light Warm Cream #FFF7EE
      }
    }
  })

  // Border styling untuk seluruh sel
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

  const buffer = await workbook.xlsx.writeBuffer()

  setHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="Template_Import_Ruangan_SISARPRA.xlsx"',
    'Content-Length': String(buffer.byteLength)
  })

  return buffer
})
