import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const currentUser = await requireStaff(event)
  const body = await readBody(event)
  const { id } = body || {}

  if (!id) {
    throw createError({ statusCode: 422, statusMessage: 'ID pengguna wajib disertakan.' })
  }

  if (String(currentUser.id) === String(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.' })
  }

  const userId = BigInt(id)

  await prisma.$transaction(async (tx) => {
    // 1. Bersihkan permohonan reservasi ruangan yang dibuat oleh user ini
    await tx.roomReservation.deleteMany({ where: { user_id: userId } })

    // 2. Bersihkan peminjaman barang dan detailnya
    const userLoans = await tx.itemLoan.findMany({ where: { user_id: userId }, select: { id: true } })
    if (userLoans.length > 0) {
      const loanIds = userLoans.map((l) => l.id)
      await tx.itemLoanDetail.deleteMany({ where: { loan_id: { in: loanIds } } })
      await tx.itemLoan.deleteMany({ where: { user_id: userId } })
    }

    // 3. Bersihkan tiket dan log kerusakan
    await tx.damageActionLog.deleteMany({ where: { user_id: userId } })
    await tx.damageReport.deleteMany({ where: { pelapor_id: userId } })

    // 4. Hapus data pengguna
    await tx.user.delete({
      where: { id: userId },
    })
  })

  return { success: true, message: 'Akun pengguna berhasil dihapus dari sistem.' }
})

