import { createError } from 'h3'
import type { Prisma, PrismaClient } from '@prisma/client'

export const DISPOSAL_SOURCES = ['sarpra', 'lab', 'buku', 'manual'] as const
export const DISPOSAL_METHODS = [
  'dihancurkan',
  'dibakar',
  'dibongkar_daur_ulang',
  'limbah_b3',
  'dibuang_tps',
  'lainnya'
] as const
export const DISPOSAL_STATUSES = [
  'menunggu_persetujuan',
  'disetujui',
  'selesai',
  'ditolak'
] as const
export const DISPOSAL_CONDITIONS = [
  'rusak_berat',
  'kadaluarsa',
  'usang',
  'hilang_susut',
  'lainnya'
] as const

export type DisposalSource = (typeof DISPOSAL_SOURCES)[number]
export type DisposalMethod = (typeof DISPOSAL_METHODS)[number]
export type DisposalStatus = (typeof DISPOSAL_STATUSES)[number]

export const DISPOSAL_TX_OPTIONS = {
  maxWait: 10000,
  timeout: 25000
} as const

type DbClient = PrismaClient | Prisma.TransactionClient

/**
 * Safely parse a numeric/string ID into BigInt, throwing 422 on invalid input.
 */
export function parseBigIntId(val: any, fieldLabel = 'ID'): bigint {
  const str = String(val ?? '').trim()
  if (!/^\d+$/.test(str)) {
    throw createError({
      statusCode: 422,
      statusMessage: `${fieldLabel} tidak valid.`
    })
  }
  return BigInt(str)
}

/**
 * Safely parse an optional numeric/string ID into BigInt or null.
 */
export function parseOptionalBigIntId(val: any): bigint | null {
  if (val === undefined || val === null || val === '') return null
  const str = String(val).trim()
  if (!/^\d+$/.test(str)) return null
  return BigInt(str)
}

/**
 * Build shared Prisma `where` filter for disposal list & export queries.
 */
export function buildDisposalWhere(query: Record<string, any>): Prisma.DisposalRecordWhereInput {
  const status = query.status ? String(query.status).trim() : undefined
  const sumber = query.sumber ? String(query.sumber).trim() : undefined
  const metode = query.metode ? String(query.metode).trim() : undefined
  const search = query.search ? String(query.search).trim() : undefined
  const month = query.month ? String(query.month).trim() : undefined
  const year = query.year ? parseInt(String(query.year), 10) : null

  const where: Prisma.DisposalRecordWhereInput = {}

  if (status && status !== 'all' && (DISPOSAL_STATUSES as readonly string[]).includes(status)) {
    where.status = status
  }

  if (metode && metode !== 'all' && (DISPOSAL_METHODS as readonly string[]).includes(metode)) {
    where.metode_pemusnahan = metode
  }

  if (sumber && sumber !== 'all' && (DISPOSAL_SOURCES as readonly string[]).includes(sumber)) {
    where.items = {
      some: {
        sumber_barang: sumber
      }
    }
  }

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number)
    const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
    const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0))
    where.tanggal_pemusnahan = {
      gte: startDate,
      lt: endDate
    }
  } else if (year && !Number.isNaN(year)) {
    const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0))
    const endDate = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0))
    where.tanggal_pemusnahan = {
      gte: startDate,
      lt: endDate
    }
  }

  if (search) {
    where.OR = [
      { nomor_surat: { contains: search } },
      { judul_acara: { contains: search } },
      { lokasi_pemusnahan: { contains: search } },
      { alasan_umum: { contains: search } },
      { penanggung_jawab_nama: { contains: search } },
      {
        items: {
          some: {
            OR: [
              { nama_barang: { contains: search } },
              { kode_barang: { contains: search } },
              { kategori_sumber: { contains: search } }
            ]
          }
        }
      }
    ]
  }

  return where
}

/**
 * Generate a unique sequential document number: BAP/SARPRA/YYYY/0001
 */
