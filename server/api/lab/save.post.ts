import { prisma } from '~/server/utils/prisma'
import { requireStaffOrTeacher } from '~/server/utils/auth'
import { toUtcDate } from '~/server/utils/date'

export default defineEventHandler(async (event) => {
  await requireStaffOrTeacher(event)

  const body = await readBody(event)
  const {
    id,
    room_id,
    lab_type,
    item_type = 'alat',
    kode_item,
    nama_item,
    kategori,
    merk,
    stok_total = 1,
    stok_tersedia,
    stok_minimum = 1,
    satuan = 'unit',
    kondisi = 'baik',
    lokasi_penyimpanan,
    tanggal_kadaluarsa,
    jadwal_kalibrasi,
    spesifikasi_khusus,
    keterangan,
    foto
  } = body || {}

  if (!nama_item || !kode_item || !lab_type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nama barang, kode item, dan jenis laboratorium wajib diisi.',
    })
  }

  const cleanKode = String(kode_item).trim().toUpperCase()
  const total = Math.max(0, parseInt(stok_total, 10) || 0)
  const minimum = Math.max(0, parseInt(stok_minimum, 10) || 1)
  const tersedia = stok_tersedia !== undefined && stok_tersedia !== null
    ? Math.max(0, parseInt(stok_tersedia, 10) || 0)
    : total

  // Parse spesifikasi_khusus
  let cleanSpec = null
  if (spesifikasi_khusus) {
    if (typeof spesifikasi_khusus === 'object') {
      cleanSpec = JSON.stringify(spesifikasi_khusus)
    } else {
      cleanSpec = String(spesifikasi_khusus).trim()
    }
  }

  const dataPayload: any = {
    room_id: room_id ? BigInt(room_id) : null,
    lab_type,
    item_type,
    kode_item: cleanKode,
    nama_item: String(nama_item).trim(),
    kategori: kategori ? String(kategori).trim() : null,
    merk: merk ? String(merk).trim() : null,
    stok_total: total,
    stok_tersedia: Math.min(total, tersedia),
    stok_minimum: minimum,
    satuan: satuan || 'unit',
    kondisi: kondisi || 'baik',
    lokasi_penyimpanan: lokasi_penyimpanan ? String(lokasi_penyimpanan).trim() : null,
    tanggal_kadaluarsa: tanggal_kadaluarsa ? toUtcDate(tanggal_kadaluarsa) : null,
    jadwal_kalibrasi: jadwal_kalibrasi ? toUtcDate(jadwal_kalibrasi) : null,
    spesifikasi_khusus: cleanSpec,
    keterangan: keterangan ? String(keterangan).trim() : null,
    foto: foto ? String(foto).trim() : null,
  }

  if (id) {
    // Update existing item
    const existing = await prisma.labItem.findUnique({
      where: { id: BigInt(id) }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Data barang laboratorium tidak ditemukan.',
      })
    }

    // Cek duplikasi kode item jika diubah
    if (existing.kode_item !== cleanKode) {
      const duplicate = await prisma.labItem.findUnique({
        where: { kode_item: cleanKode }
      })
      if (duplicate) {
        throw createError({
          statusCode: 400,
          statusMessage: `Kode item '${cleanKode}' sudah digunakan oleh barang lain.`,
        })
      }
    }

    const updated = await prisma.labItem.update({
      where: { id: BigInt(id) },
      data: dataPayload,
    })

    return {
      success: true,
      message: 'Data barang laboratorium berhasil diperbarui.',
      item: updated,
    }
  } else {
    // Create new item
    const duplicate = await prisma.labItem.findUnique({
      where: { kode_item: cleanKode }
    })
    if (duplicate) {
      throw createError({
        statusCode: 400,
        statusMessage: `Kode item '${cleanKode}' sudah terdaftar di sistem.`,
      })
    }

    const created = await prisma.labItem.create({
      data: dataPayload,
    })

    return {
      success: true,
      message: 'Barang laboratorium berhasil ditambahkan.',
      item: created,
    }
  }
})
