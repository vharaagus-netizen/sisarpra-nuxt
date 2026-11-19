import { prisma } from '~/server/utils/prisma'
import { requireUser, requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const isStaff = ['admin', 'petugas'].includes(user.role)

  const procurements = await prisma.procurementRequest.findMany({
    orderBy: { created_at: 'desc' },
    where: isStaff ? {} : { user_id: BigInt(user.id) },
    include: {
      user: { select: { id: true, name: true, role: true } },
      reviewer: { select: { id: true, name: true } }
    }
  })

  return {
    procurements: { data: procurements }
  }
})

