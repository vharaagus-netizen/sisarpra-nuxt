import { prisma } from '~/server/utils/prisma'
import { requireStaffOrTeacher } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireStaffOrTeacher(event)

  const body = await readBody(event)
  const {
    lab_item_id,
    tanggal_tindakan = new Date().toISOString().split('T')[0],
    jenis_tindakan,
    deskripsi,
    status_akhir = 'selesai',
    biaya = 0,
    jadwal_kalibrasi_berikutnya
  } = body || {}

  if (!lab_item_id || !jenis_tindakan || !deskripsi) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Barang lab, jenis tindakan, dan deskripsi servis wajib diisi.',
    })
  }

  const item = await prisma.labItem.findUnique({
    where: { id: BigInt(lab_item_id) }
  })

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data barang laboratorium tidak ditemukan.',
    })
  }

  const updateItemData: any = {}
  if (status_akhir === 'selesai') {
    updateItemData.kondisi = 'baik'
    if (item.stok_tersedia === 0 && item.stok_total > 0 && item.item_type !== 'bahan_habis_pakai') {
      updateItemData.stok_tersedia = item.stok_total
    }
  } else if (status_akhir === 'menunggu_komponen') {
    updateItemData.kondisi = 'rusak_ringan'
  } else if (status_akhir === 'afkir') {
    updateItemData.kondisi = 'rusak_berat'
  }

  if (jadwal_kalibrasi_berikutnya) {
    updateItemData.jadwal_kalibrasi = new Date(jadwal_kalibrasi_berikutnya)
  }

  const [updatedItem, newLog] = await prisma.$transaction([
    prisma.labItem.update({
      where: { id: item.id },
      data: updateItemData,
    }),
    prisma.labMaintenanceLog.create({
      data: {
        lab_item_id: item.id,
        user_id: BigInt(user.id),
        tanggal_tindakan: new Date(tanggal_tindakan),
        jenis_tindakan: String(jenis_tindakan).trim(),
        deskripsi: String(deskripsi).trim(),
        status_akhir: status_akhir || 'selesai',
        biaya: biaya ? BigInt(biaya) : 0n,
      }
    })
  ])

  return {
    success: true,
    message: `Tindakan pemeliharaan/servis untuk ${item.nama_item} berhasil dicatat.`,
    item: updatedItem,
    log: newLog,
  }
})
