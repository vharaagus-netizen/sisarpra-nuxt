import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const query = getQuery(event)
  const role = query.role as string | undefined
  const search = query.search as string | undefined

  const where: any = {}
  if (role) {
    where.role = role
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { nomor_induk: { contains: search } },
      { kelas_jurusan: { contains: search } },
    ]
  }

  const [users, total, countAdmin, countPetugas, countGuru, countSiswa] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nomor_induk: true,
        no_telepon: true,
        kelas_jurusan: true,
        created_at: true,
        updated_at: true,
      }
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.count({ where: { role: 'petugas' } }),
    prisma.user.count({ where: { role: 'guru' } }),
    prisma.user.count({ where: { role: 'siswa' } }),
  ])

  return {
    users,
    stats: {
      total,
      admin: countAdmin,
      petugas: countPetugas,
      guru: countGuru,
      siswa: countSiswa,
    }
  }
})

