import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readBody(event)
  const { id, items_check, kondisi_sesudah, catatan_kondisi } = body || {}

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID peminjaman diperlukan.' })
  }

  const loan = await prisma.itemLoan.findUnique({
    where: { id: BigInt(id) },
    include: { details: { include: { item: true } } }
  })

  if (!loan || loan.status !== 'sedang_dipinjam') {
    throw createError({ statusCode: 400, statusMessage: 'Hanya peminjaman berstatus Sedang Dipinjam yang dapat diselesaikan.' })
  }

  let totalUnitRusak = 0
  let totalUnitBaik = 0

  await prisma.$transaction(async (tx) => {
    // Proses setiap detail barang yang dipinjam
    for (const detail of loan.details) {
      // Cari data inspeksi khusus barang ini jika ada
      const check = items_check?.find((c: any) => String(c.detail_id) === String(detail.id))

      let baik = detail.jumlah
      let rusak = 0
      let points: string[] = []
      let note = ''

      if (check) {
        rusak = Math.min(detail.jumlah, Math.max(0, Number(check.jumlah_rusak) || 0))
        baik = Math.max(0, detail.jumlah - rusak)
        points = Array.isArray(check.checklist_kerusakan) ? check.checklist_kerusakan : []
        note = check.catatan || ''
      } else if (kondisi_sesudah && kondisi_sesudah !== 'baik') {
        // Fallback jika dikembalikan secara global rusak
        rusak = 1
        baik = Math.max(0, detail.jumlah - 1)
        note = catatan_kondisi || ''
      }

      totalUnitRusak += rusak
      totalUnitBaik += baik

      // HANYA pulihkan stok yang berkondisi BAIK ke stok_tersedia!
      // Unit yang rusak TIDAK dipulihkan (tetap terkunci / tidak bisa dipinjam)
      if (baik > 0) {
        await tx.item.update({
          where: { id: detail.item_id },
          data: {
            stok_tersedia: { increment: baik },
            ...(rusak > 0 && { kondisi: 'rusak_ringan' })
          }
        })
      } else if (rusak > 0) {
        // Jika semua unit rusak
        await tx.item.update({
          where: { id: detail.item_id },
          data: {
            kondisi: 'rusak_berat'
          }
        })
      }

      // Format keterangan catatan kondisi lengkap
      let summaryCatatan = `Kembali: ${baik} Baik`
      if (rusak > 0) {
        summaryCatatan += `, ${rusak} Rusak`
        if (points.length > 0) {
          summaryCatatan += ` [Poin Kerusakan: ${points.join(', ')}]`
        }
      }
      if (note) {
        summaryCatatan += ` - Ket: ${note}`
      }

      await tx.itemLoanDetail.update({
        where: { id: detail.id },
        data: {
          kondisi_sesudah: rusak > 0 ? (baik > 0 ? 'sebagian_rusak' : 'rusak_berat') : 'baik',
          catatan_kondisi: summaryCatatan,
        }
      })
    }

    // Update status peminjaman jadi selesai
    await tx.itemLoan.update({
      where: { id: BigInt(id) },
      data: {
        status: 'selesai',
        tanggal_realisasi_kembali: new Date(),
      }
    })
  })

  let msg = 'Penerimaan pengembalian barang berhasil!'
  if (totalUnitRusak > 0) {
    msg += ` Terdeteksi ${totalUnitRusak} unit rusak. Hanya ${totalUnitBaik} unit berkondisi baik yang dipulihkan ke stok siap pinjam.`
  } else {
    msg += ' Seluruh unit barang dalam kondisi baik dan stok fisik telah dipulihkan penuh.'
  }

  return { success: true, message: msg, totalUnitBaik, totalUnitRusak }
})
