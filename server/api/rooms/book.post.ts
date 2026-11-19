import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'
import { toUtcDate, toUtcTime, formatTimeStr } from '~/server/utils/date'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const isStaff = ['admin', 'petugas'].includes(user.role)
  const body = await readBody(event)

  const { room_id, tanggal_pinjam, jam_mulai, jam_selesai, tujuan_kegiatan, user_id, direct_status } = body || {}

  if (!room_id || !tanggal_pinjam || !jam_mulai || !jam_selesai || !tujuan_kegiatan) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Semua kolom formulir peminjaman wajib diisi.',
    })
  }

  // Tentukan peminjam (borrower)
  let borrowerId = BigInt(user.id)
  let borrowerName = user.name

  if (user_id && String(user_id) !== String(user.id)) {
    if (!isStaff) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Hanya Admin atau Petugas yang dapat membuat peminjaman ruangan atas nama orang lain.',
      })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: BigInt(user_id) },
      select: { id: true, name: true, role: true }
    })

    if (!targetUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Pengguna peminjam yang dipilih tidak ditemukan.',
      })
    }

    borrowerId = targetUser.id
    borrowerName = targetUser.name
  }

  const room = await prisma.room.findUnique({
    where: { id: BigInt(room_id) }
  })

  if (!room) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Ruangan yang dipilih tidak ditemukan.',
    })
  }

  if (room.status !== 'tersedia') {
    throw createError({
      statusCode: 400,
      statusMessage: `Ruangan ini saat ini tidak dapat dipinjam (${room.status}).`,
    })
  }

  const targetDate = toUtcDate(tanggal_pinjam)

  // Cek bentrok jam
  const existingReservations = await prisma.roomReservation.findMany({
    where: {
      room_id: BigInt(room_id),
      tanggal_pinjam: targetDate,
      status: { in: ['pending', 'disetujui'] },
    }
  })

  const conflict = existingReservations.find((res) => {
    // Format jam_mulai & jam_selesai ke string HH:mm
    const startStr = formatTimeStr(res.jam_mulai)
    const endStr = formatTimeStr(res.jam_selesai)
    return jam_mulai < endStr && jam_selesai > startStr
  })

  if (conflict) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Jadwal bentrok! Ruangan sudah dipesan pada rentang jam tersebut.',
    })
  }

  // Generate nomor peminjaman: PR-YYYYMMDD-XXXX
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  const nomorPeminjaman = `PR-${yyyy}${mm}${dd}-${rand}`

  // Parse time to Date for Time(0) in MySQL/Prisma (UTC)
  const startDate = toUtcTime(jam_mulai)
  const endDate = toUtcTime(jam_selesai)

  // Tentukan status awal peminjaman
  let initialStatus = 'pending'
  let approverId: bigint | null = null

  if (isStaff && direct_status === 'disetujui') {
    initialStatus = 'disetujui'
    approverId = BigInt(user.id)
  }

  const reservation = await prisma.roomReservation.create({
    data: {
      nomor_peminjaman: nomorPeminjaman,
      user_id: borrowerId,
      room_id: BigInt(room_id),
      tanggal_pinjam: targetDate,
      jam_mulai: startDate,
      jam_selesai: endDate,
      tujuan_kegiatan: String(tujuan_kegiatan).trim(),
      status: initialStatus,
      approved_by: approverId,
      catatan_petugas: isStaff && approverId ? `Disetujui langsung oleh staf (${user.name}) saat reservasi dibuat` : null,
    }
  })

  let successMsg = 'Pengajuan peminjaman ruangan berhasil dikirim! Menunggu verifikasi petugas sarpra.'
  if (initialStatus === 'disetujui') {
    successMsg = `Peminjaman ruangan atas nama ${borrowerName} berhasil dibuat & langsung disetujui (jadwal terkunci)!`
  }

  return {
    success: true,
    message: successMsg,
    reservation
  }
})

