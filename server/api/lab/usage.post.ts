import { prisma } from '~/server/utils/prisma'
import { requireStaffOrTeacher } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireStaffOrTeacher(event)

  const body = await readBody(event)
  const {
    lab_item_id,
    tanggal_praktikum = new Date().toISOString().split('T')[0],
    nama_guru,
    kelas_jurusan,
    judul_praktikum,
    jumlah_digunakan = 1,
    kondisi_alat_kembali = 'baik',
    catatan
  } = body || {}

  if (!lab_item_id || !kelas_jurusan || !judul_praktikum) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Barang lab, kelas rombongan, dan judul praktikum wajib diisi.',
    })
  }

  const qty = Math.max(1, parseInt(jumlah_digunakan, 10) || 1)

  const item = await prisma.labItem.findUnique({
    where: { id: BigInt(lab_item_id) }
  })

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data barang laboratorium tidak ditemukan.',
    })
  }

  let sisaStokSetelahnya = item.stok_tersedia
  let updateData: any = {}

  if (item.item_type === 'bahan_habis_pakai') {
    if (item.stok_tersedia < qty) {
      throw createError({
        statusCode: 400,
        statusMessage: `Stok tidak mencukupi. Stok ${item.nama_item} tersisa ${item.stok_tersedia} ${item.satuan}, sedangkan permintaan pemakaian praktikum adalah ${qty} ${item.satuan}.`,
      })
    }

    sisaStokSetelahnya = item.stok_tersedia - qty
    updateData.stok_tersedia = sisaStokSetelahnya
    if (sisaStokSetelahnya <= 0) {
      updateData.kondisi = 'habis'
    }
  } else {
    // Untuk alat atau kit praktikum
    if (kondisi_alat_kembali === 'ada_pecah' || kondisi_alat_kembali === 'rusak_berat') {
      updateData.kondisi = 'rusak_berat'
    } else if (kondisi_alat_kembali === 'rusak_ringan' || kondisi_alat_kembali === 'perlu_dibersihkan') {
      updateData.kondisi = 'rusak_ringan'
    }
  }

  // Update item stok dan buat log dalam transaction
  const [updatedItem, newLog] = await prisma.$transaction([
    prisma.labItem.update({
      where: { id: item.id },
      data: updateData,
    }),
    prisma.labUsageLog.create({
      data: {
        lab_item_id: item.id,
        user_id: BigInt(user.id),
        tanggal_praktikum: new Date(tanggal_praktikum),
        nama_guru: nama_guru || user.name,
        kelas_jurusan: String(kelas_jurusan).trim(),
        judul_praktikum: String(judul_praktikum).trim(),
        jumlah_digunakan: qty,
        sisa_stok_setelahnya: sisaStokSetelahnya,
        kondisi_alat_kembali: kondisi_alat_kembali || 'baik',
        catatan: catatan ? String(catatan).trim() : null,
      }
    })
  ])

  return {
    success: true,
    message: `Pemakaian praktikum berhasil dicatat. Sisa stok ${item.nama_item}: ${sisaStokSetelahnya} ${item.satuan}.`,
    item: updatedItem,
    log: newLog,
  }
})
