import ExcelJS from 'exceljs'
import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

// Helper mengekstrak nilai sel dari berbagai tipe data ExcelJS (Hyperlink, RichText, Formula, String, Number)
function getCleanCellValue(cell: ExcelJS.Cell | any): string {
  if (!cell || cell.value === null || cell.value === undefined) return ''
  const val = typeof cell.value !== 'undefined' ? cell.value : cell

  if (typeof val === 'object') {
    // 1. Hyperlink object (e.g. { text: 'mely@gmail.com', hyperlink: 'mailto:mely@gmail.com' })
    if ('text' in val && val.text) return String(val.text).trim()
    if ('hyperlink' in val && val.hyperlink) return String(val.hyperlink).replace(/^mailto:/i, '').trim()

    // 2. Rich text array
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t.text || '').join('').trim()
    }

    // 3. Formula result
    if ('result' in val && val.result !== undefined) return String(val.result).trim()
  }

  const str = String(val).trim()
  if (str === '[object Object]') return ''
  return str.replace(/^mailto:/i, '').trim()
}

// Helper menormalkan email atau membuat email otomatis jika kosong / sembarangan
function normalizeEmail(
  rawEmail: string,
  name: string,
  nomorInduk: string | null,
  rowNumber: number,
  usedEmails: Set<string>
): string {
  let email = (rawEmail || '').trim().toLowerCase()

  // Jika email kosong atau bertuliskan [object object]
  if (!email || email === '[object object]') {
    const slug = (name || `user_${rowNumber}`)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '') || `user${rowNumber}`

    const suffix = nomorInduk ? `.${String(nomorInduk).replace(/[^a-z0-9]/gi, '')}` : ''
    email = `${slug}${suffix}@sisarpra.local`
  } else {
    // Jika user menginput sembarangan (misal: "mely", "guru01", "budi")
    // Tambahkan domain @sisarpra.local agar valid di database unik
    if (!email.includes('@')) {
      const cleanSlug = email.replace(/[^a-z0-9_.-]/g, '') || `user${rowNumber}`
      email = `${cleanSlug}@sisarpra.local`
    }
  }

  // Jamin keunikan email dalam batch yang sama
  let finalEmail = email
  let counter = 2
  while (usedEmails.has(finalEmail)) {
    const parts = email.split('@')
    finalEmail = `${parts[0]}_${counter}@${parts[1] || 'sisarpra.local'}`
    counter++
  }
  usedEmails.add(finalEmail)

  return finalEmail
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

  const filename = filePart.filename || 'data_users.xlsx'
  const isCsv = filename.toLowerCase().endsWith('.csv')
  const rawRows: any[] = []

  if (isCsv) {
    // Parse CSV
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
      if (cols.every((c) => !c)) continue // skip empty line
      rawRows.push({
        rowNumber: i + 1,
        name: cols[0] || '',
        email: cols[1] || '',
        password: cols[2] || '',
        role: cols[3] || 'siswa',
        nomor_induk: cols[4] || '',
        no_telepon: cols[5] || '',
        kelas_jurusan: cols[6] || '',
      })
    }
  } else {
    // Parse Excel (.xlsx / .xls)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(filePart.data)
    const worksheet = workbook.worksheets[0]
    if (!worksheet || worksheet.rowCount <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File Excel tidak memiliki baris data.',
      })
    }

    // Identifikasi kolom berdasarkan header row 1
    const headerMap: Record<string, number> = {}
    const headerRow = worksheet.getRow(1)
    headerRow.eachCell((cell, colNumber) => {
      const val = getCleanCellValue(cell).toLowerCase()
      if (val.includes('nama')) headerMap.name = colNumber
      else if (val.includes('email') || val.includes('surel')) headerMap.email = colNumber
      else if (val.includes('pass') || val.includes('sandi')) headerMap.password = colNumber
      else if (val.includes('role') || val.includes('peran') || val.includes('jabatan')) headerMap.role = colNumber
      else if (val.includes('induk') || val.includes('nip') || val.includes('nis')) headerMap.nomor_induk = colNumber
      else if (val.includes('telepon') || val.includes('wa') || val.includes('hp')) headerMap.no_telepon = colNumber
      else if (val.includes('kelas') || val.includes('jurusan')) headerMap.kelas_jurusan = colNumber
    })

    // Fallback default kolom jika header tidak terdeteksi otomatis
    const nameCol = headerMap.name || 1
    const emailCol = headerMap.email || 2
    const passCol = headerMap.password || 3
    const roleCol = headerMap.role || 4
    const indukCol = headerMap.nomor_induk || 5
    const telpCol = headerMap.no_telepon || 6
    const kelasCol = headerMap.kelas_jurusan || 7

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r)
      const name = getCleanCellValue(row.getCell(nameCol))
      const email = getCleanCellValue(row.getCell(emailCol))
      const induk = getCleanCellValue(row.getCell(indukCol))

      // Lewati baris yang benar-benar kosong
      if (!name && !email && !induk) continue

      rawRows.push({
        rowNumber: r,
        name,
        email,
        password: getCleanCellValue(row.getCell(passCol)),
        role: getCleanCellValue(row.getCell(roleCol)) || 'siswa',
        nomor_induk: induk,
        no_telepon: getCleanCellValue(row.getCell(telpCol)),
        kelas_jurusan: getCleanCellValue(row.getCell(kelasCol)),
      })
    }
  }

  // Ambil daftar email yang sudah terdaftar di database untuk mendeteksi insert vs update
  const existingUsers = await prisma.user.findMany({
    select: { email: true, name: true, role: true }
  })
  const existingEmailMap = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]))

  const usedEmailsInBatch = new Set<string>()

  const parsedRows = rawRows.map((r) => {
    const errors: string[] = []

    // 1. Validasi Nama
    if (!r.name) {
      errors.push('Nama lengkap wajib diisi')
    }

    // 2. Normalisasi Role (Sangat fleksibel)
    let role = (r.role || 'siswa').toLowerCase()
    if (role.includes('admin')) role = 'admin'
    else if (role.includes('petugas') || role.includes('staf') || role.includes('staff') || role.includes('sarpras')) role = 'petugas'
    else if (role.includes('guru') || role.includes('pendidik') || role.includes('pengajar') || role.includes('wali')) role = 'guru'
    else if (role.includes('siswa') || role.includes('siswi') || role.includes('murid') || role.includes('pelajar')) role = 'siswa'
    else role = 'siswa' // default aman

    // 3. Normalisasi Email (Fleksibel & abaikan format ketat, auto-generate jika kosong/sembarangan)
    const email = normalizeEmail(r.email, r.name, r.nomor_induk, r.rowNumber, usedEmailsInBatch)

    const isExisting = existingEmailMap.has(email)

    return {
      rowNumber: r.rowNumber,
      name: r.name,
      email,
      rawEmail: r.email || null,
      password: r.password || 'password',
      role,
      nomor_induk: r.nomor_induk || null,
      no_telepon: r.no_telepon || null,
      kelas_jurusan: r.kelas_jurusan || null,
      isValid: errors.length === 0,
      errors,
      action: isExisting ? 'update' : 'create',
      existingUser: isExisting ? existingEmailMap.get(email) : null
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
