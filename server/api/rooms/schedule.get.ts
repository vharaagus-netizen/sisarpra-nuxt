import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'
import { toUtcDate } from '~/server/utils/date'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)
  const roomId = query.room_id || query.room
  const dateStr = query.date

  if (!roomId || !dateStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'room_id dan date wajib disertakan.',
    })
  }

  const targetDate = toUtcDate(String(dateStr))

  const bookings = await prisma.roomReservation.findMany({
    where: {
      room_id: BigInt(String(roomId)),
      tanggal_pinjam: targetDate,
      status: { in: ['pending', 'disetujui'] }
    },
    select: {
      id: true,
      jam_mulai: true,
      jam_selesai: true,
      status: true,
      tujuan_kegiatan: true,
      user: {
        select: { name: true, role: true }
      }
    }
  })

  return {
    bookings
  }
})

