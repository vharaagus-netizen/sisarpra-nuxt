import { prisma } from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/auth'
import { normalizeSafeUrl } from '~/server/utils/gdrive'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event)
  const { id, status, catatan_admin, link_dokumentasi } = body || {}

  if (!id || !status) {
    throw createError({ statusCode: 422, statusMessage: 'ID dan status persetujuan wajib diisi.' })
  }

  const validStatuses = ['menunggu_review', 'disetujui', 'dianggarkan', 'ditolak', 'terealisasi']
  if (!validStatuses.includes(status)) {
    throw createError({ statusCode: 422, statusMessage: 'Status pengadaan tidak valid.' })
  }

  const existing = await prisma.procurementRequest.findUnique({
    where: { id: BigInt(id) }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Data pengadaan tidak ditemukan.' })
  }

  const finalDocUrl = link_dokumentasi !== undefined
    ? normalizeSafeUrl(link_dokumentasi)
    : existing.link_dokumentasi
  const safeFotoShort = finalDocUrl && finalDocUrl.length <= 255 ? finalDocUrl : undefined

  let createdInventoryInfo: { type: string; code: string; name: string } | null = null

  // Jika status baru adalah 'terealisasi' dan sebelumnya belum pernah 'terealisasi'
  if (status === 'terealisasi' && existing.status !== 'terealisasi') {
    const year = new Date().getFullYear()

    if (existing.jenis_pengadaan === 'sarpra') {
      // 1. Cari kategori yang sesuai di tabel categories
      let category = await prisma.category.findFirst({
        where: {
          nama_kategori: { contains: existing.kategori || 'Elektronik' }
        }
      })
      if (!category) {
        category = await prisma.category.findFirst()
      }
      const categoryId = category ? category.id : BigInt(1)

      // 2. Generate kode barang unik: BRG-YYYY-XXXX
      let kode = `BRG-${year}-${String(existing.id).padStart(4, '0')}`
      const existingItem = await prisma.item.findUnique({ where: { kode_barang: kode } })
      if (existingItem) {
        kode = `BRG-${year}-${String(existing.id).padStart(4, '0')}-${Math.floor(Math.random() * 899 + 100)}`
      }

      // 3. Masukkan ke tabel items (Master Barang & Aset)
      const newItem = await prisma.item.create({
        data: {
          category_id: categoryId,
          kode_barang: kode,
          nama_barang: existing.nama_barang,
          spesifikasi: existing.spesifikasi || existing.alasan_kebutuhan,
          total_stok: Math.max(1, existing.jumlah),
          stok_tersedia: Math.max(1, existing.jumlah),
          kondisi: 'baik',
          lokasi_penyimpanan: existing.lokasi_penempatan || 'Ruang Sarpras',
          foto: safeFotoShort
        }
      })
      createdInventoryInfo = { type: 'sarpra', code: newItem.kode_barang, name: newItem.nama_barang }

    } else if (existing.jenis_pengadaan === 'lab') {
      // 1. Generate kode item lab unik: LAB-XXX-YYYY-XXXX
      const prefixMap: Record<string, string> = {
        komputer: 'LAB-KOM',
        kimia: 'LAB-KIM',
        fisika: 'LAB-FIS',
        biologi: 'LAB-BIO'
      }
      const prefix = prefixMap[existing.lab_type || 'komputer'] || 'LAB'
      let kode = `${prefix}-${year}-${String(existing.id).padStart(4, '0')}`
      const existingLab = await prisma.labItem.findUnique({ where: { kode_item: kode } })
      if (existingLab) {
        kode = `${prefix}-${year}-${String(existing.id).padStart(4, '0')}-${Math.floor(Math.random() * 899 + 100)}`
      }

      // 2. Masukkan ke tabel lab_items (Inventaris Lab)
      const newLabItem = await prisma.labItem.create({
        data: {
          lab_type: existing.lab_type || 'komputer',
          item_type: existing.item_type || 'alat',
          kode_item: kode,
          nama_item: existing.nama_barang,
          kategori: existing.kategori || (existing.item_type === 'bahan_habis_pakai' ? 'Bahan Habis Pakai' : 'Alat Praktikum'),
          stok_total: Math.max(1, existing.jumlah),
          stok_tersedia: Math.max(1, existing.jumlah),
          stok_minimum: 1,
          satuan: existing.satuan || 'unit',
          kondisi: 'baik',
          lokasi_penyimpanan: existing.lokasi_penempatan || 'Laboratorium',
          spesifikasi_khusus: existing.spesifikasi,
          keterangan: `Dari usulan pengadaan nomor: ${existing.nomor_pengajuan || existing.id}`,
          foto: safeFotoShort
        }
      })
      createdInventoryInfo = { type: 'lab', code: newLabItem.kode_item, name: newLabItem.nama_item }
    }
  }

  const updated = await prisma.procurementRequest.update({
    where: { id: BigInt(id) },
    data: {
      status,
      catatan_admin: catatan_admin ? String(catatan_admin).trim() : null,
      ...(link_dokumentasi !== undefined ? { link_dokumentasi: finalDocUrl } : {}),
      reviewed_by: BigInt(admin.id),
      reviewed_at: new Date()
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
      reviewer: { select: { id: true, name: true, role: true } }
    }
  })

  let message = `Status usulan berhasil diperbarui menjadi "${status}".`
  if (createdInventoryInfo) {
    if (createdInventoryInfo.type === 'sarpra') {
      message = `Status berhasil diubah menjadi "Terealisasi"! Barang telah otomatis ditambahkan ke Master Barang & Aset dengan Kode: ${createdInventoryInfo.code}.`
    } else {
      message = `Status berhasil diubah menjadi "Terealisasi"! Item telah otomatis ditambahkan ke Inventaris Lab dengan Kode: ${createdInventoryInfo.code}.`
    }
  }

  return {
    success: true,
    message,
    procurement: updated,
    inventory: createdInventoryInfo
  }
})
