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

  // Kosongkan alokasi loker
  await prisma.$executeRawUnsafe(
    `UPDATE lockers SET 
      status = 'tersedia',
      user_id = NULL,
      nama_pemilik = NULL,
      role_pemilik = NULL,
      nomor_induk = NULL,
      nomor_kontak = NULL,
      keperluan = NULL,
      isi_loker = NULL,
      tanggal_mulai = NULL,
      tanggal_selesai = NULL,
      catatan = NULL,
      updated_at = NOW()
    WHERE id = ?`,
    id
  )

  return {
    success: true,
    message: `Loker ${existing[0].nomor_loker} berhasil dikosongkan dan berstatus Tersedia.`
  }
})

