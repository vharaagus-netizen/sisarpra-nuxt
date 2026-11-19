import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Pastikan respons tidak di-cache oleh browser atau proxy
  setHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  setHeader(event, 'Pragma', 'no-cache')
  setHeader(event, 'Expires', '0')

  const user = await requireUser(event)
  const isStaff = ['admin', 'petugas'].includes(user.role)

  const [items, categories, loans, users] = await Promise.all([
    prisma.item.findMany({
      orderBy: { nama_barang: 'asc' },
      include: {
        category: true,
      }
    }),
    prisma.category.findMany({
      orderBy: { nama_kategori: 'asc' },
    }),
    prisma.itemLoan.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
      where: isStaff ? {} : { user_id: BigInt(user.id) },
      include: {
        user: { select: { id: true, name: true, role: true, nomor_induk: true, kelas_jurusan: true } },
        approver: { select: { id: true, name: true } },
        details: {
          include: {
            item: true,
          }
        }
      }
    }),
    isStaff
      ? prisma.user.findMany({
          orderBy: [{ role: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            nomor_induk: true,
            kelas_jurusan: true
          }
        })
      : Promise.resolve([])
  ])

  return {
    items,
    categories,
    loans: { data: loans },
    users
  }
})
