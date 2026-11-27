import { createError } from 'h3'

/**
 * Utilities for Google Drive Upload Proxy Validation & Security
 */

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const STAFF_ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'] as const
export const ALLOWED_DRIVE_FOLDERS = ['Kerusakan', 'Perbaikan', 'Pengadaan', 'BAST', 'Buku', 'Aset', 'Pemusnahan'] as const

// Batas aman 3 MB biner (~4 MB JSON base64) agar selalu di bawah limit 4.5 MB Vercel Serverless
export const MAX_RAW_UPLOAD_BYTES = 3 * 1024 * 1024

export function isStaffRole(role?: string | null): boolean {
  return role === 'admin' || role === 'petugas'
}

export function getAllowedMimeTypesForRole(role?: string | null): readonly string[] {
  return isStaffRole(role) ? STAFF_ALLOWED_MIME_TYPES : IMAGE_MIME_TYPES
}

export function getExtensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'application/pdf':
      return '.pdf'
    default:
      return ''
  }
}

export function sanitizeFilename(rawName: string, mimeType: string): string {
  const ext = getExtensionForMimeType(mimeType)
  const baseWithoutExt = String(rawName || 'file')
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)

  const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
  const rand = Math.floor(100 + Math.random() * 900)
  return `${baseWithoutExt || 'dokumen'}_${stamp}_${rand}${ext}`
}

export function validateFileMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }

  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
  }

  if (mimeType === 'image/webp') {
    if (buffer.length < 12) return false
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  }

  if (mimeType === 'application/pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  }

  return false
}

export interface ValidatedUploadPayload {
  filename: string
  mimeType: string
  base64: string
  folder: string
  byteLength: number
}

export function validateUploadPayload(userRole: string | undefined | null, body: any): ValidatedUploadPayload {
  const { filename, mimeType, base64, folder } = body || {}

  if (!mimeType || typeof mimeType !== 'string') {
    throw createError({ statusCode: 422, statusMessage: 'Tipe file (mimeType) wajib disertakan.' })
  }

  const normalizedMime = mimeType.toLowerCase().trim()
  const isKnownMime = (STAFF_ALLOWED_MIME_TYPES as readonly string[]).includes(normalizedMime)
  if (!isKnownMime) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Format file tidak didukung. Gunakan gambar JPG, PNG, WebP, atau dokumen PDF (khusus Petugas/Admin).'
    })
  }

  // Enforce role restriction: Guru & Siswa hanya boleh upload gambar (JPG/PNG/WebP)
  const allowedForRole = getAllowedMimeTypesForRole(userRole)
  if (!allowedForRole.includes(normalizedMime)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akses ditolak: Hanya Petugas atau Admin yang diizinkan mengunggah dokumen PDF. Guru dan Siswa khusus foto (JPG/PNG/WebP).'
    })
  }

  if (!folder || !(ALLOWED_DRIVE_FOLDERS as readonly string[]).includes(String(folder))) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Folder tujuan Google Drive tidak valid.'
    })
  }

  if (!base64 || typeof base64 !== 'string') {
    throw createError({ statusCode: 422, statusMessage: 'Isi file tidak boleh kosong.' })
  }

  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
    throw createError({ statusCode: 422, statusMessage: 'Format data base64 file tidak valid.' })
  }

  const buffer = Buffer.from(cleanBase64, 'base64')
  if (buffer.length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'File kosong atau rusak.' })
  }

  if (buffer.length > MAX_RAW_UPLOAD_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Ukuran file melebihi batas maksimal 3 MB setelah kompresi.'
    })
  }

  if (!validateFileMagicBytes(buffer, normalizedMime)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Konten file tidak sesuai dengan ekstensi/format yang dipilih.'
    })
  }

  return {
    filename: sanitizeFilename(String(filename || 'dokumen'), normalizedMime),
    mimeType: normalizedMime,
    base64: cleanBase64,
    folder: String(folder),
    byteLength: buffer.length
  }
}

export function normalizeSafeUrl(rawUrl: any): string | null {
  if (rawUrl === undefined || rawUrl === null) return null
  const trimmed = String(rawUrl).trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  throw createError({
    statusCode: 422,
    statusMessage: 'Link dokumentasi harus berupa URL valid yang diawali http:// atau https://.'
  })
}
