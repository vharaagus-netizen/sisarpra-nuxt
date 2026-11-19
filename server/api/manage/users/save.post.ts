import { prisma } from '~/server/utils/prisma'
import { requireStaff, hashPassword } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readBody(event)
  const { id, name, email, password, role, nomor_induk, no_telepon, kelas_jurusan } = body || {}

  if (!name || !email) {
    throw createError({ statusCode: 422, statusMessage: 'Nama dan email wajib diisi.' })
  }

  const cleanEmail = String(email).trim().toLowerCase()
  const cleanRole = ['admin', 'petugas', 'guru', 'siswa'].includes(role) ? role : 'siswa'

  if (id) {
    // Check if email taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        NOT: { id: BigInt(id) }
      }
    })
    if (existing) {
      throw createError({ statusCode: 422, statusMessage: `Email ${cleanEmail} sudah digunakan oleh akun lain.` })
    }

    const updateData: any = {
      name: String(name).trim(),
      email: cleanEmail,
      role: cleanRole,
      nomor_induk: nomor_induk ? String(nomor_induk).trim() : null,
      no_telepon: no_telepon ? String(no_telepon).trim() : null,
      kelas_jurusan: kelas_jurusan ? String(kelas_jurusan).trim() : null,
    }

    if (password && String(password).trim().length > 0) {
      updateData.password = await hashPassword(String(password).trim())
    }

    const updated = await prisma.user.update({
      where: { id: BigInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nomor_induk: true,
        no_telepon: true,
        kelas_jurusan: true,
      }
    })

    return { success: true, message: 'Data pengguna berhasil diperbarui.', user: updated }
  } else {
    // Create new user
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail }
    })
    if (existing) {
      throw createError({ statusCode: 422, statusMessage: `Email ${cleanEmail} sudah terdaftar.` })
    }

    const passToHash = password && String(password).trim().length > 0 ? String(password).trim() : 'password'
    const hashedPassword = await hashPassword(passToHash)

    const created = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: cleanRole,
        nomor_induk: nomor_induk ? String(nomor_induk).trim() : null,
        no_telepon: no_telepon ? String(no_telepon).trim() : null,
        kelas_jurusan: kelas_jurusan ? String(kelas_jurusan).trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nomor_induk: true,
        no_telepon: true,
        kelas_jurusan: true,
      }
    })

    return { success: true, message: 'Pengguna baru berhasil ditambahkan.', user: created }
  }
})

