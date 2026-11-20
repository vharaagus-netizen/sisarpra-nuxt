import { prisma } from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const { id } = body || {}

  if (!id) {
    throw createError({ statusCode: 422, statusMessage: 'ID Berita Acara wajib disertakan.' })
  }

  await prisma.bookHandover.delete({
    where: { id: BigInt(id) }
  })

  return {
    success: true,
    message: 'Dokumen Berita Acara berhasil dihapus.'
  }
})
