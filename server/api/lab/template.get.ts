import ExcelJS from 'exceljs'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lab = (query.lab as string) || 'semua'

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SISARPRA - SMA NUSAPUTERA'
  workbook.created = new Date()

  // Sheet 1: Template Data Barang Lab
  const worksheet = workbook.addWorksheet('Data Inventaris Lab', {
    views: [{ showGridLines: true }]
  })

  let sampleData: any[] = []
  let filename = 'Template_Import_Inventaris_Lab_SISARPRA.xlsx'

  if (lab === 'kimia') {
    filename = 'Template_Inventaris_Lab_Kimia_SISARPRA.xlsx'
    worksheet.columns = [
      { header: 'Kode Item *', key: 'kode_item', width: 20 },
      { header: 'Nama Bahan / Alat *', key: 'nama_item', width: 32 },
      { header: 'Tipe (bahan_habis_pakai / alat) *', key: 'item_type', width: 30 },
      { header: 'Kategori', key: 'kategori', width: 22 },
      { header: 'Rumus Kimia', key: 'formula', width: 18 },
      { header: 'Wujud / Form (Cair/Padat/Serbuk)', key: 'form', width: 24 },
      { header: 'Kemurnian (PA / Teknis)', key: 'purity', width: 22 },
      { header: 'Satuan (ml / gram / botol / unit) *', key: 'satuan', width: 26 },
      { header: 'Total Stok *', key: 'stok_total', width: 16 },
      { header: 'Stok Tersedia *', key: 'stok_tersedia', width: 16 },
      { header: 'Stok Minimum (Alert)', key: 'stok_minimum', width: 20 },
      { header: 'Tgl Kadaluarsa (YYYY-MM-DD)', key: 'tanggal_kadaluarsa', width: 25 },
      { header: 'Bahaya B3 (korosif/mudah_terbakar/beracun)', key: 'hazard_symbols', width: 36 },
      { header: 'Lokasi Penyimpanan', key: 'lokasi_penyimpanan', width: 28 },
    ]

    sampleData = [
      {
        kode_item: 'KIM-HCL-01',
        nama_item: 'Asam Klorida HCl 1M',
        item_type: 'bahan_habis_pakai',
        kategori: 'Reagen Asam',
        formula: 'HCl',
        form: 'Cair',
        purity: 'Pro Analisis (PA)',
        satuan: 'ml',
        stok_total: 1000,
        stok_tersedia: 650,
        stok_minimum: 250,
        tanggal_kadaluarsa: '2027-12-31',
        hazard_symbols: 'korosif, beracun',
        lokasi_penyimpanan: 'Lemari Asam Khusus B3'
      },
      {
        kode_item: 'KIM-BUR-50',
        nama_item: 'Buret Kaca 50ml Keran Teflon',
        item_type: 'alat',
        kategori: 'Alat Gelas',
        formula: '-',
        form: 'Alat Gelas',
        purity: '-',
        satuan: 'unit',
        stok_total: 12,
        stok_tersedia: 12,
        stok_minimum: 3,
        tanggal_kadaluarsa: '',
        hazard_symbols: '',
        lokasi_penyimpanan: 'Lemari Gelas Kimia Rak 2'
      }
    ]
  } else if (lab === 'komputer') {
    filename = 'Template_Inventaris_Lab_Komputer_SISARPRA.xlsx'
    worksheet.columns = [
      { header: 'Kode Item *', key: 'kode_item', width: 20 },
      { header: 'Nama Komputer / Perangkat *', key: 'nama_item', width: 32 },
      { header: 'Nomor PC (misal PC-01)', key: 'pc_number', width: 22 },
      { header: 'Merk & Tipe', key: 'merk', width: 24 },
      { header: 'Processor (CPU)', key: 'processor', width: 28 },
      { header: 'RAM (GB)', key: 'ram_gb', width: 16 },
      { header: 'Penyimpanan (SSD/HDD)', key: 'storage', width: 24 },
      { header: 'Sistem Operasi (OS)', key: 'os', width: 25 },
      { header: 'Nomor Seri (Serial Number)', key: 'serial_number', width: 26 },
      { header: 'MAC Address', key: 'mac_address', width: 24 },
      { header: 'Kondisi (baik/rusak_ringan/rusak_berat)', key: 'kondisi', width: 34 },
      { header: 'Lokasi Meja / Rak', key: 'lokasi_penyimpanan', width: 28 },
    ]

    sampleData = [
      {
        kode_item: 'KOMP-PC-01',
        nama_item: 'PC Klien Komputer 01',
        pc_number: 'PC-01',
        merk: 'Lenovo ThinkCentre M70s',
        processor: 'Intel Core i5-11400',
        ram_gb: 16,
        storage: '512GB NVMe SSD',
        os: 'Windows 11 Pro 64-bit',
        serial_number: 'MJ09X8A1',
        mac_address: '00:1B:44:11:3A:01',
        kondisi: 'baik',
        lokasi_penyimpanan: 'Lab Komputer 1 - Meja A-01'
      }
    ]
  } else {
    // Format Umum Seluruh Laboratorium
    worksheet.columns = [
      { header: 'Jenis Lab (komputer/fisika/kimia/biologi) *', key: 'lab_type', width: 36 },
      { header: 'Tipe (alat/bahan_habis_pakai/kit) *', key: 'item_type', width: 30 },
      { header: 'Kode Item *', key: 'kode_item', width: 20 },
      { header: 'Nama Barang / Reagen / Alat *', key: 'nama_item', width: 34 },
      { header: 'Kategori', key: 'kategori', width: 24 },
      { header: 'Merk / Produsen', key: 'merk', width: 22 },
      { header: 'Total Stok *', key: 'stok_total', width: 16 },
      { header: 'Stok Tersedia *', key: 'stok_tersedia', width: 16 },
      { header: 'Stok Minimum', key: 'stok_minimum', width: 16 },
      { header: 'Satuan (unit/ml/gram/botol/set) *', key: 'satuan', width: 28 },
      { header: 'Kondisi (baik/rusak_ringan/rusak_berat/habis)', key: 'kondisi', width: 36 },
      { header: 'Lokasi Penyimpanan', key: 'lokasi_penyimpanan', width: 30 },
      { header: 'Tanggal Kadaluarsa (YYYY-MM-DD)', key: 'tanggal_kadaluarsa', width: 28 },
      { header: 'Jadwal Kalibrasi (YYYY-MM-DD)', key: 'jadwal_kalibrasi', width: 28 },
      { header: 'Keterangan Spesifikasi Teknis', key: 'keterangan', width: 45 },
    ]

    sampleData = [
      {
        lab_type: 'komputer',
        item_type: 'alat',
        kode_item: 'KOMP-PC-01',
        nama_item: 'PC Klien Komputer 01',
        kategori: 'Workstation',
        merk: 'Lenovo',
        stok_total: 1,
        stok_tersedia: 1,
        stok_minimum: 1,
        satuan: 'unit',
        kondisi: 'baik',
        lokasi_penyimpanan: 'Lab Komputer 1 Baris A-01',
        tanggal_kadaluarsa: '',
        jadwal_kalibrasi: '',
        keterangan: 'Core i5-11400, 16GB RAM, SSD 512GB, Win 11'
      },
      {
        lab_type: 'kimia',
        item_type: 'bahan_habis_pakai',
        kode_item: 'KIM-HCL-01',
        nama_item: 'Asam Klorida HCl 1M',
        kategori: 'Reagen Asam',
        merk: 'Merck',
        stok_total: 1000,
        stok_tersedia: 650,
        stok_minimum: 250,
        satuan: 'ml',
        kondisi: 'baik',
        lokasi_penyimpanan: 'Lemari Asam Khusus B3',
        tanggal_kadaluarsa: '2027-12-31',
        jadwal_kalibrasi: '',
        keterangan: 'Rumus: HCl, P.A. 1M'
      },
      {
        lab_type: 'fisika',
        item_type: 'kit',
        kode_item: 'FIS-KIT-MEK',
        nama_item: 'Kit Praktikum Mekanika',
        kategori: 'Kit Praktikum',
        merk: 'Pudak Scientific',
        stok_total: 8,
        stok_tersedia: 8,
        stok_minimum: 2,
        satuan: 'set',
        kondisi: 'baik',
        lokasi_penyimpanan: 'Rak Kit Fisika Lemari 1',
        tanggal_kadaluarsa: '',
        jadwal_kalibrasi: '',
        keterangan: 'Lengkap rel, kereta dinamika, ticker timer, pegas'
      },
      {
        lab_type: 'biologi',
        item_type: 'alat',
        kode_item: 'BIO-MIC-01',
        nama_item: 'Mikroskop Siswa Olympus CX23',
        kategori: 'Instrumen Optik',
        merk: 'Olympus',
        stok_total: 1,
        stok_tersedia: 1,
        stok_minimum: 1,
        satuan: 'unit',
        kondisi: 'baik',
        lokasi_penyimpanan: 'Lemari Mikroskop Kaca A-01',
        tanggal_kadaluarsa: '',
        jadwal_kalibrasi: '',
        keterangan: 'Lensa Okuler 10x, Objektif 4x/10x/40x/100x Oil'
      }
    ]
  }

  // Header Styling (Tema Oranye SISARPRA)
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF6F00' } // Orange Primary Accent #FF6F00
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 28

  sampleData.forEach((item, index) => {
    const row = worksheet.addRow(item)
    row.alignment = { vertical: 'middle', horizontal: 'left' }
    row.font = { name: 'Arial', size: 10 }
    row.height = 22

    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF7EE' }
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

  const buffer = await workbook.xlsx.writeBuffer()

  setHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': String(buffer.byteLength)
  })

  return buffer
})
