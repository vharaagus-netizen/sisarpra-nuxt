import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readBody(event)
  const {
    id,
    kondisi_kebersihan,
    kondisi_fasilitas,
    checklist_kerusakan,
    catatan_pengembalian,
    set_maintenance
  } = body || {}

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID reservasi diperlukan.' })
  }

  const reservation = await prisma.roomReservation.findUnique({
    where: { id: BigInt(id) },
    include: { room: true }
  })

  if (!reservation || reservation.status !== 'disetujui') {
    throw createError({ statusCode: 400, statusMessage: 'Hanya reservasi yang sudah disetujui yang dapat diselesaikan.' })
  }

  const damagePoints = Array.isArray(checklist_kerusakan) ? checklist_kerusakan : []
  const hasDamage = damagePoints.length > 0 || kondisi_fasilitas !== 'baik' || kondisi_kebersihan === 'kotor'
  const shouldLockMaintenance = set_maintenance !== undefined ? Boolean(set_maintenance) : hasDamage

  let compiledNotes = catatan_pengembalian || ''
  if (damagePoints.length > 0) {
    compiledNotes = `[Kerusakan Ditemukan: ${damagePoints.join(', ')}] ${compiledNotes}`.trim()
  }

  await prisma.$transaction(async (tx) => {
    await tx.roomReservation.update({
      where: { id: BigInt(id) },
      data: {
        status: 'selesai',
        kondisi_kebersihan: kondisi_kebersihan || 'bersih',
        kondisi_fasilitas: kondisi_fasilitas || (damagePoints.length > 0 ? 'rusak_ringan' : 'baik'),
        catatan_pengembalian: compiledNotes || null,
        checked_at: new Date(),
        checked_by: BigInt(staff.id),
      }
    })

    if (shouldLockMaintenance) {
      await tx.room.update({
        where: { id: reservation.room_id },
        data: { status: 'perbaikan' }
      })
    }
  })

  return {
    success: true,
    message: shouldLockMaintenance
      ? `Pemeriksaan selesai! Ruangan "${reservation.room.nama_ruang}" otomatis dikunci ke status Perbaikan (tidak dapat dibooking).`
      : `Pemeriksaan selesai! Ruangan "${reservation.room.nama_ruang}" dalam kondisi baik dan siap digunakan kembali.`
  }
})
