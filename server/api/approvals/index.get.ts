import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const [
    pendingRoomReservations,
    activeRoomReservations,
    historyRoomReservations,
    pendingItemLoans,
    activeItemLoans,
    historyItemLoans
  ] = await Promise.all([
    // Ruangan
    prisma.roomReservation.findMany({
      where: { status: 'pending' },
      include: {
        room: true,
        user: true,
      },
      orderBy: { tanggal_pinjam: 'desc' }
    }),
    prisma.roomReservation.findMany({
      where: { status: 'disetujui' },
      include: {
        room: true,
        user: true,
        approver: true,
      },
      orderBy: { tanggal_pinjam: 'desc' }
    }),
    prisma.roomReservation.findMany({
      where: { status: { in: ['ditolak', 'selesai', 'batal'] } },
      include: {
        room: true,
        user: true,
        checker: true,
      },
      orderBy: { updated_at: 'desc' },
      take: 20
    }),

    // Barang
    prisma.itemLoan.findMany({
      where: { status: 'pending' },
      include: {
        user: true,
        details: { include: { item: true } },
      },
      orderBy: { tanggal_pinjam: 'desc' }
    }),
    prisma.itemLoan.findMany({
      where: { status: { in: ['disetujui', 'sedang_dipinjam'] } },
      include: {
        user: true,
        details: { include: { item: true } },
        approver: true,
      },
      orderBy: { tanggal_pinjam: 'desc' }
    }),
    prisma.itemLoan.findMany({
      where: { status: { in: ['selesai', 'ditolak', 'batal'] } },
      include: {
        user: true,
        details: { include: { item: true } },
        approver: true,
      },
      orderBy: { updated_at: 'desc' },
      take: 20
    })
  ])

  return {
    pendingRoomReservations,
    activeRoomReservations,
    historyRoomReservations,
    pendingItemLoans,
    activeItemLoans,
    historyItemLoans,
  }
})

