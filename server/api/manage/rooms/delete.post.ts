import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readBody(event)
  const { id } = body || {}

  if (!id) {
    throw createError({ statusCode: 422, statusMessage: 'ID ruangan wajib disertakan.' })
  }

  await prisma.room.delete({
    where: { id: BigInt(id) }
  })

  return { success: true, message: 'Ruangan berhasil dihapus.' }
})

