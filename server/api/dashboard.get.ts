import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const isStaff = ['admin', 'petugas'].includes(user.role)

  const [
    totalRooms,
    availableRooms,
    totalItems,
    itemsAgg,
    pendingRoomReservations,
    pendingItemLoans,
    activeItemLoans,
    recentRoomReservations,
    recentItemLoans
  ] = await Promise.all([
    prisma.room.count(),
    prisma.room.count({ where: { status: 'tersedia' } }),
    prisma.item.count(),
    prisma.item.aggregate({
      _sum: {
        total_stok: true,
        stok_tersedia: true,
      },
    }),
    prisma.roomReservation.count({ where: { status: 'pending' } }),
    prisma.itemLoan.count({ where: { status: 'pending' } }),
    prisma.itemLoan.count({ where: { status: 'sedang_dipinjam' } }),
    prisma.roomReservation.findMany({
      take: 6,
      orderBy: { created_at: 'desc' },
      include: {
        room: { select: { id: true, nama_ruang: true, kode_ruang: true, lokasi: true } },
        user: { select: { id: true, name: true, role: true } },
      },
      where: isStaff ? {} : { user_id: BigInt(user.id) }
    }),
    prisma.itemLoan.findMany({
      take: 6,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
        details: {
          include: {
            item: { select: { id: true, nama_barang: true, kode_barang: true } }
          }
        }
      },
      where: isStaff ? {} : { user_id: BigInt(user.id) }
    })
  ])

  return {
    stats: {
      total_rooms: totalRooms,
      available_rooms: availableRooms,
      total_items: totalItems,
      available_item_units: itemsAgg._sum.stok_tersedia || 0,
      pending_room_reservations: pendingRoomReservations,
      pending_item_loans: pendingItemLoans,
      active_item_loans: activeItemLoans,
    },
    recentRoomReservations,
    recentItemLoans,
    user
  }
})

