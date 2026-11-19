import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readBody(event)
  const { id } = body || {}

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID peminjaman diperlukan.' })
  }

  const loan = await prisma.itemLoan.findUnique({
    where: { id: BigInt(id) }
  })

  if (!loan || loan.status !== 'disetujui') {
    throw createError({ statusCode: 400, statusMessage: 'Hanya peminjaman berstatus Disetujui yang dapat diserahterimakan.' })
  }

  await prisma.itemLoan.update({
    where: { id: BigInt(id) },
    data: { status: 'sedang_dipinjam' }
  })

  return { success: true, message: 'Barang berhasil ditandai telah diserahkan kepada peminjam!' }
})

