import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const handovers = await prisma.bookHandover.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      creator: { select: { id: true, name: true, role: true } },
      items: {
        include: {
          book: { select: { id: true, kode_buku: true, total_stok: true, stok_tersedia: true } }
        }
      }
    }
  })

  return {
    success: true,
    handovers: {
      data: handovers
    }
  }
})