export async function generateDisposalNumber(
  db: DbClient,
  year: number
): Promise<string> {
  const existing = await db.disposalRecord.findMany({
    where: { tahun_anggaran: year },
    select: { nomor_surat: true }
  })

  const used = new Set(existing.map(r => r.nomor_surat))
  let seq = existing.length + 1
  while (used.has(`BAP/SARPRA/${year}/${String(seq).padStart(4, '0')}`)) {
    seq++
  }
  return `BAP/SARPRA/${year}/${String(seq).padStart(4, '0')}`
}

export interface NormalizedDisposalItemInput {
  sumber_barang: DisposalSource
  item_id: bigint | null
  lab_item_id: bigint | null
  book_id: bigint | null
  damage_report_id: bigint | null
  kode_barang: string | null
  nama_barang: string
  kategori_sumber: string | null
  jumlah: number
  satuan: string
  kondisi_akhir: string
  nilai_perkiraan: bigint | null
  alasan_item: string | null
}

/**
 * Validate and enrich disposal line items in batched queries against Sarpra, Lab, Book, or Manual inputs.
 */
export async function resolveAndValidateDisposalItems(
  db: DbClient,
  rawItems: any[]
): Promise<NormalizedDisposalItemInput[]> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Minimal harus ada 1 barang yang dicatat untuk pemusnahan.'
    })
  }

  const parsedRows = rawItems.map((raw, idx) => {
    const rowNum = idx + 1
    const sumberRaw = String(raw?.sumber_barang || 'sarpra').trim().toLowerCase()
    if (!(DISPOSAL_SOURCES as readonly string[]).includes(sumberRaw)) {
      throw createError({
        statusCode: 422,
        statusMessage: `Baris ${rowNum}: Sumber barang "${sumberRaw}" tidak valid.`
      })
    }
    const sumber = sumberRaw as DisposalSource
    const jumlah = Math.max(1, parseInt(String(raw?.jumlah ?? 1), 10) || 1)
    const kondisiRaw = String(raw?.kondisi_akhir || 'rusak_berat').trim().toLowerCase()
    const kondisi_akhir = (DISPOSAL_CONDITIONS as readonly string[]).includes(kondisiRaw)
      ? kondisiRaw
      : 'rusak_berat'
    const nilaiNum = raw?.nilai_perkiraan !== undefined && raw?.nilai_perkiraan !== null && raw?.nilai_perkiraan !== ''
      ? Math.max(0, parseInt(String(raw.nilai_perkiraan), 10) || 0)
      : null

    return {
      rowNum,
      raw: raw || {},
      sumber,
      jumlah,
      kondisi_akhir,
      nilai_perkiraan: nilaiNum !== null ? BigInt(nilaiNum) : null,
      damage_report_id: parseOptionalBigIntId(raw?.damage_report_id),
      alasan_item: raw?.alasan_item ? String(raw.alasan_item).trim() : null,
      itemId: sumber === 'sarpra' ? parseBigIntId(raw?.item_id, `Baris ${rowNum} (Barang Sarpra)`) : null,
      labItemId: sumber === 'lab' ? parseBigIntId(raw?.lab_item_id, `Baris ${rowNum} (Alat/Bahan Lab)`) : null,
      bookId: sumber === 'buku' ? parseBigIntId(raw?.book_id, `Baris ${rowNum} (Buku)`) : null
    }
  })

  const sarpraIds = [...new Set(parsedRows.filter(r => r.itemId !== null).map(r => r.itemId!))]
  const labIds = [...new Set(parsedRows.filter(r => r.labItemId !== null).map(r => r.labItemId!))]
  const bookIds = [...new Set(parsedRows.filter(r => r.bookId !== null).map(r => r.bookId!))]

  const [dbItems, dbLabItems, dbBooks] = await Promise.all([
    sarpraIds.length
      ? db.item.findMany({
          where: { id: { in: sarpraIds } },
          include: { category: { select: { nama_kategori: true } } }
        })
      : Promise.resolve([]),
    labIds.length
      ? db.labItem.findMany({ where: { id: { in: labIds } } })
      : Promise.resolve([]),
    bookIds.length
      ? db.book.findMany({ where: { id: { in: bookIds } } })
      : Promise.resolve([])
  ])

  const sarpraMap = new Map(dbItems.map(i => [String(i.id), i]))
  const labMap = new Map(dbLabItems.map(l => [String(l.id), l]))
  const bookMap = new Map(dbBooks.map(b => [String(b.id), b]))

  const sarpraTotals = new Map<string, number>()
  const labTotals = new Map<string, number>()
  const bookTotals = new Map<string, number>()

  const resolved: NormalizedDisposalItemInput[] = []

  for (const row of parsedRows) {
    if (row.sumber === 'sarpra') {
      const dbItem = sarpraMap.get(String(row.itemId))
      if (!dbItem) {
        throw createError({
          statusCode: 404,
          statusMessage: `Baris ${row.rowNum}: Barang inventaris tidak ditemukan.`
        })
      }
      const nextSum = (sarpraTotals.get(String(dbItem.id)) || 0) + row.jumlah
      sarpraTotals.set(String(dbItem.id), nextSum)
      if (nextSum > dbItem.stok_tersedia) {
        throw createError({
          statusCode: 422,
          statusMessage: `Baris ${row.rowNum}: Stok tersedia "${dbItem.nama_barang}" hanya ${dbItem.stok_tersedia} (tidak cukup untuk memusnahkan ${nextSum} unit; pastikan barang tidak sedang dipinjam).`
        })
      }

      resolved.push({
        sumber_barang: 'sarpra',
        item_id: dbItem.id,
        lab_item_id: null,
        book_id: null,
        damage_report_id: row.damage_report_id,
        kode_barang: dbItem.kode_barang,
        nama_barang: dbItem.nama_barang,
        kategori_sumber: dbItem.category?.nama_kategori || 'Inventaris Sarpra',
        jumlah: row.jumlah,
        satuan: row.raw.satuan ? String(row.raw.satuan).trim() : 'unit',
        kondisi_akhir: row.kondisi_akhir,
        nilai_perkiraan: row.nilai_perkiraan,
        alasan_item: row.alasan_item
      })
    } else if (row.sumber === 'lab') {
      const dbLab = labMap.get(String(row.labItemId))
      if (!dbLab) {
        throw createError({
          statusCode: 404,
          statusMessage: `Baris ${row.rowNum}: Item laboratorium tidak ditemukan.`
        })
      }
      const nextSum = (labTotals.get(String(dbLab.id)) || 0) + row.jumlah
      labTotals.set(String(dbLab.id), nextSum)
      if (nextSum > dbLab.stok_tersedia) {
        throw createError({
          statusCode: 422,
          statusMessage: `Baris ${row.rowNum}: Stok tersedia "${dbLab.nama_item}" hanya ${dbLab.stok_tersedia} ${dbLab.satuan}, tidak cukup untuk memusnahkan ${nextSum}.`
        })
      }

      resolved.push({
        sumber_barang: 'lab',
        item_id: null,
        lab_item_id: dbLab.id,
        book_id: null,
        damage_report_id: row.damage_report_id,
        kode_barang: dbLab.kode_item,
        nama_barang: dbLab.nama_item,
        kategori_sumber: `Lab ${dbLab.lab_type.toUpperCase()} (${dbLab.item_type === 'bahan_habis_pakai' ? 'Bahan' : 'Alat'})`,
        jumlah: row.jumlah,
        satuan: row.raw.satuan ? String(row.raw.satuan).trim() : dbLab.satuan || 'unit',
        kondisi_akhir: row.kondisi_akhir,
        nilai_perkiraan: row.nilai_perkiraan,
        alasan_item: row.alasan_item
      })
    } else if (row.sumber === 'buku') {
      const dbBook = bookMap.get(String(row.bookId))
      if (!dbBook) {
        throw createError({
          statusCode: 404,
          statusMessage: `Baris ${row.rowNum}: Data buku tidak ditemukan.`
        })
      }
      const nextSum = (bookTotals.get(String(dbBook.id)) || 0) + row.jumlah
      bookTotals.set(String(dbBook.id), nextSum)
      if (nextSum > dbBook.stok_tersedia) {
        throw createError({
          statusCode: 422,
          statusMessage: `Baris ${row.rowNum}: Stok tersedia buku "${dbBook.judul}" hanya ${dbBook.stok_tersedia} eks, tidak cukup untuk memusnahkan ${nextSum} eks.`
        })
      }

      resolved.push({
        sumber_barang: 'buku',
        item_id: null,
        lab_item_id: null,
        book_id: dbBook.id,
        damage_report_id: row.damage_report_id,
        kode_barang: dbBook.kode_buku,
        nama_barang: `${dbBook.judul} (Kelas ${dbBook.kelas})`,
        kategori_sumber: `${dbBook.penerbit || 'Buku'} • ${dbBook.sumber_dana}`,
        jumlah: row.jumlah,
        satuan: row.raw.satuan ? String(row.raw.satuan).trim() : 'eks',
        kondisi_akhir: row.kondisi_akhir,
        nilai_perkiraan: row.nilai_perkiraan,
        alasan_item: row.alasan_item
      })
    } else {
      const cleanNama = String(row.raw.nama_barang || '').trim()
      if (!cleanNama) {
        throw createError({
          statusCode: 422,
          statusMessage: `Baris ${row.rowNum}: Nama barang manual wajib diisi.`
        })
      }

      resolved.push({
        sumber_barang: 'manual',
        item_id: null,
        lab_item_id: null,
        book_id: null,
        damage_report_id: row.damage_report_id,
        kode_barang: row.raw.kode_barang ? String(row.raw.kode_barang).trim() : null,
        nama_barang: cleanNama,
        kategori_sumber: row.raw.kategori_sumber ? String(row.raw.kategori_sumber).trim() : 'Non-Katalog / Manual',
        jumlah: row.jumlah,
        satuan: row.raw.satuan ? String(row.raw.satuan).trim() : 'unit',
        kondisi_akhir: row.kondisi_akhir,
        nilai_perkiraan: row.nilai_perkiraan,
        alasan_item: row.alasan_item
      })
    }
  }

  return resolved
}

