import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const { id } = body || {}

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID barang laboratorium wajib disertakan.',
    })
  }

  const existing = await prisma.labItem.findUnique({
    where: { id: BigInt(id) }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data barang laboratorium tidak ditemukan.',
    })
  }

  await prisma.labItem.delete({
    where: { id: BigInt(id) }
  })

  return {
    success: true,
    message: `Barang '${existing.nama_item}' (${existing.kode_item}) berhasil dihapus.`,
  }
})
