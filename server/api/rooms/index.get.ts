import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'
import { getTodayUtcDate } from '~/server/utils/date'

export default defineEventHandler(async (event) => {
  // Pastikan respons tidak di-cache oleh browser atau proxy
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  setHeader(event, 'Pragma', 'no-cache')
  setHeader(event, 'Expires', '0')

  const user = await requireUser(event)
  const isStaff = ['admin', 'petugas'].includes(user.role)

  const today = getTodayUtcDate()

  const [rooms, reservations, users] = await Promise.all([
    prisma.room.findMany({
      orderBy: { nama_ruang: 'asc' },
      include: {
        reservations: {
          where: {
            tanggal_pinjam: { gte: today },
            status: { in: ['pending', 'disetujui'] }
          },
          select: {
            id: true,
            tanggal_pinjam: true,
            jam_mulai: true,
            jam_selesai: true,
            status: true,
            tujuan_kegiatan: true
          }
        }
      }
    }),
    prisma.roomReservation.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
      where: isStaff ? {} : { user_id: BigInt(user.id) },
      include: {
        room: true,
        user: { select: { id: true, name: true, role: true, nomor_induk: true, kelas_jurusan: true } },
        approver: { select: { id: true, name: true } },
        checker: { select: { id: true, name: true } }
      }
    }),
    isStaff
      ? prisma.user.findMany({
          orderBy: [{ role: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            nomor_induk: true,
            kelas_jurusan: true
          }
        })
      : Promise.resolve([])
  ])

  return {
    rooms,
    reservations: { data: reservations },
    users
  }
})