/**
 * Idempotently deduct inventory stock for every line item in a DisposalRecord
 * using batched reads & parallel writes to stay well under TiDB/Prisma tx limits.
 */
export async function deductStockForDisposal(
  tx: Prisma.TransactionClient,
  disposalId: bigint,
  nomorSurat: string,
  executorUserId: bigint,
  preloadedRecord?: { stok_terpotong: boolean; items: any[] } | null
): Promise<number> {
  const record = preloadedRecord || await tx.disposalRecord.findUnique({
    where: { id: disposalId },
    include: { items: true }
  })

  if (!record) {
    throw createError({ statusCode: 404, statusMessage: 'Dokumen pemusnahan tidak ditemukan.' })
  }

  if (record.stok_terpotong) {
    return 0
  }

  const pendingLines = (record.items || []).filter(line => !line.stok_dipotong)

  const sarpraQtyMap = new Map<string, { id: bigint; qty: number }>()
  const labQtyMap = new Map<string, { id: bigint; qty: number }>()
  const bookQtyMap = new Map<string, { id: bigint; qty: number }>()
  const damageIds = new Set<string>()
  const damageBigIntMap = new Map<string, bigint>()

  for (const line of pendingLines) {
    if (line.sumber_barang === 'sarpra' && line.item_id) {
      const k = String(line.item_id)
      const prev = sarpraQtyMap.get(k)
      sarpraQtyMap.set(k, { id: BigInt(line.item_id), qty: (prev?.qty || 0) + Number(line.jumlah || 0) })
    } else if (line.sumber_barang === 'lab' && line.lab_item_id) {
      const k = String(line.lab_item_id)
      const prev = labQtyMap.get(k)
      labQtyMap.set(k, { id: BigInt(line.lab_item_id), qty: (prev?.qty || 0) + Number(line.jumlah || 0) })
    } else if (line.sumber_barang === 'buku' && line.book_id) {
      const k = String(line.book_id)
      const prev = bookQtyMap.get(k)
      bookQtyMap.set(k, { id: BigInt(line.book_id), qty: (prev?.qty || 0) + Number(line.jumlah || 0) })
    }

    if (line.damage_report_id) {
      const dk = String(line.damage_report_id)
      damageIds.add(dk)
      damageBigIntMap.set(dk, BigInt(line.damage_report_id))
    }
  }

  const [dbItems, dbLabs, dbBooks, dbDamages] = await Promise.all([
    sarpraQtyMap.size ? tx.item.findMany({ where: { id: { in: [...sarpraQtyMap.values()].map(v => v.id) } } }) : Promise.resolve([]),
    labQtyMap.size ? tx.labItem.findMany({ where: { id: { in: [...labQtyMap.values()].map(v => v.id) } } }) : Promise.resolve([]),
    bookQtyMap.size ? tx.book.findMany({ where: { id: { in: [...bookQtyMap.values()].map(v => v.id) } } }) : Promise.resolve([]),
    damageIds.size ? tx.damageReport.findMany({ where: { id: { in: [...damageBigIntMap.values()] } } }) : Promise.resolve([])
  ])

  const writePromises: Promise<any>[] = []
  let deductedCount = 0

  for (const dbItem of dbItems) {
    const reqQty = sarpraQtyMap.get(String(dbItem.id))?.qty || 0
    if (reqQty <= 0) continue
    if (reqQty > dbItem.stok_tersedia) {
      throw createError({
        statusCode: 422,
        statusMessage: `Stok tersedia "${dbItem.nama_barang}" tinggal ${dbItem.stok_tersedia}, tidak mencukupi untuk memusnahkan ${reqQty} unit.`
      })
    }
    const nextTotal = Math.max(0, dbItem.total_stok - reqQty)
    const nextAvail = Math.max(0, dbItem.stok_tersedia - reqQty)
    writePromises.push(
      tx.item.update({
        where: { id: dbItem.id },
        data: {
          total_stok: nextTotal,
          stok_tersedia: nextAvail,
          ...(nextTotal === 0 ? { kondisi: 'rusak_berat' } : {})
        }
      })
    )
    deductedCount++
  }

  for (const dbLab of dbLabs) {
    const reqQty = labQtyMap.get(String(dbLab.id))?.qty || 0
    if (reqQty <= 0) continue
    if (reqQty > dbLab.stok_tersedia) {
      throw createError({
        statusCode: 422,
        statusMessage: `Stok tersedia "${dbLab.nama_item}" tinggal ${dbLab.stok_tersedia} ${dbLab.satuan}, tidak mencukupi untuk memusnahkan ${reqQty}.`
      })
    }
    const nextTotal = Math.max(0, dbLab.stok_total - reqQty)
    const nextAvail = Math.max(0, dbLab.stok_tersedia - reqQty)
    writePromises.push(
      tx.labItem.update({
        where: { id: dbLab.id },
        data: {
          stok_total: nextTotal,
          stok_tersedia: nextAvail,
          ...(nextTotal === 0 ? { kondisi: 'habis' } : {})
        }
      })
    )
    deductedCount++
  }

  for (const dbBook of dbBooks) {
    const reqQty = bookQtyMap.get(String(dbBook.id))?.qty || 0
    if (reqQty <= 0) continue
    if (reqQty > dbBook.stok_tersedia) {
      throw createError({
        statusCode: 422,
        statusMessage: `Stok tersedia buku "${dbBook.judul}" tinggal ${dbBook.stok_tersedia} eks, tidak mencukupi untuk memusnahkan ${reqQty} eks.`
      })
    }
    const nextTotal = Math.max(0, dbBook.total_stok - reqQty)
    const nextAvail = Math.max(0, dbBook.stok_tersedia - reqQty)
    writePromises.push(
      tx.book.update({
        where: { id: dbBook.id },
        data: {
          total_stok: nextTotal,
          stok_tersedia: nextAvail,
          ...(nextTotal === 0 ? { kondisi: 'rusak_berat' } : {})
        }
      })
    )
    deductedCount++
  }

  const actionText = `Barang dimusnahkan sesuai Berita Acara Pemusnahan ${nomorSurat}.`
  for (const dmg of dbDamages) {
    if (dmg.status === 'selesai') continue
    const oldStatus = dmg.status
    writePromises.push(
      tx.damageReport.update({
        where: { id: dmg.id },
        data: {
          status: 'selesai',
          tanggal_selesai: new Date(),
          tindakan_perbaikan: dmg.tindakan_perbaikan
            ? `${dmg.tindakan_perbaikan}\n${actionText}`
            : actionText
        }
      }),
      tx.damageActionLog.create({
        data: {
          damage_report_id: dmg.id,
          user_id: executorUserId,
          status_lama: oldStatus,
          status_baru: 'selesai',
          catatan_tindakan: actionText
        }
      })
    )
  }

  writePromises.push(
    tx.disposalItem.updateMany({
      where: { disposal_id: disposalId, stok_dipotong: false },
      data: { stok_dipotong: true }
    }),
    tx.disposalRecord.update({
      where: { id: disposalId },
      data: {
        stok_terpotong: true,
        executed_at: new Date()
      }
    })
  )

  await Promise.all(writePromises)

  return deductedCount
}

