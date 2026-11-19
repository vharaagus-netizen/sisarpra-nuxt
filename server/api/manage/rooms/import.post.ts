import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const { rows, updateExisting = true } = body || {}

  if (!Array.isArray(rows) || rows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Daftar ruangan untuk diimport tidak boleh kosong.',
    })
  }

  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0
  const errors: string[] = []

  const existingRooms = await prisma.room.findMany({
    select: { id: true, kode_ruang: true }
  })
  const existingRoomMap = new Map(existingRooms.map((r) => [r.kode_ruang.toLowerCase().trim(), r]))

  for (const item of rows) {
    const namaRuang = String(item.nama_ruang || '').trim()
    const kodeRuang = String(item.kode_ruang || '').trim()

    if (!namaRuang || !kodeRuang) {
      skippedCount++
      errors.push(`Baris ${item.rowNumber || '-'}: Nama atau Kode Ruangan kosong.`)
      continue
    }

    const kapasitas = typeof item.kapasitas === 'number' ? item.kapasitas : parseInt(item.kapasitas || '40', 10) || 40
    const lokasi = item.lokasi ? String(item.lokasi).trim() : null
    const fasilitas = item.fasilitas ? String(item.fasilitas).trim() : null
    const status = item.status || 'tersedia'

    try {
      const existing = existingRoomMap.get(kodeRuang.toLowerCase())

      if (existing) {
        if (!updateExisting) {
          skippedCount++
          continue
        }

        await prisma.room.update({
          where: { id: existing.id },
          data: {
            nama_ruang: namaRuang,
            kapasitas,
            lokasi,
            fasilitas,
            status,
          }
        })
        updatedCount++
      } else {
        const newRoom = await prisma.room.create({
          data: {
            kode_ruang: kodeRuang,
            nama_ruang: namaRuang,
            kapasitas,
            lokasi,
            fasilitas,
            status,
          }
        })
        existingRoomMap.set(kodeRuang.toLowerCase(), newRoom)
        createdCount++
      }
    } catch (err: any) {
      skippedCount++
      errors.push(`Gagal menyimpan ${namaRuang} (${kodeRuang}): ${err?.message || 'Database error'}`)
    }
  }

  return {
    success: true,
    totalReceived: rows.length,
    createdCount,
    updatedCount,
    skippedCount,
    errors,
  }
})
