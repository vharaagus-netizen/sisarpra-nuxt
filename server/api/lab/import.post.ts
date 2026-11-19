import { prisma } from '~/server/utils/prisma'
import { requireStaffOrTeacher } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaffOrTeacher(event)

  const body = await readBody(event)
  const { rows, updateExisting = true } = body || {}

  if (!Array.isArray(rows) || rows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Daftar barang lab untuk diimport tidak boleh kosong.',
    })
  }

  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0
  const errors: string[] = []

  const existingItems = await prisma.labItem.findMany({
    select: { id: true, kode_item: true }
  })
  const existingMap = new Map(existingItems.map((i) => [i.kode_item.toLowerCase().trim(), i]))

  for (const item of rows) {
    const namaItem = String(item.nama_item || '').trim()
    const kodeItem = String(item.kode_item || '').trim()

    if (!namaItem || !kodeItem) {
      skippedCount++
      errors.push(`Baris ${item.rowNumber || '-'}: Nama atau Kode Item kosong.`)
      continue
    }

    const total = typeof item.stok_total === 'number' ? item.stok_total : parseInt(item.stok_total || '1', 10) || 1
    const minimum = typeof item.stok_minimum === 'number' ? item.stok_minimum : parseInt(item.stok_minimum || '1', 10) || 1
    const tersedia = typeof item.stok_tersedia === 'number' ? item.stok_tersedia : parseInt(item.stok_tersedia || String(total), 10) || total

    const dataPayload: any = {
      lab_type: item.lab_type || 'kimia',
      item_type: item.item_type || 'alat',
      kode_item: kodeItem,
      nama_item: namaItem,
      kategori: item.kategori ? String(item.kategori).trim() : null,
      merk: item.merk ? String(item.merk).trim() : null,
      stok_total: total,
      stok_tersedia: Math.min(total, Math.max(0, tersedia)),
      stok_minimum: minimum,
      satuan: item.satuan || 'unit',
      kondisi: item.kondisi || 'baik',
      lokasi_penyimpanan: item.lokasi_penyimpanan ? String(item.lokasi_penyimpanan).trim() : null,
      tanggal_kadaluarsa: item.tanggal_kadaluarsa ? new Date(item.tanggal_kadaluarsa) : null,
      jadwal_kalibrasi: item.jadwal_kalibrasi ? new Date(item.jadwal_kalibrasi) : null,
      keterangan: item.keterangan ? String(item.keterangan).trim() : null,
    }

    try {
      const existing = existingMap.get(kodeItem.toLowerCase())

      if (existing) {
        if (!updateExisting) {
          skippedCount++
          continue
        }

        await prisma.labItem.update({
          where: { id: existing.id },
          data: dataPayload,
        })
        updatedCount++
      } else {
        const newItem = await prisma.labItem.create({
          data: dataPayload,
        })
        existingMap.set(kodeItem.toLowerCase(), newItem)
        createdCount++
      }
    } catch (err: any) {
      skippedCount++
      errors.push(`Gagal menyimpan ${namaItem} (${kodeItem}): ${err?.message || 'Database error'}`)
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
