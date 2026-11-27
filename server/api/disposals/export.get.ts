import ExcelJS from 'exceljs'
import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'
import { buildDisposalWhere } from '~/server/utils/disposals'

const METHOD_LABELS: Record<string, string> = {
  dihancurkan: 'Dihancurkan / Dirusak Fisik',
  dibakar: 'Dibakar / Insinerasi',
  dibongkar_daur_ulang: 'Dibongkar / Daur Ulang',
  limbah_b3: 'Diserahkan ke Pengelola Limbah',
  dibuang_tps: 'Dibuang ke TPS Resmi',
  lainnya: 'Metode Lainnya'
}

const STATUS_LABELS: Record<string, string> = {
  menunggu_persetujuan: 'Menunggu Persetujuan',
  disetujui: 'Disetujui (Siap Musnah)',
  selesai: 'Selesai Dimusnahkan',
  ditolak: 'Ditolak'
}

const SOURCE_LABELS: Record<string, string> = {
  sarpra: 'Inventaris Sarpra',
  lab: 'Inventaris Lab',
  buku: 'Buku Perpustakaan',
  manual: 'Non-Katalog / Manual'
}

export default defineEventHandler(async (event) => {
  await requireStaff(event)
  const query = getQuery(event)
  const where = buildDisposalWhere(query as Record<string, any>)

  const records = await prisma.disposalRecord.findMany({
    where,
    orderBy: [
      { tanggal_pemusnahan: 'desc' },
      { created_at: 'desc' }
    ],
    include: {
      creator: { select: { name: true } },
      approver: { select: { name: true } },
      items: true
    }
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SISARPRA - SMA NUSAPUTERA SEMARANG'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Rekap Pemusnahan Barang', {
    views: [{ showGridLines: true }]
  })

  sheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Nomor Berita Acara', key: 'nomor_surat', width: 24 },
    { header: 'Tanggal Pemusnahan', key: 'tanggal', width: 16 },
    { header: 'Status', key: 'status', width: 22 },
    { header: 'Sumber Barang', key: 'sumber', width: 20 },
    { header: 'Kode Barang', key: 'kode', width: 18 },
    { header: 'Nama Barang / Aset', key: 'nama_barang', width: 34 },
    { header: 'Kategori / Info', key: 'kategori', width: 24 },
    { header: 'Jumlah', key: 'jumlah', width: 10 },
    { header: 'Satuan', key: 'satuan', width: 10 },
    { header: 'Kondisi Akhir', key: 'kondisi', width: 16 },
    { header: 'Estimasi Nilai (Rp)', key: 'nilai', width: 18 },
    { header: 'Metode Pemusnahan', key: 'metode', width: 24 },
    { header: 'Lokasi', key: 'lokasi', width: 22 },
    { header: 'Alasan Pemusnahan', key: 'alasan', width: 36 },
    { header: 'Penanggung Jawab', key: 'pj', width: 26 },
    { header: 'Disetujui Oleh', key: 'approver', width: 24 }
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC2626' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 26

  let rowNumber = 1
  for (const rec of records) {
    const tglStr = rec.tanggal_pemusnahan instanceof Date
      ? rec.tanggal_pemusnahan.toISOString().split('T')[0]
      : String(rec.tanggal_pemusnahan).split('T')[0]

    for (const item of rec.items) {
      sheet.addRow({
        no: rowNumber++,
        nomor_surat: rec.nomor_surat,
        tanggal: tglStr,
        status: STATUS_LABELS[rec.status] || rec.status,
        sumber: SOURCE_LABELS[item.sumber_barang] || item.sumber_barang,
        kode: item.kode_barang || '-',
        nama_barang: item.nama_barang,
        kategori: item.kategori_sumber || '-',
        jumlah: item.jumlah,
        satuan: item.satuan,
        kondisi: item.kondisi_akhir,
        nilai: item.nilai_perkiraan ? Number(item.nilai_perkiraan) : 0,
        metode: METHOD_LABELS[rec.metode_pemusnahan] || rec.metode_pemusnahan,
        lokasi: rec.lokasi_pemusnahan || '-',
        alasan: item.alasan_item ? `${rec.alasan_umum} (${item.alasan_item})` : rec.alasan_umum,
        pj: rec.penanggung_jawab_nama,
        approver: rec.approver?.name || '-'
      })
    }
  }

  sheet.getColumn('nilai').numFmt = '#,##0'

  const buffer = await workbook.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10)

  setHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="Rekap_Pemusnahan_Barang_${stamp}.xlsx"`,
    'Content-Length': String(buffer.byteLength)
  })

  return buffer
})
