import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const { nama_barang, kategori, jumlah, estimasi_biaya, urgensi, alasan_kebutuhan, lokasi_penempatan } = body || {}

  if (!nama_barang || !alasan_kebutuhan) {
    throw createError({ statusCode: 422, statusMessage: 'Nama barang dan alasan kebutuhan wajib diisi.' })
  }

  const procurement = await prisma.procurementRequest.create({
    data: {
      user_id: BigInt(user.id),
      nama_barang: String(nama_barang).trim(),
      kategori: kategori || 'Umum',
      jumlah: Math.max(1, Number(jumlah) || 1),
      estimasi_biaya: estimasi_biaya ? BigInt(estimasi_biaya) : null,
      urgensi: urgensi || 'sedang',
      alasan_kebutuhan: String(alasan_kebutuhan).trim(),
      lokasi_penempatan: lokasi_penempatan || null,
      status: 'menunggu_review',
    }
  })

  return { success: true, message: 'Usulan sarana baru berhasil diajukan!', procurement }
})

