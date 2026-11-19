import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readBody(event)
  const { id, status, catatan_admin } = body || {}

  if (!id || !status) {
    throw createError({ statusCode: 422, statusMessage: 'ID dan status persetujuan wajib diisi.' })
  }

  const validStatuses = ['menunggu_review', 'disetujui', 'dianggarkan', 'ditolak', 'terealisasi']
  if (!validStatuses.includes(status)) {
    throw createError({ statusCode: 422, statusMessage: 'Status pengadaan tidak valid.' })
  }

  const updated = await prisma.procurementRequest.update({
    where: { id: BigInt(id) },
    data: {
      status,
      catatan_admin: catatan_admin ? String(catatan_admin).trim() : null,
      reviewed_by: BigInt(staff.id),
      reviewed_at: new Date()
    }
  })

  return {
    success: true,
    message: `Status usulan berhasil diperbarui menjadi ${status}.`,
    procurement: updated
  }
})

