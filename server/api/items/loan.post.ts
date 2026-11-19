import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'
import { toUtcDate } from '~/server/utils/date'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const isStaff = ['admin', 'petugas'].includes(user.role)
  const body = await readBody(event)

  const { item_id, jumlah, tanggal_pinjam, tanggal_rencana_kembali, keperluan, user_id, direct_status } = body || {}

  if (!item_id || !jumlah || !tanggal_pinjam || !tanggal_rencana_kembali || !keperluan) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Semua kolom formulir peminjaman barang wajib diisi.',
    })
  }

  // Tentukan peminjam (borrower)
  let borrowerId = BigInt(user.id)
  let borrowerName = user.name

  if (user_id && String(user_id) !== String(user.id)) {
    if (!isStaff) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Hanya Admin atau Petugas yang dapat membuat peminjaman atas nama orang lain.',
      })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: BigInt(user_id) },
      select: { id: true, name: true, role: true }
    })

    if (!targetUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Pengguna peminjam yang dipilih tidak ditemukan.',
      })
    }

    borrowerId = targetUser.id
    borrowerName = targetUser.name
  }

  const requestedQty = Math.max(1, Number(jumlah) || 1)

  const item = await prisma.item.findUnique({
    where: { id: BigInt(item_id) },
  })

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Barang tidak ditemukan.',
    })
  }

  if (item.stok_tersedia < requestedQty) {
    throw createError({
      statusCode: 400,
      statusMessage: `Stok barang tidak mencukupi (Tersisa ${item.stok_tersedia} unit).`,
    })
  }

  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  const nomorPeminjaman = `PB-${yyyy}${mm}${dd}-${rand}`

  const startDate = toUtcDate(tanggal_pinjam)
  const returnDate = toUtcDate(tanggal_rencana_kembali)

  // Tentukan status awal peminjaman
  let initialStatus = 'pending'
  let approverId: bigint | null = null

  if (isStaff && ['disetujui', 'sedang_dipinjam'].includes(direct_status)) {
    initialStatus = direct_status
    approverId = BigInt(user.id)
  }

  const loan = await prisma.$transaction(async (tx) => {
    const newLoan = await tx.itemLoan.create({
      data: {
        nomor_peminjaman: nomorPeminjaman,
        user_id: borrowerId,
        tanggal_pinjam: startDate,
        tanggal_rencana_kembali: returnDate,
        keperluan: String(keperluan).trim(),
        status: initialStatus,
        approved_by: approverId,
        catatan: isStaff && approverId ? `Dicatat langsung oleh staf (${user.name})` : null
      }
    })

    await tx.itemLoanDetail.create({
      data: {
        item_loan_id: newLoan.id,
        item_id: BigInt(item_id),
        jumlah: requestedQty,
        kondisi_sebelum: item.kondisi,
      }
    })

    // Jika langsung disetujui atau langsung diserahterimakan, kurangi stok fisik
    if (['disetujui', 'sedang_dipinjam'].includes(initialStatus)) {
      await tx.item.update({
        where: { id: BigInt(item_id) },
        data: {
          stok_tersedia: { decrement: requestedQty }
        }
      })
    }

    return newLoan
  })

  let successMsg = 'Pengajuan peminjaman barang berhasil dikirim! Menunggu verifikasi petugas.'
  if (initialStatus === 'sedang_dipinjam') {
    successMsg = `Peminjaman atas nama ${borrowerName} berhasil dicatat & barang telah diserahkan (stok dipotong)!`
  } else if (initialStatus === 'disetujui') {
    successMsg = `Peminjaman atas nama ${borrowerName} berhasil disetujui (stok dipotong, menunggu serah terima)!`
  }

  return {
    success: true,
    message: successMsg,
    loan
  }
})

