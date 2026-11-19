import ExcelJS from 'exceljs'
import { prisma } from '~/server/utils/prisma'
import { requireStaffOrTeacher } from '~/server/utils/auth'

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
  await requireStaffOrTeacher(event)

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

  const filename = filePart.filename || 'data_lab.xlsx'
  const isCsv = filename.toLowerCase().endsWith('.csv')
  const rawRows: any[] = []

  if (isCsv) {
    const content = filePart.data.toString('utf-8')
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File CSV tidak berisi baris data.',
      })
    }

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;]/).map((c) => c.trim().replace(/^["']|["']$/g, ''))
      if (cols.every((c) => !c)) continue
      rawRows.push({
        rowNumber: i + 1,
        lab_type: cols[0] || 'kimia',
        item_type: cols[1] || 'alat',
        kode_item: cols[2] || '',
        nama_item: cols[3] || '',
        kategori: cols[4] || '',
        merk: cols[5] || '',
        stok_total: cols[6] || '1',
        stok_tersedia: cols[7] || '',
        stok_minimum: cols[8] || '1',
        satuan: cols[9] || 'unit',
        kondisi: cols[10] || 'baik',
        lokasi_penyimpanan: cols[11] || '',
        tanggal_kadaluarsa: cols[12] || '',
        jadwal_kalibrasi: cols[13] || '',
        keterangan: cols[14] || '',
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
      if (val.includes('jenis lab') || val.includes('lab type')) headerMap.lab_type = colNumber
      else if (val.includes('tipe') || val.includes('item type')) headerMap.item_type = colNumber
      else if (val.includes('kode')) headerMap.kode_item = colNumber
      else if (val.includes('nama')) headerMap.nama_item = colNumber
      else if (val.includes('kategori')) headerMap.kategori = colNumber
      else if (val.includes('merk') || val.includes('brand')) headerMap.merk = colNumber
      else if (val.includes('total')) headerMap.stok_total = colNumber
      else if (val.includes('tersedia')) headerMap.stok_tersedia = colNumber
      else if (val.includes('minimum')) headerMap.stok_minimum = colNumber
      else if (val.includes('satuan') || val.includes('unit')) headerMap.satuan = colNumber
      else if (val.includes('kondisi')) headerMap.kondisi = colNumber
      else if (val.includes('lokasi') || val.includes('rak') || val.includes('meja')) headerMap.lokasi_penyimpanan = colNumber
      else if (val.includes('kadaluarsa') || val.includes('expired')) headerMap.tanggal_kadaluarsa = colNumber
      else if (val.includes('kalibrasi')) headerMap.jadwal_kalibrasi = colNumber
      else if (val.includes('keterangan') || val.includes('spesifikasi')) headerMap.keterangan = colNumber
    })

    const labCol = headerMap.lab_type || 1
    const typeCol = headerMap.item_type || 2
    const kodeCol = headerMap.kode_item || 3
    const namaCol = headerMap.nama_item || 4
    const katCol = headerMap.kategori || 5
    const merkCol = headerMap.merk || 6
    const totalCol = headerMap.stok_total || 7
    const availCol = headerMap.stok_tersedia || 8
    const minCol = headerMap.stok_minimum || 9
    const unitCol = headerMap.satuan || 10
    const condCol = headerMap.kondisi || 11
    const lokCol = headerMap.lokasi_penyimpanan || 12
    const expCol = headerMap.tanggal_kadaluarsa || 13
    const calCol = headerMap.jadwal_kalibrasi || 14
    const ketCol = headerMap.keterangan || 15

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r)
      const kode = getCleanCellValue(row.getCell(kodeCol))
      const nama = getCleanCellValue(row.getCell(namaCol))

      if (!kode && !nama) continue

      rawRows.push({
        rowNumber: r,
        lab_type: getCleanCellValue(row.getCell(labCol)) || 'kimia',
        item_type: getCleanCellValue(row.getCell(typeCol)) || 'alat',
        kode_item: kode,
        nama_item: nama,
        kategori: getCleanCellValue(row.getCell(katCol)),
        merk: getCleanCellValue(row.getCell(merkCol)),
        stok_total: getCleanCellValue(row.getCell(totalCol)) || '1',
        stok_tersedia: getCleanCellValue(row.getCell(availCol)),
        stok_minimum: getCleanCellValue(row.getCell(minCol)) || '1',
        satuan: getCleanCellValue(row.getCell(unitCol)) || 'unit',
        kondisi: getCleanCellValue(row.getCell(condCol)) || 'baik',
        lokasi_penyimpanan: getCleanCellValue(row.getCell(lokCol)),
        tanggal_kadaluarsa: getCleanCellValue(row.getCell(expCol)),
        jadwal_kalibrasi: getCleanCellValue(row.getCell(calCol)),
        keterangan: getCleanCellValue(row.getCell(ketCol)),
      })
    }
  }

  // Cek duplikasi kode item di database
  const existingItems = await prisma.labItem.findMany({
    select: { id: true, kode_item: true, nama_item: true, lab_type: true }
  })
  const existingMap = new Map(existingItems.map((i) => [i.kode_item.toLowerCase().trim(), i]))
  const usedKodesInBatch = new Set<string>()

  const parsedRows = rawRows.map((r) => {
    const errors: string[] = []

    // 1. Nama
    const namaItem = String(r.nama_item || '').trim()
    if (!namaItem) {
      errors.push('Nama barang/bahan lab wajib diisi')
    }

    // 2. Lab Type
    let labType = String(r.lab_type || 'kimia').trim().toLowerCase()
    if (labType.includes('komp')) labType = 'komputer'
    else if (labType.includes('fisi')) labType = 'fisika'
    else if (labType.includes('kimi')) labType = 'kimia'
    else if (labType.includes('bio')) labType = 'biologi'
    else labType = 'kimia'

    // 3. Item Type
    let itemType = String(r.item_type || 'alat').trim().toLowerCase()
    if (itemType.includes('bahan') || itemType.includes('habis') || itemType.includes('reagen')) itemType = 'bahan_habis_pakai'
    else if (itemType.includes('kit') || itemType.includes('set')) itemType = 'kit'
    else itemType = 'alat'

    // 4. Kode Item
    let kodeItem = String(r.kode_item || '').trim().toUpperCase()
    if (!kodeItem) {
      const prefix = labType.slice(0, 3).toUpperCase()
      const slug = namaItem.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'ITEM'
      kodeItem = `LAB-${prefix}-${slug}-${String(r.rowNumber).padStart(2, '0')}`
    }

    let finalKode = kodeItem
    let counter = 2
    while (usedKodesInBatch.has(finalKode.toLowerCase())) {
      finalKode = `${kodeItem}-${counter}`
      counter++
    }
    usedKodesInBatch.add(finalKode.toLowerCase())

    // 5. Stok
    const total = parseInt(String(r.stok_total).replace(/[^0-9]/g, ''), 10) || 1
    const minimum = parseInt(String(r.stok_minimum).replace(/[^0-9]/g, ''), 10) || 1
    const availParsed = parseInt(String(r.stok_tersedia).replace(/[^0-9]/g, ''), 10)
    const tersedia = isNaN(availParsed) ? total : Math.min(total, Math.max(0, availParsed))

    // 6. Kondisi
    let kondisi = String(r.kondisi || 'baik').trim().toLowerCase()
    if (kondisi.includes('berat') || kondisi.includes('mati')) kondisi = 'rusak_berat'
    else if (kondisi.includes('rusak') || kondisi.includes('ringan')) kondisi = 'rusak_ringan'
    else if (kondisi.includes('habis')) kondisi = 'habis'
    else kondisi = 'baik'

    const isExisting = existingMap.has(finalKode.toLowerCase())

    return {
      rowNumber: r.rowNumber,
      lab_type: labType,
      item_type: itemType,
      kode_item: finalKode,
      nama_item: namaItem,
      kategori: r.kategori ? String(r.kategori).trim() : null,
      merk: r.merk ? String(r.merk).trim() : null,
      stok_total: total,
      stok_tersedia: tersedia,
      stok_minimum: minimum,
      satuan: r.satuan ? String(r.satuan).trim() : 'unit',
      kondisi,
      lokasi_penyimpanan: r.lokasi_penyimpanan ? String(r.lokasi_penyimpanan).trim() : null,
      tanggal_kadaluarsa: r.tanggal_kadaluarsa ? String(r.tanggal_kadaluarsa).trim() : null,
      jadwal_kalibrasi: r.jadwal_kalibrasi ? String(r.jadwal_kalibrasi).trim() : null,
      keterangan: r.keterangan ? String(r.keterangan).trim() : null,
      isValid: errors.length === 0,
      errors,
      action: isExisting ? 'update' : 'create',
      existingItem: isExisting ? existingMap.get(finalKode.toLowerCase()) : null,
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
