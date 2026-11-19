import { prisma } from '~/server/utils/prisma'
import { hashPassword, requireStaff } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireStaff(event)

  const body = await readBody(event)
  const { rows, updateExisting = true } = body || {}

  if (!Array.isArray(rows) || rows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Daftar pengguna untuk diimport tidak boleh kosong.',
    })
  }

  const defaultPasswordHash = await hashPassword('password')
  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0
  const errors: string[] = []

  // Ambil semua email saat ini untuk menghindari duplikat tidak terduga
  const existingUsers = await prisma.user.findMany({
    select: { email: true, id: true }
  })
  const existingEmailMap = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]))
  const usedEmailsInBatch = new Set<string>()

  for (const item of rows) {
    const name = String(item.name || '').trim()
    if (!name) {
      skippedCount++
      errors.push(`Baris ${item.rowNumber || '-'}: Nama pengguna tidak boleh kosong.`)
      continue
    }

    // Role
    let role = String(item.role || 'siswa').trim().toLowerCase()
    if (role.includes('admin')) role = 'admin'
    else if (role.includes('petugas') || role.includes('staf') || role.includes('staff')) role = 'petugas'
    else if (role.includes('guru') || role.includes('pendidik') || role.includes('pengajar')) role = 'guru'
    else role = 'siswa'

    // Email (Bersihkan dan pastikan unik & valid)
    let email = String(item.email || '').trim().toLowerCase()
    if (!email || email === '[object object]') {
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.')
      const suffix = item.nomor_induk ? `.${String(item.nomor_induk).replace(/[^a-z0-9]/gi, '')}` : ''
      email = `${slug}${suffix}@sisarpra.local`
    } else if (!email.includes('@')) {
      const cleanSlug = email.replace(/[^a-z0-9_.-]/g, '') || 'user'
      email = `${cleanSlug}@sisarpra.local`
    }

    // Pastikan tidak tabrakan di batch ini
    let finalEmail = email
    let counter = 2
    while (usedEmailsInBatch.has(finalEmail)) {
      const parts = email.split('@')
      finalEmail = `${parts[0]}_${counter}@${parts[1] || 'sisarpra.local'}`
      counter++
    }
    usedEmailsInBatch.add(finalEmail)

    try {
      const existing = existingEmailMap.get(finalEmail)

      if (existing) {
        if (!updateExisting) {
          skippedCount++
          continue
        }

        // Siapkan data update
        const updateData: any = {
          name,
          role,
          nomor_induk: item.nomor_induk ? String(item.nomor_induk).trim() : null,
          no_telepon: item.no_telepon ? String(item.no_telepon).trim() : null,
          kelas_jurusan: item.kelas_jurusan ? String(item.kelas_jurusan).trim() : null,
        }

        if (item.password && String(item.password).trim() !== '') {
          updateData.password = await hashPassword(String(item.password).trim())
        }

        await prisma.user.update({
          where: { id: existing.id },
          data: updateData,
        })
        updatedCount++
      } else {
        // Buat pengguna baru
        const userPasswordHash =
          item.password && String(item.password).trim() !== ''
            ? await hashPassword(String(item.password).trim())
            : defaultPasswordHash

        const newUser = await prisma.user.create({
          data: {
            name,
            email: finalEmail,
            password: userPasswordHash,
            role,
            nomor_induk: item.nomor_induk ? String(item.nomor_induk).trim() : null,
            no_telepon: item.no_telepon ? String(item.no_telepon).trim() : null,
            kelas_jurusan: item.kelas_jurusan ? String(item.kelas_jurusan).trim() : null,
          },
        })
        existingEmailMap.set(finalEmail, newUser)
        createdCount++
      }
    } catch (err: any) {
      skippedCount++
      errors.push(`Gagal menyimpan ${name} (${finalEmail}): ${err?.message || 'Database error'}`)
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
