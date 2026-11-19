import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readBody(event)

  const {
    jenis_pengadaan = 'sarpra',
    nama_barang,
    kategori,
    lab_type,
    item_type,
    jumlah,
    satuan,
    spesifikasi,
    estimasi_biaya,
    urgensi = 'sedang',
    alasan_kebutuhan,
    lokasi_penempatan
  } = body || {}

  if (!nama_barang || !String(nama_barang).trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Nama barang / alat wajib diisi.' })
  }

  if (!alasan_kebutuhan || !String(alasan_kebutuhan).trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Alasan kebutuhan pengadaan wajib diisi.' })
  }

  const jenis = jenis_pengadaan === 'lab' ? 'lab' : 'sarpra'
  const currentYear = new Date().getFullYear()

  // Generate nomor pengajuan unik: PGD/SARPRA/2026/0001 atau PGD/LAB/2026/0001
  const countThisYear = await prisma.procurementRequest.count({
    where: {
      jenis_pengadaan: jenis,
      created_at: {
        gte: new Date(`${currentYear}-01-01T00:00:00.000Z`)
      }
    }
  })

  const prefix = jenis === 'lab' ? 'PGD/LAB' : 'PGD/SARPRA'
  const runningNumber = String(countThisYear + 1).padStart(4, '0')
  const nomor_pengajuan = `${prefix}/${currentYear}/${runningNumber}`

  const procurement = await prisma.procurementRequest.create({
    data: {
      nomor_pengajuan,
      jenis_pengadaan: jenis,
      user_id: BigInt(staff.id),
      nama_barang: String(nama_barang).trim(),
      kategori: kategori ? String(kategori).trim() : (jenis === 'lab' ? 'Alat Praktikum' : 'Umum'),
      lab_type: jenis === 'lab' ? (lab_type || 'komputer') : null,
      item_type: jenis === 'lab' ? (item_type || 'alat') : null,
      jumlah: Math.max(1, Number(jumlah) || 1),
      satuan: satuan ? String(satuan).trim() : 'unit',
      spesifikasi: spesifikasi ? String(spesifikasi).trim() : null,
      estimasi_biaya: estimasi_biaya ? BigInt(Math.max(0, Number(estimasi_biaya))) : null,
      urgensi: ['rendah', 'sedang', 'tinggi', 'mendesak'].includes(urgensi) ? urgensi : 'sedang',
      alasan_kebutuhan: String(alasan_kebutuhan).trim(),
      lokasi_penempatan: lokasi_penempatan ? String(lokasi_penempatan).trim() : null,
      status: 'menunggu_review'
    },
    include: {
      user: { select: { id: true, name: true, role: true } }
    }
  })

  return {
    success: true,
    message: `Usulan pengadaan barang ${jenis === 'lab' ? 'Laboratorium' : 'Sarpras'} berhasil diajukan dengan nomor ${nomor_pengajuan}!`,
    procurement
  }
})
