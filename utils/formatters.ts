/**
 * Client Date & Time Formatters
 * Otomatis di-auto-import oleh Nuxt 3 ke seluruh komponen Vue dan halaman.
 */

export function formatDate(val: any): string {
  if (!val) return ''
  const str = typeof val === 'string' ? val : (val instanceof Date ? val.toISOString() : String(val))
  const clean = str.split('T')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
  }
  const date = new Date(val)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTime(val: any): string {
  if (!val) return ''
  const str = typeof val === 'string' ? val : (val instanceof Date ? val.toISOString() : String(val))
  if (str.includes('T')) {
    return str.split('T')[1].substring(0, 5)
  }
  return str.substring(0, 5)
}
