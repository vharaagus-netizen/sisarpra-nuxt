import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readBody(event)
  const { id, kode_ruang, nama_ruang, kapasitas, lokasi, fasilitas, status } = body || {}

  if (!kode_ruang || !nama_ruang) {
    throw createError({ statusCode: 422, statusMessage: 'Kode dan nama ruangan wajib diisi.' })
  }

  if (id) {
    // Update existing room
    const updated = await prisma.room.update({
      where: { id: BigInt(id) },
      data: {
        kode_ruang: String(kode_ruang).trim().toUpperCase(),
        nama_ruang: String(nama_ruang).trim(),
        kapasitas: Math.max(0, Number(kapasitas) || 0),
        lokasi: lokasi ? String(lokasi).trim() : null,
        fasilitas: fasilitas ? String(fasilitas).trim() : null,
        status: status || 'tersedia',
      }
    })
    return { success: true, message: 'Data ruangan berhasil diperbarui.', room: updated }
  } else {
    // Check if kode_ruang already exists
    const exists = await prisma.room.findUnique({
      where: { kode_ruang: String(kode_ruang).trim().toUpperCase() }
    })
    if (exists) {
      throw createError({ statusCode: 422, statusMessage: `Kode ruangan ${kode_ruang} sudah digunakan.` })
    }

    const created = await prisma.room.create({
      data: {
        kode_ruang: String(kode_ruang).trim().toUpperCase(),
        nama_ruang: String(nama_ruang).trim(),
        kapasitas: Math.max(0, Number(kapasitas) || 0),
        lokasi: lokasi ? String(lokasi).trim() : null,
        fasilitas: fasilitas ? String(fasilitas).trim() : null,
        status: status || 'tersedia',
      }
    })
    return { success: true, message: 'Ruangan baru berhasil ditambahkan.', room: created }
  }
})

