import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readBody(event)
  const { id, catatan } = body || {}

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID reservasi diperlukan.' })
  }

  await prisma.roomReservation.update({
    where: { id: BigInt(id) },
    data: {
      status: 'ditolak',
      approved_by: BigInt(staff.id),
      catatan_petugas: catatan || 'Permohonan reservasi ruangan ditolak.',
    }
  })

  return { success: true, message: 'Permohonan reservasi ruangan telah ditolak.' }
})

