import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'
import { toUtcDate } from '~/server/utils/date'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const query = getQuery(event)
  const tab = String(query.tab || 'rooms')
  const startDateStr = query.start_date as string | undefined
  const endDateStr = query.end_date as string | undefined
  const statusFilter = query.status as string | undefined
  const roomIdFilter = query.room_id as string | undefined
  const itemIdFilter = query.item_id as string | undefined

  const [rooms, items] = await Promise.all([
    prisma.room.findMany({ select: { id: true, nama_ruang: true, kode_ruang: true }, orderBy: { nama_ruang: 'asc' } }),
    prisma.item.findMany({ select: { id: true, nama_barang: true, kode_barang: true }, orderBy: { nama_barang: 'asc' } }),
  ])

  let reportData: any[] = []
  let stats: any = {}

  if (tab === 'rooms') {
    const where: any = {}
    if (startDateStr && endDateStr) {
      where.tanggal_pinjam = {
        gte: toUtcDate(startDateStr),
        lte: toUtcDate(endDateStr)
      }
    }
    if (statusFilter) where.status = statusFilter
    if (roomIdFilter) where.room_id = BigInt(roomIdFilter)

    const [list, total, approved, finished, rejected] = await Promise.all([
      prisma.roomReservation.findMany({
        where,
        include: { room: true, user: true, approver: true, checker: true },
        orderBy: { tanggal_pinjam: 'desc' }
      }),
      prisma.roomReservation.count({ where }),
      prisma.roomReservation.count({ where: { ...where, status: 'disetujui' } }),
      prisma.roomReservation.count({ where: { ...where, status: 'selesai' } }),
      prisma.roomReservation.count({ where: { ...where, status: 'ditolak' } }),
    ])

    reportData = list
    stats = { total, approved, finished, rejected }
  } else {
    const where: any = {}
    if (startDateStr && endDateStr) {
      where.tanggal_pinjam = {
        gte: toUtcDate(startDateStr),
        lte: toUtcDate(endDateStr)
      }
    }
    if (statusFilter) where.status = statusFilter
    if (itemIdFilter) {
      where.details = {
        some: { item_id: BigInt(itemIdFilter) }
      }
    }

    const [list, total, active, finished, rejected] = await Promise.all([
      prisma.itemLoan.findMany({
        where,
        include: {
          user: true,
          approver: true,
          details: { include: { item: true } }
        },
        orderBy: { tanggal_pinjam: 'desc' }
      }),
      prisma.itemLoan.count({ where }),
      prisma.itemLoan.count({ where: { ...where, status: 'sedang_dipinjam' } }),
      prisma.itemLoan.count({ where: { ...where, status: 'selesai' } }),
      prisma.itemLoan.count({ where: { ...where, status: 'ditolak' } }),
    ])

    reportData = list
    stats = { total, active, finished, rejected }
  }

  return {
    tab,
    reportData,
    stats,
    rooms,
    items
  }
})

