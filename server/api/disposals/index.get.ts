import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'
import { buildDisposalWhere } from '~/server/utils/disposals'

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const query = getQuery(event)
  const where = buildDisposalWhere(query as Record<string, any>)

  const [disposals, allDisposals, sarpraItems, labItems, books, openDamages] = await Promise.all([
    prisma.disposalRecord.findMany({
      where,
      orderBy: [
        { tanggal_pemusnahan: 'desc' },
        { created_at: 'desc' }
      ],
      include: {
        creator: { select: { id: true, name: true, role: true } },
        approver: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            item: { select: { id: true, kode_barang: true, nama_barang: true, stok_tersedia: true, total_stok: true } },
            lab_item: { select: { id: true, kode_item: true, nama_item: true, lab_type: true, stok_tersedia: true, stok_total: true, satuan: true } },
            book: { select: { id: true, kode_buku: true, judul: true, kelas: true, stok_tersedia: true, total_stok: true } },
            damage_report: { select: { id: true, nomor_laporan: true, judul_kerusakan: true, status: true } }
          }
        }
      }
    }),
    prisma.disposalRecord.findMany({
      select: {
        id: true,
        status: true,
        items: {
          select: {
            jumlah: true,
            nilai_perkiraan: true
          }
        }
      }
    }),
    prisma.item.findMany({
      select: {
        id: true,
        kode_barang: true,
        nama_barang: true,
        merk: true,
        total_stok: true,
        stok_tersedia: true,
        kondisi: true,
        lokasi_penyimpanan: true,
        category: { select: { nama_kategori: true } }
      },
      orderBy: { nama_barang: 'asc' }
    }),
    prisma.labItem.findMany({
      select: {
        id: true,
        kode_item: true,
        nama_item: true,
        lab_type: true,
        item_type: true,
        stok_total: true,
        stok_tersedia: true,
        satuan: true,
        kondisi: true,
        lokasi_penyimpanan: true
      },
      orderBy: { nama_item: 'asc' }
    }),
    prisma.book.findMany({
      select: {
        id: true,
        kode_buku: true,
        judul: true,
        kelas: true,
        penerbit: true,
        sumber_dana: true,
        total_stok: true,
        stok_tersedia: true,
        kondisi: true,
        lokasi_rak: true
      },
      orderBy: { judul: 'asc' }
    }),
    prisma.damageReport.findMany({
      where: {
        status: { notIn: ['selesai', 'ditolak'] }
      },
      select: {
        id: true,
        nomor_laporan: true,
        judul_kerusakan: true,
        deskripsi_kerusakan: true,
        tingkat_urgensi: true,
        status: true,
        item_id: true,
        foto_sebelum: true,
        lokasi_keterangan: true,
        room: { select: { nama_ruang: true } },
        item: {
          select: {
            id: true,
            kode_barang: true,
            nama_barang: true,
            stok_tersedia: true,
            kondisi: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 100
    })
  ])

  const executedRecords = allDisposals.filter(d => d.status === 'selesai')
  const totalUnitDimusnahkan = executedRecords.reduce(
    (sum, d) => sum + d.items.reduce((acc, it) => acc + Number(it.jumlah || 0), 0),
    0
  )
  const totalNilaiAset = executedRecords.reduce(
    (sum, d) => sum + d.items.reduce((acc, it) => acc + (it.nilai_perkiraan ? Number(it.nilai_perkiraan) : 0), 0),
    0
  )

  const stats = {
    total_dokumen: allDisposals.length,
    menunggu_persetujuan: allDisposals.filter(d => d.status === 'menunggu_persetujuan').length,
    disetujui: allDisposals.filter(d => d.status === 'disetujui').length,
    selesai: executedRecords.length,
    ditolak: allDisposals.filter(d => d.status === 'ditolak').length,
    total_unit_dimusnahkan: totalUnitDimusnahkan,
    total_nilai_aset: totalNilaiAset
  }

  return {
    success: true,
    stats,
    disposals: {
      data: disposals
    },
    references: {
      sarpraItems,
      labItems,
      books,
      openDamages
    }
  }
})
