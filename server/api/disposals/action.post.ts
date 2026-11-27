import { prisma } from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { normalizeSafeUrl } from '~/server/utils/gdrive'
import {
  DISPOSAL_STATUSES,
  parseBigIntId,
  deductStockForDisposal
} from '~/server/utils/disposals'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event)

  const {
    id,
    status,
    catatan_admin,
    foto_sebelum,
    foto_pemusnahan,
    file_bast_signed
  } = body || {}

  if (!id || !status) {
    throw createError({
      statusCode: 422,
      statusMessage: 'ID dokumen dan status tindakan wajib diisi.'
    })
  }

  const targetStatus = String(status).trim().toLowerCase()
  if (!(DISPOSAL_STATUSES as readonly string[]).includes(targetStatus)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Status pemusnahan tidak valid.'
    })
  }

  const disposalId = parseBigIntId(id, 'ID Pemusnahan')
  const adminId = BigInt(admin.id)

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.disposalRecord.findUnique({
      where: { id: disposalId }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Dokumen pemusnahan barang tidak ditemukan.'
      })
    }

    if (existing.stok_terpotong && targetStatus !== 'selesai') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Pemusnahan yang sudah dieksekusi dan memotong stok tidak dapat dikembalikan ke status draft/ditolak.'
      })
    }

    const updateData: any = {
      status: targetStatus,
      catatan_admin: catatan_admin !== undefined
        ? (catatan_admin ? String(catatan_admin).trim() : null)
        : existing.catatan_admin
    }

    if (foto_sebelum !== undefined) {
      updateData.foto_sebelum = normalizeSafeUrl(foto_sebelum)
    }
    if (foto_pemusnahan !== undefined) {
      updateData.foto_pemusnahan = normalizeSafeUrl(foto_pemusnahan)
    }
    if (file_bast_signed !== undefined) {
      updateData.file_bast_signed = normalizeSafeUrl(file_bast_signed)
    }

    if (targetStatus === 'disetujui' || targetStatus === 'selesai' || targetStatus === 'ditolak') {
      updateData.approved_by = adminId
      updateData.approved_at = existing.approved_at || new Date()
    }

    await tx.disposalRecord.update({
      where: { id: disposalId },
      data: updateData
    })

    let deductedInventories = 0
    if (targetStatus === 'selesai' && !existing.stok_terpotong) {
      deductedInventories = await deductStockForDisposal(tx, disposalId, existing.nomor_surat, adminId)
    }

    const updated = await tx.disposalRecord.findUnique({
      where: { id: disposalId },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        approver: { select: { id: true, name: true, role: true } },
        items: true
      }
    })

    return { updated, deductedInventories, nomorSurat: existing.nomor_surat }
  })

  let message = `Status Berita Acara ${result.nomorSurat} diperbarui menjadi "${targetStatus}".`
  if (targetStatus === 'disetujui') {
    message = `Pengajuan ${result.nomorSurat} disetujui dan siap dimusnahkan (stok belum dipotong sampai eksekusi selesai).`
  } else if (targetStatus === 'selesai') {
    message = `Pemusnahan ${result.nomorSurat} selesai dieksekusi! Stok inventaris terkait otomatis disesuaikan.`
  } else if (targetStatus === 'ditolak') {
    message = `Pengajuan pemusnahan ${result.nomorSurat} ditolak.`
  }

  return {
    success: true,
    message,
    disposal: result.updated,
    deductedInventories: result.deductedInventories
  }
})
