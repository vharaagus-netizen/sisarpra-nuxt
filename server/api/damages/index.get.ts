import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)

  const status = (query.status as string) || ''
  const kategori = (query.kategori as string) || ''
  const urgensi = (query.tingkat_urgensi as string) || ''
  const scope = (query.scope as string) || ''
  const search = ((query.search as string) || '').trim().toLowerCase()
  const month = query.month ? parseInt(query.month as string, 10) : null
  const year = query.year ? parseInt(query.year as string, 10) : null
  const startDate = (query.start_date as string) || ''
  const endDate = (query.end_date as string) || ''

  const isStaff = ['admin', 'petugas'].includes(user.role)
  const isStudent = user.role === 'siswa'

  // 1. Filter dasar laporan
  const where: any = {}

  if (isStudent || scope === 'my') {
    where.pelapor_id = BigInt(user.id)
  }

  if (status && ['menunggu', 'diproses', 'tunggu_sparepart', 'selesai', 'ditolak'].includes(status)) {
    where.status = status
  }

  if (kategori && ['elektronik', 'mebeler', 'sanitasi', 'bangunan', 'it_lab', 'lainnya'].includes(kategori)) {
    where.kategori = kategori
  }

  if (urgensi && ['rendah', 'sedang', 'tinggi', 'mendesak'].includes(urgensi)) {
    where.tingkat_urgensi = urgensi
  }

  // Filter rentang periode tanggal lapor (per bulan / per tahun / tanggal kustom)
  if (startDate && endDate) {
    where.tanggal_lapor = {
      gte: new Date(`${startDate}T00:00:00.000Z`),
      lte: new Date(`${endDate}T23:59:59.999Z`),
    }
  } else if (year && month) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
    where.tanggal_lapor = { gte: start, lte: end }
  } else if (year) {
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0))
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
    where.tanggal_lapor = { gte: start, lte: end }
  }

  if (search) {
    where.OR = [
      { nomor_laporan: { contains: search } },
      { judul_kerusakan: { contains: search } },
      { deskripsi_kerusakan: { contains: search } },
      { lokasi_keterangan: { contains: search } },
      { pelapor: { name: { contains: search } } },
      { room: { nama_ruang: { contains: search } } },
      { item: { nama_barang: { contains: search } } },
    ]
  }

  // 2. Hitung statistik tiket pada periode dan cakupan yang dipilih
  const statsWhere: any = {}
  if (isStudent || scope === 'my') {
    statsWhere.pelapor_id = BigInt(user.id)
  }
  if (where.tanggal_lapor) {
    statsWhere.tanggal_lapor = where.tanggal_lapor
  }

  const allReports = await prisma.damageReport.findMany({
    where: statsWhere,
    select: {
      id: true,
      status: true,
      tingkat_urgensi: true,
      estimasi_biaya: true,
      realisasi_biaya: true,
    }
  })

  let sumEstimasi = 0
  let sumRealisasi = 0
  allReports.forEach(r => {
    if (r.estimasi_biaya) sumEstimasi += Number(r.estimasi_biaya)
    if (r.realisasi_biaya) sumRealisasi += Number(r.realisasi_biaya)
  })

  const stats = {
    total_all: allReports.length,
    total_menunggu: allReports.filter(r => r.status === 'menunggu').length,
    total_diproses: allReports.filter(r => r.status === 'diproses').length,
    total_tunggu_sparepart: allReports.filter(r => r.status === 'tunggu_sparepart').length,
    total_selesai: allReports.filter(r => r.status === 'selesai').length,
    total_ditolak: allReports.filter(r => r.status === 'ditolak').length,
    total_mendesak: allReports.filter(r => r.tingkat_urgensi === 'mendesak' && r.status !== 'selesai' && r.status !== 'ditolak').length,
    total_estimasi_biaya: sumEstimasi,
    total_realisasi_biaya: sumRealisasi,
  }

  const reports = await prisma.damageReport.findMany({
    where,
    include: {
      pelapor: {
        select: {
          id: true,
          name: true,
          role: true,
          nomor_induk: true,
          kelas_jurusan: true,
        }
      },
      teknisi: {
        select: {
          id: true,
          name: true,
          role: true,
          no_telepon: true,
        }
      },
      room: {
        select: {
          id: true,
          kode_ruang: true,
          nama_ruang: true,
          lokasi: true,
        }
      },
      item: {
        select: {
          id: true,
          kode_barang: true,
          nama_barang: true,
          merk: true,
          kondisi: true,
        }
      },
      _count: {
        select: {
          logs: true,
        }
      }
    },
    orderBy: [
      { created_at: 'desc' }
    ]
  })

  // 3. Ambil data pendukung (Ruangan, Inventaris Barang, Teknisi)
  const rooms = await prisma.room.findMany({
    select: {
      id: true,
      kode_ruang: true,
      nama_ruang: true,
      lokasi: true,
    },
    orderBy: { nama_ruang: 'asc' }
  })

  const inventarisItems = await prisma.item.findMany({
    select: {
      id: true,
      kode_barang: true,
      nama_barang: true,
      merk: true,
      kondisi: true,
      lokasi_penyimpanan: true,
    },
    orderBy: { nama_barang: 'asc' },
    take: 100
  })

  const technicians = await prisma.user.findMany({
    where: {
      role: { in: ['petugas', 'admin'] }
    },
    select: {
      id: true,
      name: true,
      role: true,
      no_telepon: true,
    },
    orderBy: { name: 'asc' }
  })

  return {
    success: true,
    currentUser: {
      id: user.id,
      name: user.name,
      role: user.role,
      isStaff,
      isStudent,
    },
    stats,
    items: reports,
    rooms,
    inventaris_items: inventarisItems,
    technicians,
  }
})
