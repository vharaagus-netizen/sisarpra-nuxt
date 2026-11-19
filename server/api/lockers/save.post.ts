import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'
import { ensureLockersTable } from '~/server/utils/lockers'

export default defineEventHandler(async (event) => {
  const currentUser = await requireUser(event)
  await ensureLockersTable()

  const body = await readBody(event)
  const id = Number(body?.id)

  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID Loker tidak valid.'
    })
  }

  // Cek keberadaan loker
  const existing: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM lockers WHERE id = ? LIMIT 1;`, id)
  if (!existing || existing.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Loker tidak ditemukan.'
    })
  }

  let status = String(body.status || 'terisi').toLowerCase()
  if (!['tersedia', 'terisi', 'perbaikan'].includes(status)) {
    status = 'terisi'
  }

  const namaPemilik = body.nama_pemilik ? String(body.nama_pemilik).trim() : null
  const rolePemilik = body.role_pemilik ? String(body.role_pemilik).trim() : 'siswa'
  const nomorInduk = body.nomor_induk ? String(body.nomor_induk).trim() : null
  const nomorKontak = body.nomor_kontak ? String(body.nomor_kontak).trim() : null
  const keperluan = body.keperluan ? String(body.keperluan).trim() : null
  const isiLoker = body.isi_loker ? String(body.isi_loker).trim() : null
  const nomorKunci = body.nomor_kunci ? String(body.nomor_kunci).trim() : null
  const lokasi = body.lokasi ? String(body.lokasi).trim() : 'Koridor Utama Sarpra'
  const catatan = body.catatan ? String(body.catatan).trim() : null
  const userId = body.user_id ? Number(body.user_id) : null

  // Validasi jika status 'terisi'
  if (status === 'terisi' && !namaPemilik) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Nama pemilik loker wajib diisi untuk status Terisi.'
    })
  }

  // Jika nama pemilik diisi tapi status masih 'tersedia', otomatis ganti ke 'terisi'
  if (namaPemilik && status === 'tersedia') {
    status = 'terisi'
  }

  // Format tanggal aman
  const parseSafeDate = (d: any) => {
    if (!d || typeof d !== 'string' || !d.trim()) return null
    const parsed = new Date(d)
    return isNaN(parsed.getTime()) ? null : parsed
  }

  const tanggalMulai = parseSafeDate(body.tanggal_mulai) || (status === 'terisi' ? new Date() : null)
  const tanggalSelesai = parseSafeDate(body.tanggal_selesai)

  await prisma.$executeRawUnsafe(
    `UPDATE lockers SET 
      status = ?,
      user_id = ?,
      nama_pemilik = ?,
      role_pemilik = ?,
      nomor_induk = ?,
      nomor_kontak = ?,
      keperluan = ?,
      isi_loker = ?,
      nomor_kunci = ?,
      lokasi = ?,
      tanggal_mulai = ?,
      tanggal_selesai = ?,
      catatan = ?,
      updated_at = NOW()
    WHERE id = ?`,
    status,
    userId,
    namaPemilik,
    rolePemilik,
    nomorInduk,
    nomorKontak,
    keperluan,
    isiLoker,
    nomorKunci,
    lokasi,
    tanggalMulai,
    tanggalSelesai,
    catatan,
    id
  )

  return {
    success: true,
    message: `Data Loker ${existing[0].nomor_loker} berhasil disimpan.`
  }
})
