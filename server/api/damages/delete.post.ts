import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const { id } = body || {}

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID laporan kerusakan wajib disertakan.',
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

  const isStaff = ['admin', 'petugas'].includes(user.role)
  const isOwner = Number(existing.pelapor_id) === user.id

  // Hanya staf atau pemilik laporan (jika masih status 'menunggu') yang boleh menghapus/membatalkan
  if (!isStaff && (!isOwner || existing.status !== 'menunggu')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akses ditolak: Anda tidak memiliki izin menghapus laporan ini.',
    })
  }

  await prisma.damageReport.delete({
    where: { id: BigInt(id) }
  })

  return {
    success: true,
    message: `Tiket ${existing.nomor_laporan} berhasil dihapus/dibatalkan.`,
  }
})
