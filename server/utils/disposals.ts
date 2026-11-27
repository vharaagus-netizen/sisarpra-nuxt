import { createError } from 'h3'
import type { Prisma } from '@prisma/client'

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
  tx: Prisma.TransactionClient,
  year: number
): Promise<string> {
  const existingCount = await tx.disposalRecord.count({
    where: { tahun_anggaran: year }
  })

  let seq = existingCount + 1
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = `BAP/SARPRA/${year}/${String(seq).padStart(4, '0')}`
    const conflict = await tx.disposalRecord.findUnique({
      where: { nomor_surat: candidate },
      select: { id: true }
    })
    if (!conflict) return candidate
    seq++
  }

  return `BAP/SARPRA/${year}/${Date.now().toString().slice(-6)}`
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
 * Validate and enrich disposal line items against Sarpra, Lab, Book, or Manual inputs.
 */
export async function resolveAndValidateDisposalItems(
  tx: Prisma.TransactionClient,
  rawItems: any[]
): Promise<NormalizedDisposalItemInput[]> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Minimal harus ada 1 barang yang dicatat untuk pemusnahan.'
    })
  }

  const resolved: NormalizedDisposalItemInput[] = []

  for (let idx = 0; idx < rawItems.length; idx++) {
    const raw = rawItems[idx] || {}
    const rowNum = idx + 1
    const sumberRaw = String(raw.sumber_barang || 'sarpra').trim().toLowerCase()
    if (!(DISPOSAL_SOURCES as readonly string[]).includes(sumberRaw)) {
      throw createError({
        statusCode: 422,
        statusMessage: `Baris ${rowNum}: Sumber barang "${sumberRaw}" tidak valid.`
      })
    }
    const sumber = sumberRaw as DisposalSource
    const jumlah = Math.max(1, parseInt(String(raw.jumlah ?? 1), 10) || 1)

    const kondisiRaw = String(raw.kondisi_akhir || 'rusak_berat').trim().toLowerCase()
    const kondisi_akhir = (DISPOSAL_CONDITIONS as readonly string[]).includes(kondisiRaw)
      ? kondisiRaw
      : 'rusak_berat'

    const nilaiNum = raw.nilai_perkiraan !== undefined && raw.nilai_perkiraan !== null && raw.nilai_perkiraan !== ''
      ? Math.max(0, parseInt(String(raw.nilai_perkiraan), 10) || 0)
      : null
    const nilai_perkiraan = nilaiNum !== null ? BigInt(nilaiNum) : null

    const damage_report_id = parseOptionalBigIntId(raw.damage_report_id)
    const alasan_item = raw.alasan_item ? String(raw.alasan_item).trim() : null

    if (sumber === 'sarpra') {
      const itemId = parseBigIntId(raw.item_id, `Baris ${rowNum} (Barang Sarpra)`)
      const dbItem = await tx.item.findUnique({
        where: { id: itemId },
        include: { category: { select: { nama_kategori: true } } }
      })
      if (!dbItem) {
        throw createError({
          statusCode: 404,
          statusMessage: `Baris ${rowNum}: Barang inventaris tidak ditemukan.`
        })
      }
      if (jumlah > dbItem.stok_tersedia) {
        throw createError({
          statusCode: 422,
          statusMessage: `Baris ${rowNum}: Stok tersedia "${dbItem.nama_barang}" hanya ${dbItem.stok_tersedia} (tidak cukup untuk memusnahkan ${jumlah} unit; pastikan barang tidak sedang dipinjam).`
        })
      }

      resolved.push({
        sumber_barang: 'sarpra',
        item_id: dbItem.id,
        lab_item_id: null,
        book_id: null,
        damage_report_id,
        kode_barang: dbItem.kode_barang,
        nama_barang: dbItem.nama_barang,
        kategori_sumber: dbItem.category?.nama_kategori || 'Inventaris Sarpra',
        jumlah,
        satuan: raw.satuan ? String(raw.satuan).trim() : 'unit',
        kondisi_akhir,
        nilai_perkiraan,
        alasan_item
      })
    } else if (sumber === 'lab') {
      const labItemId = parseBigIntId(raw.lab_item_id, `Baris ${rowNum} (Alat/Bahan Lab)`)
      const dbLab = await tx.labItem.findUnique({ where: { id: labItemId } })
      if (!dbLab) {
        throw createError({
          statusCode: 404,
          statusMessage: `Baris ${rowNum}: Item laboratorium tidak ditemukan.`
        })
      }
      if (jumlah > dbLab.stok_tersedia) {
        throw createError({
          statusCode: 422,
          statusMessage: `Baris ${rowNum}: Stok tersedia "${dbLab.nama_item}" hanya ${dbLab.stok_tersedia} ${dbLab.satuan}, tidak cukup untuk memusnahkan ${jumlah}.`
        })
      }

      resolved.push({
        sumber_barang: 'lab',
        item_id: null,
        lab_item_id: dbLab.id,
        book_id: null,
        damage_report_id,
        kode_barang: dbLab.kode_item,
        nama_barang: dbLab.nama_item,
        kategori_sumber: `Lab ${dbLab.lab_type.toUpperCase()} (${dbLab.item_type === 'bahan_habis_pakai' ? 'Bahan' : 'Alat'})`,
        jumlah,
        satuan: raw.satuan ? String(raw.satuan).trim() : dbLab.satuan || 'unit',
        kondisi_akhir,
        nilai_perkiraan,
        alasan_item
      })
    } else if (sumber === 'buku') {
      const bookId = parseBigIntId(raw.book_id, `Baris ${rowNum} (Buku)`)
      const dbBook = await tx.book.findUnique({ where: { id: bookId } })
      if (!dbBook) {
        throw createError({
          statusCode: 404,
          statusMessage: `Baris ${rowNum}: Data buku tidak ditemukan.`
        })
      }
      if (jumlah > dbBook.stok_tersedia) {
        throw createError({
          statusCode: 422,
          statusMessage: `Baris ${rowNum}: Stok tersedia buku "${dbBook.judul}" hanya ${dbBook.stok_tersedia} eks, tidak cukup untuk memusnahkan ${jumlah} eks.`
        })
      }

      resolved.push({
        sumber_barang: 'buku',
        item_id: null,
        lab_item_id: null,
        book_id: dbBook.id,
        damage_report_id,
        kode_barang: dbBook.kode_buku,
        nama_barang: `${dbBook.judul} (Kelas ${dbBook.kelas})`,
        kategori_sumber: `${dbBook.penerbit || 'Buku'} • ${dbBook.sumber_dana}`,
        jumlah,
        satuan: raw.satuan ? String(raw.satuan).trim() : 'eks',
        kondisi_akhir,
        nilai_perkiraan,
        alasan_item
      })
    } else {
      const cleanNama = String(raw.nama_barang || '').trim()
      if (!cleanNama) {
        throw createError({
          statusCode: 422,
          statusMessage: `Baris ${rowNum}: Nama barang manual wajib diisi.`
        })
      }

      resolved.push({
        sumber_barang: 'manual',
        item_id: null,
        lab_item_id: null,
        book_id: null,
        damage_report_id,
        kode_barang: raw.kode_barang ? String(raw.kode_barang).trim() : null,
        nama_barang: cleanNama,
        kategori_sumber: raw.kategori_sumber ? String(raw.kategori_sumber).trim() : 'Non-Katalog / Manual',
        jumlah,
        satuan: raw.satuan ? String(raw.satuan).trim() : 'unit',
        kondisi_akhir,
        nilai_perkiraan,
        alasan_item
      })
    }
  }

  return resolved
}

