import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'
import { normalizeSafeUrl } from '~/server/utils/gdrive'

export default defineEventHandler(async (event) => {
  const user = await requireStaff(event)
  const body = await readBody(event)

  const {
    id,
    status,
    ditugaskan_ke,
    tindakan_perbaikan,
    estimasi_biaya,
    realisasi_biaya,
    foto_sesudah,
    catatan_log
  } = body || {}

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID tiket laporan kerusakan wajib disertakan.',
    })
  }

  const existing = await prisma.damageReport.findUnique({
    where: { id: BigInt(id) }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data laporan kerusakan tidak ditemukan.',
    })
  }

  const statusLama = existing.status
  const statusBaru = status || statusLama

  const updateData: any = {
    status: statusBaru,
    updated_at: new Date(),
  }

  if (ditugaskan_ke !== undefined) {
    updateData.ditugaskan_ke = ditugaskan_ke ? BigInt(ditugaskan_ke) : null
  }

  if (tindakan_perbaikan !== undefined) {
    updateData.tindakan_perbaikan = String(tindakan_perbaikan).trim()
  }

  if (estimasi_biaya !== undefined) {
    updateData.estimasi_biaya = estimasi_biaya !== '' && estimasi_biaya !== null
      ? BigInt(Math.max(0, parseInt(estimasi_biaya, 10) || 0))
      : null
  }

  if (realisasi_biaya !== undefined) {
    updateData.realisasi_biaya = realisasi_biaya !== '' && realisasi_biaya !== null
      ? BigInt(Math.max(0, parseInt(realisasi_biaya, 10) || 0))
      : null
  }

  if (foto_sesudah !== undefined) {
    updateData.foto_sesudah = normalizeSafeUrl(foto_sesudah)
  }

  if (statusBaru === 'selesai') {
    updateData.tanggal_selesai = new Date()
  } else if (statusLama === 'selesai' && statusBaru !== 'selesai') {
    updateData.tanggal_selesai = null
  }

  // 1. Update tiket laporan kerusakan
  const updated = await prisma.damageReport.update({
    where: { id: BigInt(id) },
    data: updateData,
  })

  // 2. Buat entri kronologi log pengerjaan
  let logMessage = catatan_log || tindakan_perbaikan
  if (!logMessage) {
    if (statusBaru === 'diproses') logMessage = 'Petugas memulai proses penanganan perbaikan fasilitas.'
    else if (statusBaru === 'tunggu_sparepart') logMessage = 'Menunggu ketersediaan suku cadang / pengadaan sarpras.'
    else if (statusBaru === 'selesai') logMessage = 'Perbaikan selesai dilaksanakan dan fasilitas teruji normal.'
    else if (statusBaru === 'ditolak') logMessage = 'Laporan ditolak oleh petugas sarpras.'
    else logMessage = 'Pembaruan data tiket perbaikan.'
  }

  await prisma.damageActionLog.create({
    data: {
      damage_report_id: BigInt(id),
      user_id: BigInt(user.id),
      status_lama: statusLama,
      status_baru: statusBaru,
      catatan_tindakan: String(logMessage).trim(),
    }
  })

  // 3. Sinkronisasi status kondisi barang inventaris jika perbaikan selesai
  if (statusBaru === 'selesai' && existing.item_id) {
    try {
      await prisma.item.update({
        where: { id: existing.item_id },
        data: { kondisi: 'baik' }
      })
    } catch (e) {
      // Abaikan jika item tidak ditemukan
    }
  }

  return {
    success: true,
    message: `Tiket ${existing.nomor_laporan} berhasil diperbarui menjadi status '${statusBaru.toUpperCase()}'.`,
    report: updated,
  }
})
