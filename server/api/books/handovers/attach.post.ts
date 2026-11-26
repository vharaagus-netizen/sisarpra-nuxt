import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'
import { normalizeSafeUrl } from '~/server/utils/gdrive'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readBody(event)
  const { id, file_bast_signed } = body || {}

  if (!id) {
    throw createError({ statusCode: 422, statusMessage: 'ID Berita Acara wajib diisi.' })
  }

  const existing = await prisma.bookHandover.findUnique({
    where: { id: BigInt(id) }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Data Berita Acara tidak ditemukan.' })
  }

  const safeUrl = normalizeSafeUrl(file_bast_signed)
  const updated = await prisma.bookHandover.update({
    where: { id: BigInt(id) },
    data: {
      file_bast_signed: safeUrl
    }
  })

  return {
    success: true,
    message: safeUrl
      ? `Arsip scan BAST ${existing.nomor_surat} berhasil dilampirkan.`
      : `Lampiran scan BAST ${existing.nomor_surat} berhasil dihapus.`,
    handover: updated
  }
})
