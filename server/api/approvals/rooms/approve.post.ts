import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readBody(event)
  const { id } = body || {}

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID reservasi diperlukan.' })
  }

  const reservation = await prisma.roomReservation.findUnique({
    where: { id: BigInt(id) }
  })

  if (!reservation || reservation.status !== 'pending') {
    throw createError({ statusCode: 400, statusMessage: 'Reservasi tidak dapat disetujui (mungkin sudah diproses).' })
  }

  await prisma.roomReservation.update({
    where: { id: BigInt(id) },
    data: {
      status: 'disetujui',
      approved_by: BigInt(staff.id),
    }
  })

  return { success: true, message: `Reservasi ${reservation.nomor_peminjaman} berhasil disetujui!` }
})

