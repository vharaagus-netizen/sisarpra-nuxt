import { prisma } from '~/server/utils/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const id = body?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID peminjaman wajib diisi.',
    })
  }

  const loan = await prisma.itemLoan.findUnique({
    where: { id: BigInt(id) },
    include: { details: true }
  })

  if (!loan) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Data peminjaman tidak ditemukan.',
    })
  }

  const isStaff = ['admin', 'petugas'].includes(user.role)
  if (!isStaff && Number(loan.user_id) !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak berhak membatalkan permohonan ini.',
    })
  }

  if (!['pending', 'disetujui'].includes(loan.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Peminjaman ini sudah tidak dapat dibatalkan.',
    })
  }

  await prisma.$transaction(async (tx) => {
    // Jika sudah disetujui sebelumnya, pulihkan stok fisik barang
    if (loan.status === 'disetujui') {
      for (const detail of loan.details) {
        await tx.item.update({
          where: { id: detail.item_id },
          data: {
            stok_tersedia: {
              increment: detail.jumlah
            }
          }
        })
      }
    }

    await tx.itemLoan.update({
      where: { id: BigInt(id) },
      data: { status: 'batal' }
    })
  })

  return {
    success: true,
    message: 'Pengajuan peminjaman barang berhasil dibatalkan.'
  }
})

