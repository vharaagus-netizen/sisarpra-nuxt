import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const { rows, updateExisting = true } = body || {}

  if (!Array.isArray(rows) || rows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Daftar barang untuk diimport tidak boleh kosong.',
    })
  }

  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0
  const errors: string[] = []

  // Preload kategori yang ada ke map
  const categories = await prisma.category.findMany()
  const categoryMap = new Map(categories.map((c) => [c.nama_kategori.toLowerCase().trim(), c]))

  // Preload barang yang ada
  const existingItems = await prisma.item.findMany({
    select: { id: true, kode_barang: true, total_stok: true, stok_tersedia: true }
  })
  const existingItemMap = new Map(existingItems.map((i) => [i.kode_barang.toLowerCase().trim(), i]))

  for (const item of rows) {
    const namaBarang = String(item.nama_barang || '').trim()
    const kodeBarang = String(item.kode_barang || '').trim()

    if (!namaBarang || !kodeBarang) {
      skippedCount++
      errors.push(`Baris ${item.rowNumber || '-'}: Nama atau Kode Barang kosong.`)
      continue
    }

    const rawCategory = String(item.kategori || 'Umum & Peralatan Sekolah').trim()
    const catKey = rawCategory.toLowerCase()

    try {
      // 1. Resolve atau Buat Kategori jika belum ada
      let category = categoryMap.get(catKey)
      if (!category) {
        category = await prisma.category.create({
          data: {
            nama_kategori: rawCategory,
            deskripsi: 'Kategori otomatis dibuat dari Import Excel Inventaris'
          }
        })
        categoryMap.set(catKey, category)
      }

      const totalStok = typeof item.total_stok === 'number' ? item.total_stok : parseInt(item.total_stok || '1', 10) || 1
      const stokTersedia = typeof item.stok_tersedia === 'number' ? item.stok_tersedia : parseInt(item.stok_tersedia || String(totalStok), 10) || totalStok
      const kondisi = item.kondisi || 'baik'
      const merk = item.merk ? String(item.merk).trim() : null
      const spesifikasi = item.spesifikasi ? String(item.spesifikasi).trim() : null
      const lokasiPenyimpanan = item.lokasi_penyimpanan ? String(item.lokasi_penyimpanan).trim() : null

      const existing = existingItemMap.get(kodeBarang.toLowerCase())

      if (existing) {
        if (!updateExisting) {
          skippedCount++
          continue
        }

        await prisma.item.update({
          where: { id: existing.id },
          data: {
            category_id: category.id,
            nama_barang: namaBarang,
            merk,
            spesifikasi,
            total_stok: totalStok,
            stok_tersedia: Math.min(totalStok, Math.max(0, stokTersedia)),
            kondisi,
            lokasi_penyimpanan: lokasiPenyimpanan,
          }
        })
        updatedCount++
      } else {
        const newItem = await prisma.item.create({
          data: {
            category_id: category.id,
            kode_barang: kodeBarang,
            nama_barang: namaBarang,
            merk,
            spesifikasi,
            total_stok: totalStok,
            stok_tersedia: Math.min(totalStok, Math.max(0, stokTersedia)),
            kondisi,
            lokasi_penyimpanan: lokasiPenyimpanan,
          }
        })
        existingItemMap.set(kodeBarang.toLowerCase(), newItem)
        createdCount++
      }
    } catch (err: any) {
      skippedCount++
      errors.push(`Gagal menyimpan ${namaBarang} (${kodeBarang}): ${err?.message || 'Database error'}`)
    }
  }

  return {
    success: true,
    totalReceived: rows.length,
    createdCount,
    updatedCount,
    skippedCount,
    errors,
  }
})
