import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'
import { normalizeSafeUrl } from '~/server/utils/gdrive'
import { parseBigIntId } from '~/server/utils/disposals'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readBody(event)

  const { id, foto_sebelum, foto_pemusnahan, file_bast_signed } = body || {}
  if (!id) {
    throw createError({
      statusCode: 422,
      statusMessage: 'ID dokumen pemusnahan wajib diisi.'
    })
  }

  const disposalId = parseBigIntId(id, 'ID Pemusnahan')
  const existing = await prisma.disposalRecord.findUnique({
    where: { id: disposalId }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dokumen pemusnahan barang tidak ditemukan.'
    })
  }

  const updated = await prisma.disposalRecord.update({
    where: { id: disposalId },
    data: {
      ...(foto_sebelum !== undefined ? { foto_sebelum: normalizeSafeUrl(foto_sebelum) } : {}),
      ...(foto_pemusnahan !== undefined ? { foto_pemusnahan: normalizeSafeUrl(foto_pemusnahan) } : {}),
      ...(file_bast_signed !== undefined ? { file_bast_signed: normalizeSafeUrl(file_bast_signed) } : {})
    }
  })

  return {
    success: true,
    message: `Lampiran dokumentasi untuk ${existing.nomor_surat} berhasil diperbarui.`,
    disposal: updated
  }
})
