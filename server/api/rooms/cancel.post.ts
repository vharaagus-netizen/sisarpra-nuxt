import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const id = body?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID reservasi wajib diisi.',
    })
  }

  const reservation = await prisma.roomReservation.findUnique({
    where: { id: BigInt(id) }
  })

  if (!reservation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Reservasi tidak ditemukan.',
    })
  }

  const isStaff = ['admin', 'petugas'].includes(user.role)
  if (!isStaff && Number(reservation.user_id) !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak berhak membatalkan permohonan ini.',
    })
  }

  if (!['pending', 'disetujui'].includes(reservation.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Reservasi ini sudah tidak dapat dibatalkan.',
    })
  }

  await prisma.roomReservation.update({
    where: { id: BigInt(id) },
    data: { status: 'batal' }
  })

  return {
    success: true,
    message: 'Reservasi ruangan berhasil dibatalkan.'
  }
})

