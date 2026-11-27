import { prisma } from '~/server/utils/prisma'
import { requireStaff } from '~/server/utils/auth'
import { normalizeSafeUrl } from '~/server/utils/gdrive'
import { toUtcDate } from '~/server/utils/date'
import {
  DISPOSAL_METHODS,
  DISPOSAL_TX_OPTIONS,
  generateDisposalNumber,
  resolveAndValidateDisposalItems,
  deductStockForDisposal
} from '~/server/utils/disposals'

export default defineEventHandler(async (event) => {
  const staff = await requireStaff(event)
  const body = await readBody(event)

  const {
    judul_acara = 'BERITA ACARA PEMUSNAHAN BARANG / ASET SEKOLAH',
    tanggal_pemusnahan,
    lokasi_pemusnahan,
    metode_pemusnahan = 'dihancurkan',
    alasan_umum,
    penanggung_jawab_nama = 'Emanuel Suryajaya, S.Kom.',
    penanggung_jawab_jabatan = 'Koordinator Sarpra SMA Nusaputera',
    saksi_nama,
    saksi_jabatan,
    mengetahui_nama = 'Nining Tri Palupi, S.Pd., M.Pd.',
    mengetahui_jabatan = 'Kepala SMA Nusaputera',
    foto_sebelum,
    foto_pemusnahan,
    file_bast_signed,
    catatan_admin,
    execute_now = false,
    items = []
  } = body || {}

  if (!tanggal_pemusnahan) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Tanggal pemusnahan wajib diisi.'
    })
  }

  if (!alasan_umum || !String(alasan_umum).trim()) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Alasan / dasar pemusnahan wajib diisi.'
    })
  }

  const wantsExecuteNow = Boolean(execute_now)
  if (wantsExecuteNow && staff.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Hanya Super Admin yang dapat langsung mengeksekusi pemusnahan tanpa antrean persetujuan.'
    })
  }

  const metodeClean = String(metode_pemusnahan || 'dihancurkan').trim().toLowerCase()
  const finalMetode = (DISPOSAL_METHODS as readonly string[]).includes(metodeClean)
    ? metodeClean
    : 'lainnya'

  const tanggalUtc = toUtcDate(tanggal_pemusnahan)
  const tahunAnggaran = tanggalUtc.getUTCFullYear() || new Date().getFullYear()
  const staffId = BigInt(staff.id)

  // Read-only validation & numbering run outside transaction to avoid TiDB network timeout
  const [resolvedItems, nomorSurat] = await Promise.all([
    resolveAndValidateDisposalItems(prisma, items),
    generateDisposalNumber(prisma, tahunAnggaran)
  ])

  const createdRecord = await prisma.$transaction(async (tx) => {
    const created = await tx.disposalRecord.create({
      data: {
        nomor_surat: nomorSurat,
        judul_acara: String(judul_acara).trim() || 'BERITA ACARA PEMUSNAHAN BARANG / ASET SEKOLAH',
        tahun_anggaran: tahunAnggaran,
        tanggal_pemusnahan: tanggalUtc,
        lokasi_pemusnahan: lokasi_pemusnahan ? String(lokasi_pemusnahan).trim() : null,
        metode_pemusnahan: finalMetode,
        alasan_umum: String(alasan_umum).trim(),
        status: wantsExecuteNow ? 'selesai' : 'menunggu_persetujuan',
        stok_terpotong: false,
        penanggung_jawab_nama: String(penanggung_jawab_nama || staff.name).trim(),
        penanggung_jawab_jabatan: String(penanggung_jawab_jabatan || 'Koordinator Sarpra SMA Nusaputera').trim(),
        saksi_nama: saksi_nama ? String(saksi_nama).trim() : null,
        saksi_jabatan: saksi_jabatan ? String(saksi_jabatan).trim() : null,
        mengetahui_nama: String(mengetahui_nama || 'Nining Tri Palupi, S.Pd., M.Pd.').trim(),
        mengetahui_jabatan: String(mengetahui_jabatan || 'Kepala SMA Nusaputera').trim(),
        foto_sebelum: normalizeSafeUrl(foto_sebelum),
        foto_pemusnahan: normalizeSafeUrl(foto_pemusnahan),
        file_bast_signed: normalizeSafeUrl(file_bast_signed),
        catatan_admin: wantsExecuteNow && catatan_admin ? String(catatan_admin).trim() : null,
        created_by: staffId,
        approved_by: wantsExecuteNow ? staffId : null,
        approved_at: wantsExecuteNow ? new Date() : null,
        items: {
          create: resolvedItems
        }
      },
      include: {
        items: true
      }
    })

    let deductedInventories = 0
    if (wantsExecuteNow) {
      deductedInventories = await deductStockForDisposal(tx, created.id, nomorSurat, staffId, created)
    }

    return { id: created.id, deductedInventories }
  }, DISPOSAL_TX_OPTIONS)

  const fullRecord = await prisma.disposalRecord.findUnique({
    where: { id: createdRecord.id },
    include: {
      creator: { select: { id: true, name: true, role: true } },
      approver: { select: { id: true, name: true, role: true } },
      items: true
    }
  })

  return {
    success: true,
    message: wantsExecuteNow
      ? `Pemusnahan barang (${nomorSurat}) berhasil dicatat & dieksekusi! Stok inventaris terkait otomatis disesuaikan.`
      : `Pengajuan pemusnahan (${nomorSurat}) berhasil dibuat dan menunggu persetujuan Admin.`,
    disposal: fullRecord,
    deductedInventories: createdRecord.deductedInventories
  }
})
