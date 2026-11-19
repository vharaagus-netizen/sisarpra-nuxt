import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readBody(event)
  const { id } = body || {}

  if (!id) {
    throw createError({ statusCode: 422, statusMessage: 'ID pengadaan wajib disertakan.' })
  }

  const existing = await prisma.procurementRequest.findUnique({
    where: { id: BigInt(id) }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Data pengadaan tidak ditemukan.' })
  }

  // Jika bukan admin, hanya bisa menghapus usulan miliknya yang masih berstatus 'menunggu_review'
  if (staff.role !== 'admin') {
    if (String(existing.user_id) !== String(staff.id)) {
      throw createError({ statusCode: 403, statusMessage: 'Anda hanya dapat menghapus usulan milik Anda sendiri.' })
    }
    if (existing.status !== 'menunggu_review') {
      throw createError({ statusCode: 400, statusMessage: 'Usulan yang sudah ditinjau admin tidak dapat dihapus.' })
    }
  }

  await prisma.procurementRequest.delete({
    where: { id: BigInt(id) }
  })

  return {
    success: true,
    message: 'Data usulan pengadaan berhasil dihapus.'
  }
})
