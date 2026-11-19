import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readBody(event)
  const { id, catatan } = body || {}

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID peminjaman diperlukan.' })
  }

  const loan = await prisma.itemLoan.findUnique({
    where: { id: BigInt(id) },
    include: { details: { include: { item: true } } }
  })

  if (!loan || loan.status !== 'pending') {
    throw createError({ statusCode: 400, statusMessage: 'Peminjaman barang tidak dapat disetujui.' })
  }

  // Cek ketersediaan stok
  for (const detail of loan.details) {
    if (detail.item.stok_tersedia < detail.jumlah) {
      throw createError({
        statusCode: 400,
        statusMessage: `Stok ${detail.item.nama_barang} tidak mencukupi (Tersisa ${detail.item.stok_tersedia} unit).`
      })
    }
  }

  await prisma.$transaction(async (tx) => {
    // Potong stok
    for (const detail of loan.details) {
      await tx.item.update({
        where: { id: detail.item_id },
        data: { stok_tersedia: { decrement: detail.jumlah } }
      })
    }

    await tx.itemLoan.update({
      where: { id: BigInt(id) },
      data: {
        status: 'disetujui',
        approved_by: BigInt(staff.id),
        catatan: catatan || 'Disetujui. Silakan ambil barang di Ruang Sarpra.',
      }
    })
  })

  return {
    success: true,
    message: `Peminjaman barang ${loan.nomor_peminjaman} berhasil disetujui! Stok fisik otomatis dipotong.`
  }
})

