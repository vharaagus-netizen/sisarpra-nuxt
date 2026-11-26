import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'
import { normalizeSafeUrl } from '~/server/utils/gdrive'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readBody(event)

  const {
    judul_acara = 'SERAH TERIMA BUKU AJAR BOS TAHUN ANGGARAN 2026',
    tahun_anggaran = 2026,
    tanggal_serah_terima,
    pihak_pertama_nama = 'Gloria Putri Ixora, S.Pd.',
    pihak_pertama_jabatan = 'Tim Pengadaan Buku Ajar BOS',
    pihak_kedua_nama = 'Emanuel Suryajaya, S.Kom.',
    pihak_kedua_jabatan = 'Koordinator Sarpra SMA Nusaputera',
    mengetahui_nama = 'Nining Tri Palupi, S.Pd., M.Pd.',
    mengetahui_jabatan = 'Kepala SMA Nusaputera',
    catatan,
    file_bast_signed,
    items = [],
    auto_sync_inventory = true
  } = body || {}

  if (!tanggal_serah_terima) {
    throw createError({ statusCode: 422, statusMessage: 'Tanggal serah terima wajib diisi.' })
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'Minimal harus ada 1 item buku yang diserahterimakan.' })
  }

  const year = Number(tahun_anggaran) || 2026

  // Generate nomor surat berurutan: BAST/BUKU-BOS/2026/0001
  const countThisYear = await prisma.bookHandover.count({
    where: { tahun_anggaran: year }
  })
  const nomor_surat = `BAST/BUKU-BOS/${year}/${String(countThisYear + 1).padStart(4, '0')}`

  // Buat header BAST
  const handover = await prisma.bookHandover.create({
    data: {
      nomor_surat,
      judul_acara: String(judul_acara).trim(),
      tahun_anggaran: year,
      tanggal_serah_terima: new Date(tanggal_serah_terima),
      pihak_pertama_nama: String(pihak_pertama_nama).trim(),
      pihak_pertama_jabatan: String(pihak_pertama_jabatan).trim(),
      pihak_kedua_nama: String(pihak_kedua_nama).trim(),
      pihak_kedua_jabatan: String(pihak_kedua_jabatan).trim(),
      mengetahui_nama: String(mengetahui_nama).trim(),
      mengetahui_jabatan: String(mengetahui_jabatan).trim(),
      catatan: catatan ? String(catatan).trim() : null,
      file_bast_signed: normalizeSafeUrl(file_bast_signed),
      created_by: BigInt(staff.id)
    }
  })

  // Proses masing-masing item buku
  let totalEksemplar = 0
  for (const itm of items) {
    const cleanJudul = String(itm.judul_buku || '').trim()
    const cleanKelas = String(itm.kelas || 'X').trim().toUpperCase()
    const cleanPenerbit = String(itm.penerbit || 'Erlangga').trim()
    const cleanTahun = Number(itm.tahun) || year
    const cleanJumlah = Math.max(1, Number(itm.jumlah) || 1)
    totalEksemplar += cleanJumlah

    let targetBookId: bigint | null = null

    if (auto_sync_inventory && cleanJudul) {
      // Cari apakah buku dengan judul, kelas, dan penerbit yang sama sudah ada di katalog
      const existingBook = await prisma.book.findFirst({
        where: {
          judul: cleanJudul,
          kelas: cleanKelas,
          penerbit: cleanPenerbit
        }
      })

      if (existingBook) {
        // Update stok buku yang sudah ada (tambahkan eks)
        const updatedBook = await prisma.book.update({
          where: { id: existingBook.id },
          data: {
            total_stok: existingBook.total_stok + cleanJumlah,
            stok_tersedia: existingBook.stok_tersedia + cleanJumlah
          }
        })
        targetBookId = updatedBook.id
      } else {
        // Buat buku baru di katalog
        const abbr = cleanJudul.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'BK'
        const totalCount = await prisma.book.count()
        let kodeBuku = `BK-${abbr}-${cleanKelas}-${year}-${String(totalCount + 1).padStart(3, '0')}`

        const kodeExists = await prisma.book.findUnique({ where: { kode_buku: kodeBuku } })
        if (kodeExists) {
          kodeBuku = `${kodeBuku}-${Math.floor(Math.random() * 899 + 100)}`
        }

        const newBook = await prisma.book.create({
          data: {
            kode_buku: kodeBuku,
            judul: cleanJudul,
            kelas: cleanKelas,
            kurikulum: 'Kurikulum Merdeka',
            penerbit: cleanPenerbit,
            tahun_terbit: cleanTahun,
            tahun_anggaran: year,
            sumber_dana: 'BOS',
            total_stok: cleanJumlah,
            stok_tersedia: cleanJumlah,
            stok_dipinjam: 0,
            lokasi_rak: 'Perpustakaan SMA',
            kondisi: 'baik',
            keterangan: `Inventarisasi dari ${nomor_surat}`
          }
        })
        targetBookId = newBook.id
      }
    }

    // Catat item ke book_handover_items
    await prisma.bookHandoverItem.create({
      data: {
        handover_id: handover.id,
        book_id: targetBookId,
        judul_buku: cleanJudul,
        kelas: cleanKelas,
        penerbit: cleanPenerbit,
        tahun: cleanTahun,
        jumlah: cleanJumlah
      }
    })
  }

  const result = await prisma.bookHandover.findUnique({
    where: { id: handover.id },
    include: {
      creator: { select: { id: true, name: true, role: true } },
      items: true
    }
  })

  return {
    success: true,
    message: `Berita Acara nomor ${nomor_surat} berhasil dibuat! ${totalEksemplar} eksemplar buku otomatis tercatat ke Inventarisasi SMA Nusaputera.`,
    handover: result
  }
})
