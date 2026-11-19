import ExcelJS from 'exceljs'
import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

function getCleanCellValue(cell: ExcelJS.Cell | any): string {
  if (!cell || cell.value === null || cell.value === undefined) return ''
  const val = typeof cell.value !== 'undefined' ? cell.value : cell

  if (typeof val === 'object') {
    if ('text' in val && val.text) return String(val.text).trim()
    if ('result' in val && val.result !== undefined) return String(val.result).trim()
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t.text || '').join('').trim()
    }
  }

  const str = String(val).trim()
  if (str === '[object Object]') return ''
  return str
}

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File Excel (.xlsx / .csv) wajib diunggah.',
    })
  }

  const filePart = parts.find((p) => p.name === 'file' || p.filename)
  if (!filePart || !filePart.data || filePart.data.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File yang diunggah kosong atau tidak valid.',
    })
  }

  const filename = filePart.filename || 'data_barang.xlsx'
  const isCsv = filename.toLowerCase().endsWith('.csv')
  const rawRows: any[] = []

  if (isCsv) {
    const content = filePart.data.toString('utf-8')
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File CSV tidak berisi data selain baris header.',
      })
    }

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;]/).map((c) => c.trim().replace(/^["']|["']$/g, ''))
      if (cols.every((c) => !c)) continue
      rawRows.push({
        rowNumber: i + 1,
        kode_barang: cols[0] || '',
        nama_barang: cols[1] || '',
        kategori: cols[2] || '',
        merk: cols[3] || '',
        spesifikasi: cols[4] || '',
        total_stok: cols[5] || '1',
        stok_tersedia: cols[6] || '',
        kondisi: cols[7] || 'baik',
        lokasi_penyimpanan: cols[8] || '',
      })
    }
  } else {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(filePart.data)
    const worksheet = workbook.worksheets[0]
    if (!worksheet || worksheet.rowCount <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File Excel tidak memiliki baris data.',
      })
    }

    const headerMap: Record<string, number> = {}
    const headerRow = worksheet.getRow(1)
    headerRow.eachCell((cell, colNumber) => {
      const val = getCleanCellValue(cell).toLowerCase()
      if (val.includes('kode')) headerMap.kode_barang = colNumber
      else if (val.includes('nama') || val.includes('barang') || val.includes('item')) headerMap.nama_barang = colNumber
      else if (val.includes('kategori') || val.includes('category')) headerMap.kategori = colNumber
      else if (val.includes('merk') || val.includes('brand')) headerMap.merk = colNumber
      else if (val.includes('spek') || val.includes('spesifikasi') || val.includes('deskripsi')) headerMap.spesifikasi = colNumber
      else if (val.includes('total') || val.includes('jumlah') || val.includes('qty')) headerMap.total_stok = colNumber
      else if (val.includes('tersedia') || val.includes('sisa')) headerMap.stok_tersedia = colNumber
      else if (val.includes('kondisi') || val.includes('keadaan')) headerMap.kondisi = colNumber
      else if (val.includes('lokasi') || val.includes('simpan') || val.includes('gudang') || val.includes('tempat')) headerMap.lokasi_penyimpanan = colNumber
    })

    const kodeCol = headerMap.kode_barang || 1
    const namaCol = headerMap.nama_barang || 2
    const katCol = headerMap.kategori || 3
    const merkCol = headerMap.merk || 4
    const spekCol = headerMap.spesifikasi || 5
    const totalCol = headerMap.total_stok || 6
    const availCol = headerMap.stok_tersedia || 7
    const condCol = headerMap.kondisi || 8
    const lokCol = headerMap.lokasi_penyimpanan || 9

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r)
      const kode = getCleanCellValue(row.getCell(kodeCol))
      const nama = getCleanCellValue(row.getCell(namaCol))

      if (!kode && !nama) continue

      rawRows.push({
        rowNumber: r,
        kode_barang: kode,
        nama_barang: nama,
        kategori: getCleanCellValue(row.getCell(katCol)),
        merk: getCleanCellValue(row.getCell(merkCol)),
        spesifikasi: getCleanCellValue(row.getCell(spekCol)),
        total_stok: getCleanCellValue(row.getCell(totalCol)) || '1',
        stok_tersedia: getCleanCellValue(row.getCell(availCol)),
        kondisi: getCleanCellValue(row.getCell(condCol)) || 'baik',
        lokasi_penyimpanan: getCleanCellValue(row.getCell(lokCol)),
      })
    }
  }

  // Preload existing items & categories
  const existingItems = await prisma.item.findMany({
    select: { id: true, kode_barang: true, nama_barang: true, total_stok: true, stok_tersedia: true }
  })
  const existingItemMap = new Map(existingItems.map((i) => [i.kode_barang.toLowerCase().trim(), i]))

  const existingCategories = await prisma.category.findMany({
    select: { id: true, nama_kategori: true }
  })
  const categoryNameMap = new Map(existingCategories.map((c) => [c.nama_kategori.toLowerCase().trim(), c]))

  const usedKodesInBatch = new Set<string>()

  const parsedRows = rawRows.map((r) => {
    const errors: string[] = []

    // 1. Validasi Nama Barang
    const namaBarang = String(r.nama_barang || '').trim()
    if (!namaBarang) {
      errors.push('Nama barang wajib diisi')
    }

    // 2. Kode Barang
    let kodeBarang = String(r.kode_barang || '').trim().toUpperCase()
    if (!kodeBarang) {
      const slug = namaBarang.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'BRG'
      kodeBarang = `BRG-${slug}-${String(r.rowNumber).padStart(2, '0')}`
    }

    // Pastikan unik di batch yang sama
    let finalKode = kodeBarang
    let counter = 2
    while (usedKodesInBatch.has(finalKode.toLowerCase())) {
      finalKode = `${kodeBarang}-${counter}`
      counter++
    }
    usedKodesInBatch.add(finalKode.toLowerCase())

    // 3. Kategori
    const rawKat = String(r.kategori || '').trim() || 'Umum & Peralatan Sekolah'
    const isCatExisting = categoryNameMap.has(rawKat.toLowerCase())

    // 4. Stok
    const totalStokParsed = parseInt(String(r.total_stok).replace(/[^0-9]/g, ''), 10)
    const totalStok = isNaN(totalStokParsed) || totalStokParsed < 1 ? 1 : totalStokParsed

    const availParsed = parseInt(String(r.stok_tersedia).replace(/[^0-9]/g, ''), 10)
    const stokTersedia = isNaN(availParsed) ? totalStok : Math.min(totalStok, Math.max(0, availParsed))

    // 5. Kondisi
    let kondisi = String(r.kondisi || 'baik').trim().toLowerCase()
    if (kondisi.includes('rusak') && (kondisi.includes('berat') || kondisi.includes('parah') || kondisi.includes('mati'))) {
      kondisi = 'rusak_berat'
    } else if (kondisi.includes('rusak') || kondisi.includes('kurang') || kondisi.includes('cacat')) {
      kondisi = 'rusak_ringan'
    } else {
      kondisi = 'baik'
    }

    const isExisting = existingItemMap.has(finalKode.toLowerCase())

    return {
      rowNumber: r.rowNumber,
      kode_barang: finalKode,
      nama_barang: namaBarang,
      kategori: rawKat,
      isNewCategory: !isCatExisting,
      merk: r.merk ? String(r.merk).trim() : null,
      spesifikasi: r.spesifikasi ? String(r.spesifikasi).trim() : null,
      total_stok: totalStok,
      stok_tersedia: stokTersedia,
      kondisi,
      lokasi_penyimpanan: r.lokasi_penyimpanan ? String(r.lokasi_penyimpanan).trim() : null,
      isValid: errors.length === 0,
      errors,
      action: isExisting ? 'update' : 'create',
      existingItem: isExisting ? existingItemMap.get(finalKode.toLowerCase()) : null,
    }
  })

  const validCount = parsedRows.filter((r) => r.isValid).length
  const invalidCount = parsedRows.length - validCount

  return {
    success: true,
    filename,
    total: parsedRows.length,
    validCount,
    invalidCount,
    rows: parsedRows,
  }
})
