import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readBody(event)
  const {
    id,
    category_id,
    kode_barang,
    nama_barang,
    merk,
    spesifikasi,
    total_stok,
    stok_tersedia,
    kondisi,
    lokasi_penyimpanan
  } = body || {}

  if (!kode_barang || !nama_barang || !category_id) {
    throw createError({ statusCode: 422, statusMessage: 'Kode barang, nama barang, dan kategori wajib diisi.' })
  }

  const totStok = Math.max(0, Number(total_stok) || 1)
  const avStok = stok_tersedia !== undefined ? Math.max(0, Number(stok_tersedia)) : totStok

  if (id) {
    const updated = await prisma.item.update({
      where: { id: BigInt(id) },
      data: {
        category_id: BigInt(category_id),
        kode_barang: String(kode_barang).trim().toUpperCase(),
        nama_barang: String(nama_barang).trim(),
        merk: merk ? String(merk).trim() : null,
        spesifikasi: spesifikasi ? String(spesifikasi).trim() : null,
        total_stok: totStok,
        stok_tersedia: avStok,
        kondisi: kondisi || 'baik',
        lokasi_penyimpanan: lokasi_penyimpanan ? String(lokasi_penyimpanan).trim() : null,
      }
    })
    return { success: true, message: 'Data inventaris barang berhasil diperbarui.', item: updated }
  } else {
    const exists = await prisma.item.findUnique({
      where: { kode_barang: String(kode_barang).trim().toUpperCase() }
    })
    if (exists) {
      throw createError({ statusCode: 422, statusMessage: `Kode barang ${kode_barang} sudah terdaftar.` })
    }

    const created = await prisma.item.create({
      data: {
        category_id: BigInt(category_id),
        kode_barang: String(kode_barang).trim().toUpperCase(),
        nama_barang: String(nama_barang).trim(),
        merk: merk ? String(merk).trim() : null,
        spesifikasi: spesifikasi ? String(spesifikasi).trim() : null,
        total_stok: totStok,
        stok_tersedia: avStok,
        kondisi: kondisi || 'baik',
        lokasi_penyimpanan: lokasi_penyimpanan ? String(lokasi_penyimpanan).trim() : null,
      }
    })
    return { success: true, message: 'Barang baru berhasil ditambahkan ke inventaris.', item: created }
  }
})

