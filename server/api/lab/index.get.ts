import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Siswa, Guru, Petugas, dan Admin dapat mengakses katalog inventaris lab
  const user = await requireUser(event)
  const query = getQuery(event)

  const labType = (query.lab_type as string) || ''
  const itemType = (query.item_type as string) || ''
  const kondisi = (query.kondisi as string) || ''
  const alertStatus = (query.alert_status as string) || ''
  const search = ((query.search as string) || '').trim().toLowerCase()

  // 1. Ambil data agregat / statistik seluruh laboratorium
  const allLabItems = await prisma.labItem.findMany({
    select: {
      id: true,
      lab_type: true,
      item_type: true,
      kondisi: true,
      stok_total: true,
      stok_tersedia: true,
      stok_minimum: true,
      tanggal_kadaluarsa: true,
      jadwal_kalibrasi: true,
    }
  })

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const stats = {
    total_all: allLabItems.length,
    total_komputer: allLabItems.filter((i) => i.lab_type === 'komputer').length,
    total_fisika: allLabItems.filter((i) => i.lab_type === 'fisika').length,
    total_kimia: allLabItems.filter((i) => i.lab_type === 'kimia').length,
    total_biologi: allLabItems.filter((i) => i.lab_type === 'biologi').length,
    total_consumable: allLabItems.filter((i) => i.item_type === 'bahan_habis_pakai').length,
    total_tools: allLabItems.filter((i) => i.item_type === 'alat').length,
    total_kits: allLabItems.filter((i) => i.item_type === 'kit').length,
    alert_low_stock: allLabItems.filter((i) => i.stok_tersedia <= i.stok_minimum).length,
    alert_expired: allLabItems.filter((i) => i.tanggal_kadaluarsa && new Date(i.tanggal_kadaluarsa) <= in30Days).length,
    alert_calibration: allLabItems.filter((i) => i.jadwal_kalibrasi && new Date(i.jadwal_kalibrasi) <= in30Days).length,
  }

  // 2. Filter data items
  const where: any = {}

  if (labType && ['komputer', 'fisika', 'kimia', 'biologi'].includes(labType)) {
    where.lab_type = labType
  }

  if (itemType && ['alat', 'bahan_habis_pakai', 'kit'].includes(itemType)) {
    where.item_type = itemType
  }

  if (kondisi && ['baik', 'rusak_ringan', 'rusak_berat', 'habis'].includes(kondisi)) {
    where.kondisi = kondisi
  }

  if (search) {
    where.OR = [
      { nama_item: { contains: search } },
      { kode_item: { contains: search } },
      { merk: { contains: search } },
      { lokasi_penyimpanan: { contains: search } },
      { kategori: { contains: search } },
      { spesifikasi_khusus: { contains: search } },
    ]
  }

  let items = await prisma.labItem.findMany({
    where,
    include: {
      room: {
        select: {
          id: true,
          kode_ruang: true,
          nama_ruang: true,
          lokasi: true,
        }
      },
      _count: {
        select: {
          usage_logs: true,
          maintenance_logs: true,
        }
      }
    },
    orderBy: [
      { lab_type: 'asc' },
      { kode_item: 'asc' }
    ]
  })

  // Filter alert_status secara presisi di memory jika diminta
  if (alertStatus === 'low_stock') {
    items = items.filter((i) => i.stok_tersedia <= i.stok_minimum)
  } else if (alertStatus === 'expired') {
    items = items.filter((i) => i.tanggal_kadaluarsa && new Date(i.tanggal_kadaluarsa) <= in30Days)
  } else if (alertStatus === 'calibration') {
    items = items.filter((i) => i.jadwal_kalibrasi && new Date(i.jadwal_kalibrasi) <= in30Days)
  }

  // 3. Ambil daftar ruangan laboratorium untuk pilihan lokasi
  const rooms = await prisma.room.findMany({
    select: {
      id: true,
      kode_ruang: true,
      nama_ruang: true,
      lokasi: true,
    },
    orderBy: { nama_ruang: 'asc' }
  })

  return {
    success: true,
    currentUser: {
      id: user.id,
      name: user.name,
      role: user.role,
      isStaffOrTeacher: ['admin', 'petugas', 'guru'].includes(user.role),
    },
    stats,
    items,
    rooms,
  }
})
