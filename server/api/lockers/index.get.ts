import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'
import { ensureLockersTable } from '~/server/utils/lockers'

export default defineEventHandler(async (event) => {
  const currentUser = await requireUser(event)
  await ensureLockersTable()

  const query = getQuery(event)
  const search = (query.search as string || '').trim().toLowerCase()
  const statusFilter = (query.status as string || '').trim().toLowerCase()

  try {
    const rawLockers: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        id,
        nomor_loker,
        status,
        user_id,
        nama_pemilik,
        role_pemilik,
        nomor_induk,
        nomor_kontak,
        keperluan,
        isi_loker,
        nomor_kunci,
        lokasi,
        tanggal_mulai,
        tanggal_selesai,
        catatan,
        created_at,
        updated_at
      FROM lockers
      ORDER BY id ASC
    `)

    const safeDateStr = (val: any) => {
      if (!val) return null
      try {
        const d = new Date(val)
        return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
      } catch {
        return null
      }
    }

    // Format and sanitize rows
    const allLockers = rawLockers.map(row => ({
      id: Number(row.id),
      nomor_loker: String(row.nomor_loker || ''),
      status: String(row.status || 'tersedia'),
      user_id: row.user_id ? Number(row.user_id) : null,
      nama_pemilik: row.nama_pemilik || '',
      role_pemilik: row.role_pemilik || '',
      nomor_induk: row.nomor_induk || '',
      nomor_kontak: row.nomor_kontak || '',
      keperluan: row.keperluan || '',
      isi_loker: row.isi_loker || '',
      nomor_kunci: row.nomor_kunci || '',
      lokasi: row.lokasi || 'Koridor Utama Sarpra',
      tanggal_mulai: safeDateStr(row.tanggal_mulai),
      tanggal_selesai: safeDateStr(row.tanggal_selesai),
      catatan: row.catatan || '',
      created_at: row.created_at,
      updated_at: row.updated_at
    }))

    // Hitung statistik
    const stats = {
      total: allLockers.length,
      tersedia: allLockers.filter(l => l.status === 'tersedia').length,
      terisi: allLockers.filter(l => l.status === 'terisi').length,
      perbaikan: allLockers.filter(l => l.status === 'perbaikan').length
    }

    // Filter jika ada parameter query
    let filteredLockers = allLockers
    if (statusFilter && ['tersedia', 'terisi', 'perbaikan'].includes(statusFilter)) {
      filteredLockers = filteredLockers.filter(l => l.status === statusFilter)
    }

    if (search) {
      filteredLockers = filteredLockers.filter(l => {
        return (
          l.nomor_loker.toLowerCase().includes(search) ||
          l.nama_pemilik.toLowerCase().includes(search) ||
          l.nomor_induk.toLowerCase().includes(search) ||
          l.keperluan.toLowerCase().includes(search) ||
          l.isi_loker.toLowerCase().includes(search) ||
          l.nomor_kunci.toLowerCase().includes(search)
        )
      })
    }

    // Ambil daftar pengguna untuk autocomplete / dropdown pemilihan
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        nomor_induk: true,
        no_telepon: true,
        kelas_jurusan: true
      },
      orderBy: { name: 'asc' }
    })

    return {
      success: true,
      lockers: filteredLockers,
      allLockers: allLockers, // untuk visual cabinet grid lengkap 24 pintu
      stats,
      users: users.map(u => ({ ...u, id: Number(u.id) })),
      currentUser: {
        id: currentUser.id,
        role: currentUser.role,
        isStaff: ['admin', 'petugas'].includes(currentUser.role)
      }
    }
  } catch (error: any) {
    console.error('Error fetching lockers:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Gagal memuat data loker: ${error.message}`
    })
  }
})
