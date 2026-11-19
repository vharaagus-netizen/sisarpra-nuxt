/**
 * Server Date & Time Helpers
 * Memastikan tanggal dan jam tidak bergeser akibat perbedaan UTC / Local Timezone (WIB).
 */

export function toUtcDate(val: string | Date | null | undefined): Date {
  if (!val) return new Date()
  if (val instanceof Date) {
    const y = val.getUTCFullYear()
    const m = String(val.getUTCMonth() + 1).padStart(2, '0')
    const d = String(val.getUTCDate()).padStart(2, '0')
    return new Date(`${y}-${m}-${d}T00:00:00.000Z`)
  }
  const str = String(val).trim().split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(val)
  }
  return new Date(`${str}T00:00:00.000Z`)
}

export function getTodayUtcDate(): Date {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`)
}

export function toUtcTime(timeStr: string): Date {
  const [h, m] = String(timeStr).split(':')
  const d = new Date('1970-01-01T00:00:00.000Z')
  d.setUTCHours(Number(h) || 0, Number(m) || 0, 0, 0)
  return d
}

export function formatTimeStr(val: any): string {
  if (!val) return ''
  const str = typeof val === 'string' ? val : (val instanceof Date ? val.toISOString() : String(val))
  if (str.includes('T')) {
    return str.split('T')[1].substring(0, 5)
  }
  return str.substring(0, 5)
}
