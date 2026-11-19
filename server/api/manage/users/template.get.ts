import ExcelJS from 'exceljs'

export default defineEventHandler(async (event) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SISARPRA - SMA NUSAPUTERA'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Data Pengguna', {
    views: [{ showGridLines: true }]
  })

  // 1. Kolom Header Template
  worksheet.columns = [
    { header: 'Nama Lengkap *', key: 'name', width: 28 },
    { header: 'Email (Boleh Bebas / Kosong)', key: 'email', width: 32 },
    { header: 'Password (Kosong = password)', key: 'password', width: 26 },
    { header: 'Role (admin/petugas/guru/siswa) *', key: 'role', width: 32 },
    { header: 'Nomor Induk (NIP/NIS)', key: 'nomor_induk', width: 24 },
    { header: 'No. Telepon / WA', key: 'no_telepon', width: 20 },
    { header: 'Kelas / Jurusan (Khusus Siswa)', key: 'kelas_jurusan', width: 26 },
  ]

  // Styling Header Row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' } // Indigo 600
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 28

  // 2. Baris Contoh Data
  const sampleData = [
    {
      name: 'Drs. Hendro Wibowo, M.Pd',
      email: 'hendro@sisarpra.test',
      password: 'password',
      role: 'guru',
      nomor_induk: '197505122002121001',
      no_telepon: '081234567890',
      kelas_jurusan: '',
    },
    {
      name: 'Rian Pratama',
      email: 'rian.pratama@sisarpra.test',
      password: 'password',
      role: 'siswa',
      nomor_induk: '202410112',
      no_telepon: '082198765432',
      kelas_jurusan: 'X MIPA 2',
    },
    {
      name: 'Siti Nurhaliza',
      email: 'siti.nur@sisarpra.test',
      password: 'password',
      role: 'petugas',
      nomor_induk: '199508102020012005',
      no_telepon: '085712349876',
      kelas_jurusan: '',
    },
    {
      name: 'Staff IT & Administrator',
      email: 'staff.it@sisarpra.test',
      password: 'password',
      role: 'admin',
      nomor_induk: '199104052019031002',
      no_telepon: '081390123456',
      kelas_jurusan: '',
    },
  ]

  sampleData.forEach((item, index) => {
    const row = worksheet.addRow(item)
    row.alignment = { vertical: 'middle', horizontal: 'left' }
    row.font = { name: 'Arial', size: 10 }
    row.height = 22
    
    // Alternating row background for readability
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' } // Slate 50
      }
    }
  })

  // Border styling untuk seluruh sel tabel
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
    'Content-Disposition': 'attachment; filename="Template_Import_User_SISARPRA.xlsx"',
    'Content-Length': String(buffer.byteLength)
  })

  return buffer
})

