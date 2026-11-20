import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)

  const search = query.search ? String(query.search).trim() : undefined
  const kelas = query.kelas ? String(query.kelas).trim() : undefined
  const kurikulum = query.kurikulum ? String(query.kurikulum).trim() : undefined
  const sumber_dana = query.sumber_dana ? String(query.sumber_dana).trim() : undefined

  const where: any = {}

  if (kelas && kelas !== 'all') {
    where.kelas = kelas
  }

  if (kurikulum && kurikulum !== 'all') {
    where.kurikulum = kurikulum
  }

  if (sumber_dana && sumber_dana !== 'all') {
    where.sumber_dana = sumber_dana
  }

  if (search) {
    where.OR = [
      { judul: { contains: search } },
      { kode_buku: { contains: search } },
      { penerbit: { contains: search } },
      { mata_pelajaran: { contains: search } },
      { lokasi_rak: { contains: search } }
    ]
  }

  const [books, allBooks] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: [
        { kelas: 'asc' },
        { judul: 'asc' }
      ]
    }),
    prisma.book.findMany({
      select: {
        id: true,
        total_stok: true,
        stok_tersedia: true,
        stok_dipinjam: true,
        sumber_dana: true
      }
    })
  ])

  const stats = {
    total_judul: allBooks.length,
    total_eksemplar: allBooks.reduce((sum, b) => sum + (Number(b.total_stok) || 0), 0),
    stok_tersedia: allBooks.reduce((sum, b) => sum + (Number(b.stok_tersedia) || 0), 0),
    stok_dipinjam: allBooks.reduce((sum, b) => sum + (Number(b.stok_dipinjam) || 0), 0),
    total_bos: allBooks.filter(b => b.sumber_dana.toUpperCase().includes('BOS')).length
  }

  return {
    success: true,
    stats,
    books: {
      data: books
    }
  }
})