/**
 * Idempotently deduct inventory stock for every line item in a DisposalRecord
 * and mark linked DamageReport tickets as resolved via disposal.
 */
export async function deductStockForDisposal(
  tx: Prisma.TransactionClient,
  disposalId: bigint,
  nomorSurat: string,
  executorUserId: bigint
): Promise<number> {
  const record = await tx.disposalRecord.findUnique({
    where: { id: disposalId },
    include: { items: true }
  })

  if (!record) {
    throw createError({ statusCode: 404, statusMessage: 'Dokumen pemusnahan tidak ditemukan.' })
  }

  if (record.stok_terpotong) {
    return 0
  }

  let deductedCount = 0

  for (const line of record.items) {
    if (!line.stok_dipotong) {
      if (line.sumber_barang === 'sarpra' && line.item_id) {
        const dbItem = await tx.item.findUnique({ where: { id: line.item_id } })
        if (dbItem) {
          if (line.jumlah > dbItem.stok_tersedia) {
            throw createError({
              statusCode: 422,
              statusMessage: `Stok tersedia "${dbItem.nama_barang}" tinggal ${dbItem.stok_tersedia}, tidak mencukupi untuk memusnahkan ${line.jumlah} ${line.satuan}.`
            })
          }
          const nextTotal = Math.max(0, dbItem.total_stok - line.jumlah)
          const nextAvail = Math.max(0, dbItem.stok_tersedia - line.jumlah)
          await tx.item.update({
            where: { id: dbItem.id },
            data: {
              total_stok: nextTotal,
              stok_tersedia: nextAvail,
              ...(nextTotal === 0 ? { kondisi: 'rusak_berat' } : {})
            }
          })
          deductedCount++
        }
      } else if (line.sumber_barang === 'lab' && line.lab_item_id) {
        const dbLab = await tx.labItem.findUnique({ where: { id: line.lab_item_id } })
        if (dbLab) {
          if (line.jumlah > dbLab.stok_tersedia) {
            throw createError({
              statusCode: 422,
              statusMessage: `Stok tersedia "${dbLab.nama_item}" tinggal ${dbLab.stok_tersedia} ${dbLab.satuan}, tidak mencukupi untuk memusnahkan ${line.jumlah}.`
            })
          }
          const nextTotal = Math.max(0, dbLab.stok_total - line.jumlah)
          const nextAvail = Math.max(0, dbLab.stok_tersedia - line.jumlah)
          await tx.labItem.update({
            where: { id: dbLab.id },
            data: {
              stok_total: nextTotal,
              stok_tersedia: nextAvail,
              ...(nextTotal === 0 ? { kondisi: 'habis' } : {})
            }
          })
          deductedCount++
        }
      } else if (line.sumber_barang === 'buku' && line.book_id) {
        const dbBook = await tx.book.findUnique({ where: { id: line.book_id } })
        if (dbBook) {
          if (line.jumlah > dbBook.stok_tersedia) {
            throw createError({
              statusCode: 422,
              statusMessage: `Stok tersedia buku "${dbBook.judul}" tinggal ${dbBook.stok_tersedia} eks, tidak mencukupi untuk memusnahkan ${line.jumlah} eks.`
            })
          }
          const nextTotal = Math.max(0, dbBook.total_stok - line.jumlah)
          const nextAvail = Math.max(0, dbBook.stok_tersedia - line.jumlah)
          await tx.book.update({
            where: { id: dbBook.id },
            data: {
              total_stok: nextTotal,
              stok_tersedia: nextAvail,
              ...(nextTotal === 0 ? { kondisi: 'rusak_berat' } : {})
            }
          })
          deductedCount++
        }
      }

      if (line.damage_report_id) {
        const dmg = await tx.damageReport.findUnique({ where: { id: line.damage_report_id } })
        if (dmg && dmg.status !== 'selesai') {
          const oldStatus = dmg.status
          const actionText = `Barang dimusnahkan sesuai Berita Acara Pemusnahan ${nomorSurat}.`
          await tx.damageReport.update({
            where: { id: dmg.id },
            data: {
              status: 'selesai',
              tanggal_selesai: new Date(),
              tindakan_perbaikan: dmg.tindakan_perbaikan
                ? `${dmg.tindakan_perbaikan}\n${actionText}`
                : actionText
            }
          })
          await tx.damageActionLog.create({
            data: {
              damage_report_id: dmg.id,
              user_id: executorUserId,
              status_lama: oldStatus,
              status_baru: 'selesai',
              catatan_tindakan: actionText
            }
          })
        }
      }

      await tx.disposalItem.update({
        where: { id: line.id },
        data: { stok_dipotong: true }
      })
    }
  }

  await tx.disposalRecord.update({
    where: { id: disposalId },
    data: {
      stok_terpotong: true,
      executed_at: new Date()
    }
  })

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

  let restoredCount = 0

  for (const line of record.items) {
    if (!line.stok_dipotong) continue

    if (line.sumber_barang === 'sarpra' && line.item_id) {
      const dbItem = await tx.item.findUnique({ where: { id: line.item_id } })
      if (dbItem) {
        await tx.item.update({
          where: { id: dbItem.id },
          data: {
            total_stok: dbItem.total_stok + line.jumlah,
            stok_tersedia: dbItem.stok_tersedia + line.jumlah
          }
        })
        restoredCount++
      }
    } else if (line.sumber_barang === 'lab' && line.lab_item_id) {
      const dbLab = await tx.labItem.findUnique({ where: { id: line.lab_item_id } })
      if (dbLab) {
        await tx.labItem.update({
          where: { id: dbLab.id },
          data: {
            stok_total: dbLab.stok_total + line.jumlah,
            stok_tersedia: dbLab.stok_tersedia + line.jumlah,
            ...(dbLab.kondisi === 'habis' ? { kondisi: 'rusak_berat' } : {})
          }
        })
        restoredCount++
      }
    } else if (line.sumber_barang === 'buku' && line.book_id) {
      const dbBook = await tx.book.findUnique({ where: { id: line.book_id } })
      if (dbBook) {
        await tx.book.update({
          where: { id: dbBook.id },
          data: {
            total_stok: dbBook.total_stok + line.jumlah,
            stok_tersedia: dbBook.stok_tersedia + line.jumlah
          }
        })
        restoredCount++
      }
    }
  }

  return restoredCount
}
