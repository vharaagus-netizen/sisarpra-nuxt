/**
 * Client-safe helpers for parsing & previewing Google Drive URLs
 * Auto-imported by Nuxt 3 across components and pages.
 */

export function isGoogleDriveFolderUrl(url?: string | null): boolean {
  if (!url) return false
  return /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/[a-zA-Z0-9_-]+/i.test(url)
}

export function extractGoogleDriveFileId(url?: string | null): string | null {
  if (!url) return null
  const str = String(url).trim()
  if (isGoogleDriveFolderUrl(str)) return null

  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/open\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/uc\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/thumbnail\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/i,
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i,
    /docs\.google\.com\/(?:document|spreadsheets|presentation|file)\/d\/([a-zA-Z0-9_-]+)/i
  ]

  for (const regex of patterns) {
    const match = str.match(regex)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

export function isGoogleDriveUrl(url?: string | null): boolean {
  if (!url) return false
  return /(?:drive|docs)\.google\.com|lh3\.googleusercontent\.com/i.test(String(url))
}

export function getGoogleDriveThumbnailUrl(url?: string | null, size = 1000): string | null {
  const id = extractGoogleDriveFileId(url)
  if (!id) return null
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${size}`
}

export function getGoogleDriveFallbackImageUrl(url?: string | null, size = 1000): string | null {
  const id = extractGoogleDriveFileId(url)
  if (!id) return null
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w${size}`
}

export function getGoogleDrivePreviewUrl(url?: string | null): string | null {
  const id = extractGoogleDriveFileId(url)
  if (!id) return null
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`
}

export function isDirectImageUrl(url?: string | null): boolean {
  if (!url) return false
  return /\.(?:jpg|jpeg|png|webp|gif)(?:\?.*)?$/i.test(String(url).trim())
}
