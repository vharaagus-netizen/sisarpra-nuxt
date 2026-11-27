import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'
import { DISPOSAL_TX_OPTIONS, parseBigIntId, restoreStockForDisposal } from '~/server/utils/disposals'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readBody(event)
  const { id, restore_stock = true } = body || {}

  if (!id) {
    throw createError({
      statusCode: 422,
      statusMessage: 'ID dokumen pemusnahan wajib disertakan.'
    })
  }

  const disposalId = parseBigIntId(id, 'ID Pemusnahan')

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.disposalRecord.findUnique({
      where: { id: disposalId }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Dokumen pemusnahan tidak ditemukan.'
      })
    }

    if (staff.role !== 'admin') {
      if (String(existing.created_by) !== String(staff.id)) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Anda hanya dapat menghapus pengajuan pemusnahan milik Anda sendiri.'
        })
      }
      if (existing.status !== 'menunggu_persetujuan') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Pengajuan yang sudah diproses Admin tidak dapat dihapus oleh petugas.'
        })
      }
    }

    let restoredCount = 0
    if (existing.stok_terpotong && restore_stock) {
      restoredCount = await restoreStockForDisposal(tx, disposalId)
    }

    await tx.disposalRecord.delete({
      where: { id: disposalId }
    })

    return { nomorSurat: existing.nomor_surat, restoredCount }
  }, DISPOSAL_TX_OPTIONS)

  return {
    success: true,
    message: result.restoredCount > 0
      ? `Dokumen ${result.nomorSurat} dihapus dan stok ${result.restoredCount} item dikembalikan ke inventaris.`
      : `Dokumen pemusnahan ${result.nomorSurat} berhasil dihapus.`
  }
})