/**
 * Restore deducted stock when an executed disposal record is deleted by Super Admin.
 */
export async function restoreStockForDisposal(
  tx: Prisma.TransactionClient,
  disposalId: bigint
): Promise<number> {
  const record = await tx.disposalRecord.findUnique({
    where: { id: disposalId },
    include: { items: true }
  })

  if (!record || !record.stok_terpotong) return 0

  const deductedLines = record.items.filter(line => line.stok_dipotong)
  const sarpraQtyMap = new Map<string, { id: bigint; qty: number }>()
  const labQtyMap = new Map<string, { id: bigint; qty: number }>()
  const bookQtyMap = new Map<string, { id: bigint; qty: number }>()

  for (const line of deductedLines) {
    if (line.sumber_barang === 'sarpra' && line.item_id) {
      const k = String(line.item_id)
      sarpraQtyMap.set(k, { id: line.item_id, qty: (sarpraQtyMap.get(k)?.qty || 0) + line.jumlah })
    } else if (line.sumber_barang === 'lab' && line.lab_item_id) {
      const k = String(line.lab_item_id)
      labQtyMap.set(k, { id: line.lab_item_id, qty: (labQtyMap.get(k)?.qty || 0) + line.jumlah })
    } else if (line.sumber_barang === 'buku' && line.book_id) {
      const k = String(line.book_id)
      bookQtyMap.set(k, { id: line.book_id, qty: (bookQtyMap.get(k)?.qty || 0) + line.jumlah })
    }
  }

  const [dbItems, dbLabs, dbBooks] = await Promise.all([
    sarpraQtyMap.size ? tx.item.findMany({ where: { id: { in: [...sarpraQtyMap.values()].map(v => v.id) } } }) : Promise.resolve([]),
    labQtyMap.size ? tx.labItem.findMany({ where: { id: { in: [...labQtyMap.values()].map(v => v.id) } } }) : Promise.resolve([]),
    bookQtyMap.size ? tx.book.findMany({ where: { id: { in: [...bookQtyMap.values()].map(v => v.id) } } }) : Promise.resolve([])
  ])

  const writePromises: Promise<any>[] = []
  let restoredCount = 0

  for (const dbItem of dbItems) {
    const qty = sarpraQtyMap.get(String(dbItem.id))?.qty || 0
    if (qty <= 0) continue
    writePromises.push(
      tx.item.update({
        where: { id: dbItem.id },
        data: {
          total_stok: dbItem.total_stok + qty,
          stok_tersedia: dbItem.stok_tersedia + qty
        }
      })
    )
    restoredCount++
  }

  for (const dbLab of dbLabs) {
    const qty = labQtyMap.get(String(dbLab.id))?.qty || 0
    if (qty <= 0) continue
    writePromises.push(
      tx.labItem.update({
        where: { id: dbLab.id },
        data: {
          stok_total: dbLab.stok_total + qty,
          stok_tersedia: dbLab.stok_tersedia + qty,
          ...(dbLab.kondisi === 'habis' ? { kondisi: 'rusak_berat' } : {})
        }
      })
    )
    restoredCount++
  }

  for (const dbBook of dbBooks) {
    const qty = bookQtyMap.get(String(dbBook.id))?.qty || 0
    if (qty <= 0) continue
    writePromises.push(
      tx.book.update({
        where: { id: dbBook.id },
        data: {
          total_stok: dbBook.total_stok + qty,
          stok_tersedia: dbBook.stok_tersedia + qty
        }
      })
    )
    restoredCount++
  }

  await Promise.all(writePromises)

  return restoredCount
}
