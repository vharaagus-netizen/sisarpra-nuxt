import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'
import { normalizeSafeUrl } from '~/server/utils/gdrive'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const body = await readBody(event)

  const {
    id,
    kode_buku,
    judul,
    kelas,
    kurikulum = 'Kurikulum Merdeka',
    mata_pelajaran,
    penerbit,
    tahun_terbit,
    tahun_anggaran = 2026,
    sumber_dana = 'BOS',
    total_stok = 1,
    stok_tersedia,
    lokasi_rak,
    kondisi = 'baik',
    keterangan,
    foto
  } = body || {}

  if (!judul || !String(judul).trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Judul buku wajib diisi.' })
  }

  if (!kelas || !String(kelas).trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Jenjang kelas buku wajib diisi (X, XI, atau XII).' })
  }

  const cleanKelas = String(kelas).trim().toUpperCase()
  const cleanTotStok = Math.max(0, Number(total_stok) || 1)
  const cleanAvStok = stok_tersedia !== undefined && stok_tersedia !== null
    ? Math.max(0, Number(stok_tersedia))
    : cleanTotStok

  if (id) {
    const updated = await prisma.book.update({
      where: { id: BigInt(id) },
      data: {
        kode_buku: kode_buku ? String(kode_buku).trim().toUpperCase() : undefined,
        judul: String(judul).trim(),
        kelas: cleanKelas,
        kurikulum: String(kurikulum).trim(),
        mata_pelajaran: mata_pelajaran ? String(mata_pelajaran).trim() : null,
        penerbit: penerbit ? String(penerbit).trim() : null,
        tahun_terbit: tahun_terbit ? Number(tahun_terbit) : null,
        tahun_anggaran: tahun_anggaran ? Number(tahun_anggaran) : 2026,
        sumber_dana: String(sumber_dana).trim(),
        total_stok: cleanTotStok,
        stok_tersedia: cleanAvStok,
        lokasi_rak: lokasi_rak ? String(lokasi_rak).trim() : null,
        kondisi: kondisi || 'baik',
        keterangan: keterangan ? String(keterangan).trim() : null,
        ...(foto !== undefined ? { foto: normalizeSafeUrl(foto) } : {})
      }
    })

    return {
      success: true,
      message: 'Data buku inventaris berhasil diperbarui.',
      book: updated
    }
  } else {
    // Generate kode buku jika belum diisi
    let generatedKode = kode_buku ? String(kode_buku).trim().toUpperCase() : ''
    if (!generatedKode) {
      const abbr = String(judul).trim().replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'BK'
      const year = tahun_anggaran || new Date().getFullYear()
      const totalCount = await prisma.book.count()
      generatedKode = `BK-${abbr}-${cleanKelas}-${year}-${String(totalCount + 1).padStart(3, '0')}`
    }

    const exists = await prisma.book.findUnique({
      where: { kode_buku: generatedKode }
    })
    if (exists) {
      generatedKode = `${generatedKode}-${Math.floor(Math.random() * 899 + 100)}`
    }

    const created = await prisma.book.create({
      data: {
        kode_buku: generatedKode,
        judul: String(judul).trim(),
        kelas: cleanKelas,
        kurikulum: String(kurikulum).trim(),
        mata_pelajaran: mata_pelajaran ? String(mata_pelajaran).trim() : null,
        penerbit: penerbit ? String(penerbit).trim() : null,
        tahun_terbit: tahun_terbit ? Number(tahun_terbit) : null,
        tahun_anggaran: tahun_anggaran ? Number(tahun_anggaran) : 2026,
        sumber_dana: String(sumber_dana).trim(),
        total_stok: cleanTotStok,
        stok_tersedia: cleanAvStok,
        stok_dipinjam: 0,
        lokasi_rak: lokasi_rak ? String(lokasi_rak).trim() : 'Perpustakaan SMA',
        kondisi: kondisi || 'baik',
        keterangan: keterangan ? String(keterangan).trim() : null,
        foto: normalizeSafeUrl(foto)
      }
    })

    return {
      success: true,
      message: `Buku "${created.judul}" berhasil ditambahkan ke inventaris dengan kode ${created.kode_buku}!`,
      book: created
    }
  }
})
