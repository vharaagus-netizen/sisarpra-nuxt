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

  const filename = filePart.filename || 'data_ruangan.xlsx'
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
        kode_ruang: cols[0] || '',
        nama_ruang: cols[1] || '',
        kapasitas: cols[2] || '40',
        lokasi: cols[3] || '',
        fasilitas: cols[4] || '',
        status: cols[5] || 'tersedia',
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
      if (val.includes('kode')) headerMap.kode_ruang = colNumber
      else if (val.includes('nama') || val.includes('ruang')) headerMap.nama_ruang = colNumber
      else if (val.includes('kapasitas') || val.includes('muat') || val.includes('orang')) headerMap.kapasitas = colNumber
      else if (val.includes('lokasi') || val.includes('gedung') || val.includes('lantai')) headerMap.lokasi = colNumber
      else if (val.includes('fasilitas') || val.includes('sarana')) headerMap.fasilitas = colNumber
      else if (val.includes('status') || val.includes('kondisi')) headerMap.status = colNumber
    })

    const kodeCol = headerMap.kode_ruang || 1
    const namaCol = headerMap.nama_ruang || 2
    const kapCol = headerMap.kapasitas || 3
    const lokCol = headerMap.lokasi || 4
    const fasCol = headerMap.fasilitas || 5
    const statCol = headerMap.status || 6

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r)
      const kode = getCleanCellValue(row.getCell(kodeCol))
      const nama = getCleanCellValue(row.getCell(namaCol))

      if (!kode && !nama) continue

      rawRows.push({
        rowNumber: r,
        kode_ruang: kode,
        nama_ruang: nama,
        kapasitas: getCleanCellValue(row.getCell(kapCol)) || '40',
        lokasi: getCleanCellValue(row.getCell(lokCol)),
        fasilitas: getCleanCellValue(row.getCell(fasCol)),
        status: getCleanCellValue(row.getCell(statCol)) || 'tersedia',
      })
    }
  }

  // Cek duplikasi kode ruang di database saat ini
  const existingRooms = await prisma.room.findMany({
    select: { id: true, kode_ruang: true, nama_ruang: true, status: true }
  })
  const existingRoomMap = new Map(existingRooms.map((r) => [r.kode_ruang.toLowerCase().trim(), r]))

  const usedKodesInBatch = new Set<string>()

  const parsedRows = rawRows.map((r) => {
    const errors: string[] = []

    // 1. Validasi Nama Ruang
    const namaRuang = String(r.nama_ruang || '').trim()
    if (!namaRuang) {
      errors.push('Nama ruangan wajib diisi')
    }

    // 2. Kode Ruang
    let kodeRuang = String(r.kode_ruang || '').trim().toUpperCase()
    if (!kodeRuang) {
      // Auto-generate jika kosong
      const slug = namaRuang.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'RNG'
      kodeRuang = `RNG-${slug}-${String(r.rowNumber).padStart(2, '0')}`
    }

    // Pastikan unik di batch yang sama
    let finalKode = kodeRuang
    let counter = 2
    while (usedKodesInBatch.has(finalKode.toLowerCase())) {
      finalKode = `${kodeRuang}-${counter}`
      counter++
    }
    usedKodesInBatch.add(finalKode.toLowerCase())

    // 3. Kapasitas
    const kapasitasParsed = parseInt(String(r.kapasitas).replace(/[^0-9]/g, ''), 10)
    const kapasitas = isNaN(kapasitasParsed) ? 40 : Math.max(0, kapasitasParsed)

    // 4. Status
    let status = String(r.status || 'tersedia').trim().toLowerCase()
    if (status.includes('perbaikan') || status.includes('rusak') || status.includes('maint')) {
      status = 'perbaikan'
    } else if (status.includes('tidak') || status.includes('tutup') || status.includes('nonaktif')) {
      status = 'tidak_tersedia'
    } else {
      status = 'tersedia'
    }

    const isExisting = existingRoomMap.has(finalKode.toLowerCase())

    return {
      rowNumber: r.rowNumber,
      kode_ruang: finalKode,
      nama_ruang: namaRuang,
      kapasitas,
      lokasi: r.lokasi ? String(r.lokasi).trim() : null,
      fasilitas: r.fasilitas ? String(r.fasilitas).trim() : null,
      status,
      isValid: errors.length === 0,
      errors,
      action: isExisting ? 'update' : 'create',
      existingRoom: isExisting ? existingRoomMap.get(finalKode.toLowerCase()) : null,
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
