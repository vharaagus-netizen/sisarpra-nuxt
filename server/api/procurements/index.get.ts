import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const query = getQuery(event)

  const jenis_pengadaan = query.jenis_pengadaan ? String(query.jenis_pengadaan).toLowerCase() : 'all'
  const status = query.status ? String(query.status) : undefined
  const lab_type = query.lab_type ? String(query.lab_type) : undefined
  const search = query.search ? String(query.search).trim() : undefined
  const month = query.month ? String(query.month).trim() : undefined

  const where: any = {}

  // Filter jenis pengadaan
  if (jenis_pengadaan === 'sarpra' || jenis_pengadaan === 'lab') {
    where.jenis_pengadaan = jenis_pengadaan
  }

  // Filter status
  if (status && status !== 'all') {
    where.status = status
  }

  // Filter lab type jika lab
  if (lab_type && lab_type !== 'all') {
    where.lab_type = lab_type
  }

  // Search filter
  if (search) {
    where.OR = [
      { nama_barang: { contains: search } },
      { nomor_pengajuan: { contains: search } },
      { spesifikasi: { contains: search } },
      { alasan_kebutuhan: { contains: search } },
      { lokasi_penempatan: { contains: search } }
    ]
  }

  // Month filter (YYYY-MM)
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split('-').map(Number)
    const startDate = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0))
    const endDate = new Date(Date.UTC(year, m, 1, 0, 0, 0))
    where.created_at = {
      gte: startDate,
      lt: endDate
    }
  }

  const [procurements, allProcurements] = await Promise.all([
    prisma.procurementRequest.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true, nomor_induk: true } },
        reviewer: { select: { id: true, name: true, role: true } }
      }
    }),
    prisma.procurementRequest.findMany({
      select: {
        id: true,
        jenis_pengadaan: true,
        status: true,
        estimasi_biaya: true
      }
    })
  ])

  // Hitung statistik keseluruhan
  const stats = {
    total_semua: allProcurements.length,
    total_sarpra: allProcurements.filter(p => p.jenis_pengadaan === 'sarpra').length,
    total_lab: allProcurements.filter(p => p.jenis_pengadaan === 'lab').length,
    menunggu_review: allProcurements.filter(p => p.status === 'menunggu_review').length,
    disetujui: allProcurements.filter(p => ['disetujui', 'dianggarkan', 'terealisasi'].includes(p.status)).length,
    ditolak: allProcurements.filter(p => p.status === 'ditolak').length,
    estimasi_biaya_total: allProcurements.reduce((acc, p) => acc + (p.estimasi_biaya ? Number(p.estimasi_biaya) : 0), 0),
    estimasi_biaya_disetujui: allProcurements
      .filter(p => ['disetujui', 'dianggarkan', 'terealisasi'].includes(p.status))
      .reduce((acc, p) => acc + (p.estimasi_biaya ? Number(p.estimasi_biaya) : 0), 0)
  }

  return {
    success: true,
    stats,
    procurements: {
      data: procurements
    }
  }
})
