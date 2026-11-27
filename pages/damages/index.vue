<script setup>
const { user, isStaff } = useAuth()

// Filter State
const searchQuery = ref('')
const selectedStatus = ref('')
const selectedKategori = ref('')
const selectedUrgensi = ref('')
const scopeMode = ref('all') // 'all' | 'my'
const viewMode = ref('cards') // 'cards' | 'table'

// Fetch Data
const { data: pageData, refresh: fetchData, pending: loading } = await useFetch('/api/damages', {
  query: computed(() => ({
    status: selectedStatus.value || undefined,
    kategori: selectedKategori.value || undefined,
    tingkat_urgensi: selectedUrgensi.value || undefined,
    scope: scopeMode.value === 'my' ? 'my' : undefined,
    search: searchQuery.value || undefined,
  }))
})

const reports = computed(() => pageData.value?.items || [])
const rooms = computed(() => pageData.value?.rooms || [])
const inventarisItems = computed(() => pageData.value?.inventaris_items || [])
const technicians = computed(() => pageData.value?.technicians || [])
const stats = computed(() => pageData.value?.stats || {
  total_all: 0,
  total_menunggu: 0,
  total_diproses: 0,
  total_tunggu_sparepart: 0,
  total_selesai: 0,
  total_ditolak: 0,
  total_mendesak: 0,
  total_realisasi_biaya: 0,
  total_estimasi_biaya: 0,
})

let searchTimeout = null
const onSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchData()
  }, 300)
}

// ==========================================
// MODAL 1: BUAT LAPORAN KERUSAKAN
// ==========================================
const showCreateModal = ref(false)
const submittingReport = ref(false)
const createForm = reactive({
  judul_kerusakan: '',
  deskripsi_kerusakan: '',
  kategori: 'elektronik',
  tingkat_urgensi: 'sedang',
  room_id: '',
  item_id: '',
  lokasi_keterangan: '',
  foto_sebelum: '',
})

const openCreateModal = () => {
  createForm.judul_kerusakan = ''
  createForm.deskripsi_kerusakan = ''
  createForm.kategori = 'elektronik'
  createForm.tingkat_urgensi = 'sedang'
  createForm.room_id = ''
  createForm.item_id = ''
  createForm.lokasi_keterangan = ''
  createForm.foto_sebelum = ''
  showCreateModal.value = true
}

const submitReport = async () => {
  if (!createForm.judul_kerusakan || !createForm.deskripsi_kerusakan) {
    alert('Judul dan deskripsi rincian kerusakan wajib diisi.')
    return
  }

  submittingReport.value = true
  try {
    const res = await $fetch('/api/damages/report', {
      method: 'POST',
      body: {
        ...createForm,
        room_id: createForm.room_id ? Number(createForm.room_id) : null,
        item_id: createForm.item_id ? Number(createForm.item_id) : null,
      }
    })
    showCreateModal.value = false
    await fetchData()
    alert(res?.message || 'Laporan kerusakan berhasil dikirim.')
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal mengirim laporan kerusakan.')
  } finally {
    submittingReport.value = false
  }
}

// ==========================================
// MODAL 2: DETAIL TIKET & LOG KRONOLOGI
// ==========================================
const showDetailModal = ref(false)
const activeReport = ref(null)
const loadingDetail = ref(false)

const openDetailModal = async (report) => {
  activeReport.value = report
  showDetailModal.value = true
  loadingDetail.value = true
  try {
    const res = await $fetch(`/api/damages/${report.id}`)
    activeReport.value = res.report
  } catch (err) {
    console.error('Failed to load detail', err)
  } finally {
    loadingDetail.value = false
  }
}

// ==========================================
// MODAL 3: TINDAKAN PETUGAS / UPDATE STATUS
// ==========================================
const showActionModal = ref(false)
const submittingAction = ref(false)
const targetReport = ref(null)
const actionForm = reactive({
  id: null,
  status: 'diproses',
  ditugaskan_ke: '',
  tindakan_perbaikan: '',
  estimasi_biaya: '',
  realisasi_biaya: '',
  foto_sesudah: '',
  catatan_log: '',
})

const openActionModal = (report) => {
  targetReport.value = report
  actionForm.id = report.id
  actionForm.status = report.status === 'menunggu' ? 'diproses' : report.status
  actionForm.ditugaskan_ke = report.ditugaskan_ke ? String(report.ditugaskan_ke) : ''
  actionForm.tindakan_perbaikan = report.tindakan_perbaikan || ''
  actionForm.estimasi_biaya = report.estimasi_biaya ? String(report.estimasi_biaya) : ''
  actionForm.realisasi_biaya = report.realisasi_biaya ? String(report.realisasi_biaya) : ''
  actionForm.foto_sesudah = report.foto_sesudah || ''
  actionForm.catatan_log = ''
  showActionModal.value = true
}

const submitAction = async () => {
  submittingAction.value = true
  try {
    const res = await $fetch('/api/damages/action', {
      method: 'POST',
      body: {
        id: actionForm.id,
        status: actionForm.status,
        ditugaskan_ke: actionForm.ditugaskan_ke ? Number(actionForm.ditugaskan_ke) : null,
        tindakan_perbaikan: actionForm.tindakan_perbaikan,
        estimasi_biaya: actionForm.estimasi_biaya,
        realisasi_biaya: actionForm.realisasi_biaya,
        foto_sesudah: actionForm.foto_sesudah,
        catatan_log: actionForm.catatan_log,
      }
    })
    showActionModal.value = false
    await fetchData()
    if (showDetailModal.value && activeReport.value?.id === actionForm.id) {
      await openDetailModal({ id: actionForm.id })
    }
    alert(res?.message || 'Status tiket berhasil diperbarui.')
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal memperbarui tiket.')
  } finally {
    submittingAction.value = false
  }
}

// ==========================================
// HAPUS / BATALKAN LAPORAN
// ==========================================
const deleteReport = async (report) => {
  if (!confirm(`Hapus permanen atau batalkan tiket ${report.nomor_laporan}?`)) {
    return
  }

  try {
    const res = await $fetch('/api/damages/delete', {
      method: 'POST',
      body: { id: report.id }
    })
    await fetchData()
    alert(res?.message || 'Tiket berhasil dihapus.')
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal menghapus tiket.')
  }
}

// ==========================================
// MODAL 4: CETAK / REKAP LAPORAN KERUSAKAN
// ==========================================
const showPrintModal = ref(false)
const printPeriodType = ref('month') // 'month' | 'year' | 'custom'
const printMonth = ref(new Date().getMonth() + 1)
const printYear = ref(new Date().getFullYear())
const printStartDate = ref('')
const printEndDate = ref('')
const printStatus = ref('')
const printKategori = ref('')

const monthsList = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
]

const yearsList = computed(() => {
  const currentY = new Date().getFullYear()
  return [currentY - 2, currentY - 1, currentY, currentY + 1]
})

const printSubtitle = computed(() => {
  if (printPeriodType.value === 'month') {
    const m = monthsList.find(x => x.value === Number(printMonth.value))?.label || printMonth.value
    return `Bulan ${m} Tahun ${printYear.value}`
  } else if (printPeriodType.value === 'year') {
    return `Tahun ${printYear.value} (Seluruh Bulan)`
  } else {
    return `Periode: ${formatDate(printStartDate.value)} s/d ${formatDate(printEndDate.value)}`
  }
})

const printableReports = ref([])
const printableStats = ref({
  total_all: 0,
  total_selesai: 0,
  total_diproses: 0,
  total_tunggu_sparepart: 0,
  total_menunggu: 0,
  total_ditolak: 0,
  total_realisasi_biaya: 0,
  total_estimasi_biaya: 0,
})
const loadingPrintData = ref(false)

const openPrintModal = async () => {
  const now = new Date()
  printMonth.value = now.getMonth() + 1
  printYear.value = now.getFullYear()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  printStartDate.value = firstDay
  printEndDate.value = lastDay
  printStatus.value = ''
  printKategori.value = ''
  showPrintModal.value = true
  await loadPrintData()
}

const loadPrintData = async () => {
  loadingPrintData.value = true
  try {
    const params = {}
    if (printPeriodType.value === 'month') {
      params.month = printMonth.value
      params.year = printYear.value
    } else if (printPeriodType.value === 'year') {
      params.year = printYear.value
    } else {
      if (printStartDate.value && printEndDate.value) {
        params.start_date = printStartDate.value
        params.end_date = printEndDate.value
      }
    }
    if (printStatus.value) params.status = printStatus.value
    if (printKategori.value) params.kategori = printKategori.value

    const res = await $fetch('/api/damages', { query: params })
    printableReports.value = res.items || []
    printableStats.value = res.stats || {}
  } catch (err) {
    console.error('Gagal memuat data cetak:', err)
  } finally {
    loadingPrintData.value = false
  }
}

const triggerBrowserPrint = () => {
  showPrintModal.value = false
  setTimeout(() => {
    window.print()
  }, 300)
}

// Helper Badges & Formatter
const getStatusBadge = (status) => {
  switch (status) {
    case 'menunggu':
      return { label: 'Menunggu Tinjauan', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' }
    case 'diproses':
      return { label: 'Sedang Dikerjakan', class: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' }
    case 'tunggu_sparepart':
      return { label: 'Tunggu Sparepart', class: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' }
    case 'selesai':
      return { label: 'Selesai Diperbaiki', class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' }
    case 'ditolak':
      return { label: 'Ditolak', class: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' }
    default:
      return { label: status, class: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' }
  }
}

const getUrgensiBadge = (urgensi) => {
  switch (urgensi) {
    case 'mendesak':
      return { label: '🚨 Mendesak', class: 'bg-rose-600 text-white animate-pulse shadow-sm shadow-rose-600/40' }
    case 'tinggi':
      return { label: 'Tinggi', class: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40' }
    case 'sedang':
      return { label: 'Sedang', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' }
    case 'rendah':
      return { label: 'Rendah', class: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-400/30' }
    default:
      return { label: urgensi, class: 'bg-slate-100 text-slate-700' }
  }
}

const getKategoriIcon = (kategori) => {
  switch (kategori) {
    case 'elektronik': return '⚡ Elektronik / AC'
    case 'mebeler': return '🪑 Meja / Kursi'
    case 'sanitasi': return '🚰 Sanitasi / Air'
    case 'bangunan': return '🧱 Gedung / Pintu'
    case 'it_lab': return '💻 IT & Lab'
    default: return '📦 Lainnya'
  }
}

const formatCurrency = (amount) => {
  if (!amount) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}
</script>

<template>
  <div>
    <!-- SCREEN VIEW (Disembunyikan saat mencetak dokumen) -->
    <div class="print:hidden space-y-6">
      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-entrance">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-2">
            <span>🛠️</span>
            Layanan Aduan Sarpras
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Laporan Kerusakan & Perbaikan
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Pusat pelaporan kerusakan sarana, penanganan teknisi, pelacakan tiket secara transparan, dan pertanggungjawaban pemeliharaan aset sekolah.
          </p>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <button
            v-if="isStaff"
            type="button"
            @click="openPrintModal"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs shadow-md transition-all duration-200 active:scale-95"
          >
            <span>🖨️</span>
            <span>Cetak Rekap Laporan</span>
          </button>

          <button
            type="button"
            @click="openCreateModal"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-terracotta-500 hover:from-orange-500 hover:to-terracotta-600 text-white font-bold text-xs shadow-md shadow-orange-600/25 transition-all duration-200 active:scale-95"
          >
            <span>➕</span>
            <span>Buat Laporan Kerusakan</span>
          </button>
        </div>
      </div>

      <!-- Statistik Ringkasan Tiket -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div class="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tiket</div>
          <div class="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">{{ stats.total_all }}</div>
        </div>

        <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-sm flex flex-col justify-between">
          <div class="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">⏳ Menunggu</div>
          <div class="text-xl font-black text-amber-700 dark:text-amber-400 font-mono mt-1">{{ stats.total_menunggu }}</div>
        </div>

        <div class="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-sm flex flex-col justify-between">
          <div class="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">⚙️ Diproses</div>
          <div class="text-xl font-black text-blue-700 dark:text-blue-400 font-mono mt-1">{{ stats.total_diproses }}</div>
        </div>

        <div class="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-sm flex flex-col justify-between">
          <div class="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">📦 Tunggu Part</div>
          <div class="text-xl font-black text-purple-700 dark:text-purple-400 font-mono mt-1">{{ stats.total_tunggu_sparepart }}</div>
        </div>

        <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm flex flex-col justify-between">
          <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">✅ Selesai</div>
          <div class="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1">{{ stats.total_selesai }}</div>
        </div>

        <div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-sm flex flex-col justify-between">
          <div class="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">🚨 Mendesak</div>
          <div class="text-xl font-black text-rose-700 dark:text-rose-400 font-mono mt-1">{{ stats.total_mendesak }}</div>
        </div>
      </div>

      <!-- Filter & Search Bar -->
      <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div class="w-full md:w-80">
          <input
            type="text"
            v-model="searchQuery"
            @input="onSearchInput"
            placeholder="Cari no. tiket, judul, ruang, pelapor..."
            class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div class="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <!-- Scope Switcher for Teachers/Staff -->
          <div v-if="!user?.role || user?.role !== 'siswa'" class="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              @click="scopeMode = 'all'"
              :class="['px-3 py-1.5 rounded-lg font-semibold transition-colors', scopeMode === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900']"
            >
              Semua Aduan
            </button>
            <button
              type="button"
              @click="scopeMode = 'my'"
              :class="['px-3 py-1.5 rounded-lg font-semibold transition-colors', scopeMode === 'my' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900']"
            >
              Laporan Saya
            </button>
          </div>

          <!-- Filter Status -->
          <select
            v-model="selectedStatus"
            class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Status</option>
            <option value="menunggu">⏳ Menunggu Tinjauan</option>
            <option value="diproses">⚙️ Sedang Dikerjakan</option>
            <option value="tunggu_sparepart">📦 Tunggu Sparepart</option>
            <option value="selesai">✅ Selesai Diperbaiki</option>
            <option value="ditolak">❌ Ditolak</option>
          </select>

          <!-- Filter Urgensi -->
          <select
            v-model="selectedUrgensi"
            class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Urgensi</option>
            <option value="mendesak">🚨 Mendesak</option>
            <option value="tinggi">Tinggi</option>
            <option value="sedang">Sedang</option>
            <option value="rendah">Rendah</option>
          </select>

          <!-- Filter Kategori -->
          <select
            v-model="selectedKategori"
            class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Kategori</option>
            <option value="elektronik">⚡ Elektronik / AC</option>
            <option value="mebeler">🪑 Meja / Kursi</option>
            <option value="sanitasi">🚰 Sanitasi / Air</option>
            <option value="bangunan">🧱 Gedung / Pintu</option>
            <option value="it_lab">💻 IT & Lab</option>
            <option value="lainnya">📦 Lainnya</option>
          </select>

          <!-- View Mode Switcher -->
          <div class="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              @click="viewMode = 'cards'"
              :class="['p-1.5 rounded-lg transition-colors', viewMode === 'cards' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600' : 'text-slate-400']"
              title="Tampilan Kartu"
            >
              🗂️
            </button>
            <button
              type="button"
              @click="viewMode = 'table'"
              :class="['p-1.5 rounded-lg transition-colors', viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600' : 'text-slate-400']"
              title="Tampilan Tabel"
            >
              📑
            </button>
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT: CARD VIEW -->
      <div v-if="viewMode === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="item in reports"
          :key="item.id"
          class="rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <!-- Top Row Badges -->
            <div class="flex items-center justify-between gap-2 mb-3">
              <span :class="['px-2.5 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(item.status).class]">
                {{ getStatusBadge(item.status).label }}
              </span>
              <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold border', getUrgensiBadge(item.tingkat_urgensi).class]">
                {{ getUrgensiBadge(item.tingkat_urgensi).label }}
              </span>
            </div>

            <!-- Ticket Number & Title -->
            <div class="font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400">
              {{ item.nomor_laporan }}
            </div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-2">
              {{ item.judul_kerusakan }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {{ item.deskripsi_kerusakan }}
            </p>

            <!-- Meta Information -->
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px]">
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Kategori:</span>
                <span class="font-semibold text-slate-700 dark:text-slate-300">{{ getKategoriIcon(item.kategori) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Lokasi:</span>
                <span class="font-semibold text-slate-700 dark:text-slate-300">
                  📍 {{ item.room?.nama_ruang || item.lokasi_keterangan || 'Area Sekolah' }}
                </span>
              </div>
              <div v-if="item.item" class="flex items-center justify-between">
                <span class="text-slate-400">Aset Terkait:</span>
                <span class="font-mono text-indigo-600 dark:text-indigo-400 truncate max-w-[180px]">
                  {{ item.item.nama_barang }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">Pelapor:</span>
                <span class="font-medium text-slate-600 dark:text-slate-400">
                  {{ item.pelapor?.name }} ({{ item.pelapor?.role?.toUpperCase() }})
                </span>
              </div>
              <div v-if="item.teknisi" class="flex items-center justify-between">
                <span class="text-slate-400">Teknisi:</span>
                <span class="font-bold text-blue-600 dark:text-blue-400">
                  🛠️ {{ item.teknisi?.name }}
                </span>
              </div>
              <div v-if="item.realisasi_biaya" class="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span class="text-slate-400">Biaya Selesai:</span>
                <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {{ formatCurrency(item.realisasi_biaya) }}
                </span>
              </div>
            </div>
            <!-- Action Controls -->
            <div v-if="item.foto_sebelum || item.foto_sesudah" class="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
              <span v-if="item.foto_sebelum" class="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                📷 Foto Sebelum
              </span>
              <span v-if="item.foto_sesudah" class="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                ✅ Bukti Sesudah
              </span>
            </div>
          </div>

          <!-- Action Controls -->
          <div class="mt-5 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              @click="openDetailModal(item)"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              Detail & Log ({{ item._count?.logs || 0 }})
            </button>

            <div class="flex items-center gap-1.5">
              <NuxtLink
                v-if="isStaff && item.status !== 'selesai' && item.status !== 'ditolak'"
                :to="{ path: '/disposals', query: { fromDamage: String(item.id) } }"
                class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
                title="Ajukan pemusnahan untuk barang rusak ini"
              >
                🔥 Musnahkan
              </NuxtLink>
              <button
                v-if="isStaff"
                type="button"
                @click="openActionModal(item)"
                class="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-sm shadow-orange-600/20 transition-all"
              >
                Tindak Lanjut
              </button>
              <button
                v-if="isStaff || (item.status === 'menunggu' && item.pelapor_id === user?.id)"
                type="button"
                @click="deleteReport(item)"
                class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-xs"
                title="Hapus / Batalkan Laporan"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT: TABLE VIEW -->
      <div v-else class="rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th class="p-3.5">No. Tiket & Kerusakan</th>
                <th class="p-3.5">Lokasi / Ruang</th>
                <th class="p-3.5">Pelapor</th>
                <th class="p-3.5">Urgensi</th>
                <th class="p-3.5">Status</th>
                <th class="p-3.5">Teknisi</th>
                <th class="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/80 dark:divide-slate-800">
              <tr v-for="item in reports" :key="item.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td class="p-3.5">
                  <div class="font-mono font-bold text-orange-600 dark:text-orange-400">{{ item.nomor_laporan }}</div>
                  <div class="font-bold text-slate-900 dark:text-white text-xs mt-0.5">{{ item.judul_kerusakan }}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">{{ getKategoriIcon(item.kategori) }}</div>
                </td>
                <td class="p-3.5">
                  <div class="font-semibold text-slate-800 dark:text-slate-200">
                    {{ item.room?.nama_ruang || item.lokasi_keterangan || '-' }}
                  </div>
                  <div v-if="item.item" class="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                    {{ item.item.nama_barang }}
                  </div>
                </td>
                <td class="p-3.5">
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ item.pelapor?.name }}</div>
                  <div class="text-[10px] text-slate-400">{{ item.pelapor?.role?.toUpperCase() }}</div>
                </td>
                <td class="p-3.5">
                  <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold border', getUrgensiBadge(item.tingkat_urgensi).class]">
                    {{ getUrgensiBadge(item.tingkat_urgensi).label }}
                  </span>
                </td>
                <td class="p-3.5">
                  <span :class="['px-2.5 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(item.status).class]">
                    {{ getStatusBadge(item.status).label }}
                  </span>
                </td>
                <td class="p-3.5 text-slate-600 dark:text-slate-400">
                  {{ item.teknisi?.name || '-' }}
                </td>
                <td class="p-3.5 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      @click="openDetailModal(item)"
                      class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      Detail
                    </button>
                    <button
                      v-if="isStaff"
                      type="button"
                      @click="openActionModal(item)"
                      class="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-600 text-white hover:bg-orange-500"
                    >
                      Tindak Lanjut
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && reports.length === 0" class="p-12 text-center rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <div class="text-4xl mb-2">🛠️</div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">Tidak ada laporan kerusakan</h3>
        <p class="text-xs text-slate-400 mt-1">Belum ada tiket yang cocok dengan kriteria pencarian atau status filter saat ini.</p>
        <div class="mt-4">
          <button
            type="button"
            @click="openCreateModal"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/25 transition-all"
          >
            <span>➕</span>
            <span>Buat Laporan Kerusakan Baru</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 1: FORM BUAT LAPORAN KERUSAKAN       -->
    <!-- ========================================== -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
    >
      <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🛠️</span> Buat Laporan Kerusakan Baru
          </h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form @submit.prevent="submitReport" class="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Judul / Gejala Kerusakan *</label>
            <input
              type="text"
              v-model="createForm.judul_kerusakan"
              required
              placeholder="Contoh: AC Ruang Kelas X 1 Tidak Dingin & Bocor Air"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori Fasilitas *</label>
              <select
                v-model="createForm.kategori"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              >
                <option value="elektronik">⚡ Elektronik / AC</option>
                <option value="mebeler">🪑 Mebeler Meja & Kursi</option>
                <option value="sanitasi">🚰 Sanitasi & Air</option>
                <option value="bangunan">🧱 Bangunan & Pintu</option>
                <option value="it_lab">💻 IT & Laboratorium</option>
                <option value="lainnya">📦 Lainnya</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tingkat Urgensi *</label>
              <select
                v-model="createForm.tingkat_urgensi"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              >
                <option value="rendah">🟢 Rendah (Bisa Ditunda)</option>
                <option value="sedang">🟡 Sedang (Normal)</option>
                <option value="tinggi">🟠 Tinggi (Mengganggu KBM)</option>
                <option value="mendesak">🔴 Mendesak (Bahaya / Darurat)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ruangan / Tempat</label>
              <select
                v-model="createForm.room_id"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="">-- Pilih Ruang Sekolah --</option>
                <option v-for="r in rooms" :key="r.id" :value="String(r.id)">
                  {{ r.nama_ruang }} ({{ r.kode_ruang }})
                </option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Detail Lokasi Spesifik</label>
              <input
                type="text"
                v-model="createForm.lokasi_keterangan"
                placeholder="Contoh: Baris depan dekat jendela"
                class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Terkait Barang Inventaris (Opsional)</label>
            <select
              v-model="createForm.item_id"
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <option value="">-- Bukan Barang Inventaris Tertentu --</option>
              <option v-for="it in inventarisItems" :key="it.id" :value="String(it.id)">
                {{ it.nama_barang }} ({{ it.kode_barang }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Rincian Kerusakan *</label>
            <textarea
              v-model="createForm.deskripsi_kerusakan"
              rows="3"
              required
              placeholder="Ceritakan kondisi detail kerusakan, kronologi kejadian, atau bagian yang rusak..."
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            ></textarea>
          </div>

          <DriveUploadField
            v-model="createForm.foto_sebelum"
            folder="Kerusakan"
            label="Foto Bukti Kerusakan (Opsional)"
            hint="Foto diunggah langsung ke Drive Sekolah (hanya lihat, aman, 0 KB di DB). Guru & Siswa khusus foto JPG/PNG/WebP."
          />

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submittingReport"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-600/25 disabled:opacity-50"
            >
              {{ submittingReport ? 'Mengirim...' : 'Kirim Laporan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 2: DETAIL TIKET & LOG KRONOLOGI      -->
    <!-- ========================================== -->
    <div
      v-if="showDetailModal && activeReport"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
    >
      <div class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div>
            <div class="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
              {{ activeReport.nomor_laporan }}
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {{ activeReport.judul_kerusakan }}
            </h3>
          </div>
          <button @click="showDetailModal = false" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
          <!-- Status Banner -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="text-slate-400">Status Saat Ini:</span>
              <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold border', getStatusBadge(activeReport.status).class]">
                {{ getStatusBadge(activeReport.status).label }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-slate-400">Urgensi:</span>
              <span :class="['px-2 py-0.5 rounded-full text-xs font-bold border', getUrgensiBadge(activeReport.tingkat_urgensi).class]">
                {{ getUrgensiBadge(activeReport.tingkat_urgensi).label }}
              </span>
            </div>
          </div>

          <!-- Rincian Masalah -->
          <div>
            <h4 class="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
              Deskripsi Kerusakan
            </h4>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {{ activeReport.deskripsi_kerusakan }}
            </div>
          </div>

          <!-- Metadata Grid -->
          <div class="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px]">
            <div>
              <span class="text-slate-400 block">Ruangan / Lokasi:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">
                {{ activeReport.room?.nama_ruang || activeReport.lokasi_keterangan || '-' }}
              </span>
            </div>
            <div>
              <span class="text-slate-400 block">Pelapor:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">
                {{ activeReport.pelapor?.name }} ({{ activeReport.pelapor?.role?.toUpperCase() }})
              </span>
            </div>
            <div>
              <span class="text-slate-400 block">Teknisi Ditugaskan:</span>
              <span class="font-bold text-blue-600 dark:text-blue-400">
                {{ activeReport.teknisi?.name || 'Belum ditugaskan' }}
              </span>
            </div>
            <div>
              <span class="text-slate-400 block">Realisasi Biaya:</span>
              <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {{ formatCurrency(activeReport.realisasi_biaya) }}
              </span>
            </div>
          </div>

          <!-- Tindakan Perbaikan -->
          <div v-if="activeReport.tindakan_perbaikan">
            <h4 class="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">
              Tindakan Penanganan Teknisi
            </h4>
            <div class="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 leading-relaxed">
              {{ activeReport.tindakan_perbaikan }}
            </div>
          </div>

          <!-- Dokumentasi Foto Before / After (Google Drive Preview) -->
          <div v-if="activeReport.foto_sebelum || activeReport.foto_sesudah" class="space-y-2">
            <h4 class="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Dokumentasi Foto &amp; Bukti Perbaikan
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DrivePreviewCard
                v-if="activeReport.foto_sebelum"
                :url="activeReport.foto_sebelum"
                title="Kondisi Rusak (Sebelum)"
              />
              <DrivePreviewCard
                v-if="activeReport.foto_sesudah"
                :url="activeReport.foto_sesudah"
                title="Hasil Perbaikan / Nota (Sesudah)"
              />
            </div>
          </div>

          <!-- Riwayat Kronologi Penanganan (Logs) -->
          <div>
            <h4 class="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-2">
              Kronologi & Riwayat Pengerjaan ({{ activeReport.logs?.length || 0 }})
            </h4>
            <div class="space-y-2.5">
              <div
                v-for="(log, idx) in activeReport.logs || []"
                :key="log.id || idx"
                class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3"
              >
                <div class="w-6 h-6 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {{ idx + 1 }}
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span class="font-bold text-slate-700 dark:text-slate-300">{{ log.user?.name }} ({{ log.user?.role?.toUpperCase() }})</span>
                    <span>{{ new Date(log.created_at).toLocaleString('id-ID') }}</span>
                  </div>
                  <div class="text-xs text-slate-800 dark:text-slate-200 font-medium">
                    {{ log.catatan_tindakan }}
                  </div>
                  <div v-if="log.status_baru" class="mt-1">
                    <span :class="['px-2 py-0.2 rounded text-[9px] font-bold border', getStatusBadge(log.status_baru).class]">
                      {{ getStatusBadge(log.status_baru).label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <button
              v-if="isStaff"
              type="button"
              @click="openActionModal(activeReport)"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/20"
            >
              Update Tiket Ini
            </button>
            <NuxtLink
              v-if="isStaff && activeReport.status !== 'selesai' && activeReport.status !== 'ditolak'"
              :to="{ path: '/disposals', query: { fromDamage: String(activeReport.id) } }"
              class="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            >
              🔥 Ajukan Pemusnahan
            </NuxtLink>
          </div>
          <div v-if="!isStaff"></div>

          <button
            type="button"
            @click="showDetailModal = false"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 3: TINDAKAN PETUGAS / UPDATE STATUS  -->
    <!-- ========================================== -->
    <div
      v-if="showActionModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div>
            <div class="font-mono text-xs font-bold text-orange-600">
              {{ targetReport?.nomor_laporan }}
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              Tindak Lanjut & Update Status Perbaikan
            </h3>
          </div>
          <button @click="showActionModal = false" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form @submit.prevent="submitAction" class="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Pengerjaan *</label>
              <select
                v-model="actionForm.status"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              >
                <option value="diproses">⚙️ Sedang Dikerjakan</option>
                <option value="tunggu_sparepart">📦 Tunggu Sparepart</option>
                <option value="selesai">✅ Selesai Diperbaiki</option>
                <option value="ditolak">❌ Ditolak</option>
                <option value="menunggu">⏳ Menunggu Tinjauan</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tugaskan Teknisi</label>
              <select
                v-model="actionForm.ditugaskan_ke"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="">-- Belum Ditugaskan --</option>
                <option v-for="t in technicians" :key="t.id" :value="String(t.id)">
                  {{ t.name }} ({{ t.role?.toUpperCase() }})
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Estimasi Biaya (Rp)</label>
              <input
                type="number"
                min="0"
                v-model="actionForm.estimasi_biaya"
                placeholder="0"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Realisasi Biaya (Rp)</label>
              <input
                type="number"
                min="0"
                v-model="actionForm.realisasi_biaya"
                placeholder="0"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-emerald-600"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tindakan Perbaikan Teknis</label>
            <textarea
              v-model="actionForm.tindakan_perbaikan"
              rows="2"
              placeholder="Contoh: Penggantian kapasitor 25uF, pembersihan evaporator, dan tes dingin..."
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            ></textarea>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Log Riwayat</label>
            <input
              type="text"
              v-model="actionForm.catatan_log"
              placeholder="Pesan singkat untuk dicatat pada linimasa kronologi..."
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <DriveUploadField
            v-model="actionForm.foto_sesudah"
            folder="Perbaikan"
            :allow-pdf="true"
            label="Foto / Bukti Selesai Perbaikan atau Nota (Opsional)"
            hint="Staf/Petugas dapat mengunggah foto kondisi sesudah diperbaiki maupun PDF kuitansi perbaikan."
          />

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              @click="showActionModal = false"
              class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submittingAction"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-600/25 disabled:opacity-50"
            >
              {{ submittingAction ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 4: CETAK / REKAP LAPORAN KERUSAKAN   -->
    <!-- ========================================== -->
    <div
      v-if="showPrintModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
    >
      <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-sm">
              🖨️
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                Cetak Rekap Laporan Kerusakan Sarpras
              </h3>
              <p class="text-[11px] text-slate-400">
                Pilih periode bulanan atau tahunan untuk mencetak dokumen fisik resmi ber-KOP sekolah.
              </p>
            </div>
          </div>
          <button @click="showPrintModal = false" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
          <!-- Pilihan Tipe Periode -->
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Model Periode Rekapitulasi</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="printPeriodType = 'month'; loadPrintData()"
                :class="[
                  'px-3 py-2.5 rounded-xl font-bold border transition-all text-center',
                  printPeriodType === 'month'
                    ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                ]"
              >
                📅 Per Bulan
              </button>
              <button
                type="button"
                @click="printPeriodType = 'year'; loadPrintData()"
                :class="[
                  'px-3 py-2.5 rounded-xl font-bold border transition-all text-center',
                  printPeriodType === 'year'
                    ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                ]"
              >
                📆 Per Tahun Penuh
              </button>
              <button
                type="button"
                @click="printPeriodType = 'custom'; loadPrintData()"
                :class="[
                  'px-3 py-2.5 rounded-xl font-bold border transition-all text-center',
                  printPeriodType === 'custom'
                    ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                ]"
              >
                🗓️ Rentang Tanggal
              </button>
            </div>
          </div>

          <!-- Form Input Sesuai Periode -->
          <div v-if="printPeriodType === 'month'" class="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/60">
            <div>
              <label class="block font-bold text-orange-950 dark:text-orange-200 mb-1">Pilih Bulan</label>
              <select
                v-model="printMonth"
                @change="loadPrintData"
                class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800 font-bold"
              >
                <option v-for="m in monthsList" :key="m.value" :value="m.value">
                  {{ m.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-orange-950 dark:text-orange-200 mb-1">Pilih Tahun</label>
              <select
                v-model="printYear"
                @change="loadPrintData"
                class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800 font-bold"
              >
                <option v-for="y in yearsList" :key="y" :value="y">
                  Tahun {{ y }}
                </option>
              </select>
            </div>
          </div>

          <div v-else-if="printPeriodType === 'year'" class="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/60">
            <label class="block font-bold text-orange-950 dark:text-orange-200 mb-1">Pilih Tahun Rekapitulasi</label>
            <select
              v-model="printYear"
              @change="loadPrintData"
              class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800 font-bold"
            >
              <option v-for="y in yearsList" :key="y" :value="y">
                Tahun {{ y }} (1 Januari s/d 31 Desember)
              </option>
            </select>
          </div>

          <div v-else class="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/60">
            <div>
              <label class="block font-bold text-orange-950 dark:text-orange-200 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                v-model="printStartDate"
                @change="loadPrintData"
                class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800"
              />
            </div>
            <div>
              <label class="block font-bold text-orange-950 dark:text-orange-200 mb-1">Tanggal Sampai</label>
              <input
                type="date"
                v-model="printEndDate"
                @change="loadPrintData"
                class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800"
              />
            </div>
          </div>

          <!-- Filter Tambahan -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Filter Status Tiket</label>
              <select
                v-model="printStatus"
                @change="loadPrintData"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="">Semua Status</option>
                <option value="selesai">✅ Selesai Diperbaiki</option>
                <option value="diproses">⚙️ Sedang Dikerjakan</option>
                <option value="tunggu_sparepart">📦 Tunggu Sparepart</option>
                <option value="menunggu">⏳ Menunggu Tinjauan</option>
                <option value="ditolak">❌ Ditolak</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Filter Kategori</label>
              <select
                v-model="printKategori"
                @change="loadPrintData"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="">Semua Kategori</option>
                <option value="elektronik">⚡ Elektronik / AC</option>
                <option value="mebeler">🪑 Meja & Kursi</option>
                <option value="sanitasi">🚰 Sanitasi & Air</option>
                <option value="bangunan">🧱 Gedung & Pintu</option>
                <option value="it_lab">💻 IT & Lab</option>
                <option value="lainnya">📦 Lainnya</option>
              </select>
            </div>
          </div>

          <!-- Pratinjau Rekapitulasi Metrik -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-700 dark:text-slate-300">Target Dokumen Cetak:</span>
              <span class="font-bold text-orange-600 dark:text-orange-400">{{ printSubtitle }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-center">
              <div>
                <div class="text-[10px] text-slate-400 uppercase">Jumlah Laporan</div>
                <div class="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                  {{ printableReports.length }} Tiket
                </div>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 uppercase">Selesai</div>
                <div class="text-base font-black text-emerald-600 font-mono mt-0.5">
                  {{ printableStats.total_selesai || 0 }}
                </div>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 uppercase">Total Biaya</div>
                <div class="text-base font-black text-emerald-600 font-mono mt-0.5">
                  {{ formatCurrency(printableStats.total_realisasi_biaya) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 mt-2">
          <button
            type="button"
            @click="showPrintModal = false"
            class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="button"
            @click="triggerBrowserPrint"
            :disabled="loadingPrintData || printableReports.length === 0"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 disabled:opacity-50 transition-all active:scale-95"
          >
            <span>🖨️</span>
            <span>{{ loadingPrintData ? 'Menyiapkan...' : `Cetak Dokumen Resmi (${printableReports.length} Laporan)` }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- OFFICIAL PRINTABLE DOCUMENT VIEW           -->
    <!-- (Hanya muncul saat window.print / Cetak)   -->
    <!-- ========================================== -->
    <div class="hidden print:block print-document-container print-document-body bg-white text-black p-8 print:p-0 font-serif leading-relaxed">
      <!-- KOP SURAT RESMI SMA NUSAPUTERA -->
      <div class="flex items-center justify-between pb-4 border-b-4 border-double border-black mb-6">
        <div class="w-24 h-24 flex-shrink-0">
          <img src="/images/logo.png" alt="Logo SMA Nusaputera" class="w-full h-full object-contain" />
        </div>
        <div class="text-center flex-1 px-4">
          <div class="text-sm font-semibold tracking-widest uppercase">YAYASAN PENDIDIKAN NUSAPUTERA</div>
          <h1 class="text-2xl font-black tracking-wider uppercase mt-0.5">SMA NUSAPUTERA SEMARANG</h1>
          <p class="text-[11px] font-sans text-gray-700 mt-1 leading-tight">
            Jl. Ki Mangunsarkoro No.59 Semarang Tengah, Telp (024) 3542444<br />
            Email: sma_nusaputera@yahoo.id / info@smanusaputera.sch.id
          </p>
        </div>
        <div class="w-24 h-24 flex-shrink-0 flex items-center justify-center border border-gray-400 text-[9px] text-gray-500 uppercase text-center p-1 font-sans">
          SISARPRA<br />Dokumen Resmi
        </div>
      </div>

      <!-- Document Title & Subtitle -->
      <div class="text-center mb-6">
        <h2 class="text-base font-bold uppercase underline tracking-wide">
          LAPORAN REKAPITULASI KERUSAKAN & PEMELIHARAAN SARANA PRASARANA
        </h2>
        <p class="text-xs text-gray-700 font-sans mt-1 font-semibold">
          {{ printSubtitle }}
        </p>
      </div>

      <!-- Ringkasan Eksekutif Finansial & Operasional -->
      <div class="grid grid-cols-4 gap-2 mb-6 font-sans text-xs">
        <div class="p-2 border border-black bg-gray-50 text-center">
          <div class="text-[9px] uppercase font-bold text-gray-600">Total Tiket Masuk</div>
          <div class="text-base font-black mt-0.5">{{ printableReports.length }}</div>
        </div>
        <div class="p-2 border border-black bg-gray-50 text-center">
          <div class="text-[9px] uppercase font-bold text-gray-600">Selesai Diperbaiki</div>
          <div class="text-base font-black mt-0.5">{{ printableStats.total_selesai || 0 }}</div>
        </div>
        <div class="p-2 border border-black bg-gray-50 text-center">
          <div class="text-[9px] uppercase font-bold text-gray-600">Dalam Pengerjaan</div>
          <div class="text-base font-black mt-0.5">{{ (printableStats.total_diproses || 0) + (printableStats.total_tunggu_sparepart || 0) }}</div>
        </div>
        <div class="p-2 border border-black bg-gray-50 text-center">
          <div class="text-[9px] uppercase font-bold text-gray-600">Total Biaya Perbaikan</div>
          <div class="text-sm font-black mt-0.5">{{ formatCurrency(printableStats.total_realisasi_biaya) }}</div>
        </div>
      </div>

      <!-- Printable Table Data -->
      <table class="w-full text-[11px] font-sans border-collapse border border-black mb-8">
        <thead>
          <tr class="bg-gray-100 text-black font-bold uppercase text-[9px]">
            <th class="border border-black p-1.5 text-center w-7">No</th>
            <th class="border border-black p-1.5 text-left w-28">No. Tiket & Tgl</th>
            <th class="border border-black p-1.5 text-left">Judul Kerusakan & Ruang</th>
            <th class="border border-black p-1.5 text-left w-24">Kategori & Urgensi</th>
            <th class="border border-black p-1.5 text-left w-24">Pelapor</th>
            <th class="border border-black p-1.5 text-left">Tindakan & Teknisi</th>
            <th class="border border-black p-1.5 text-right w-24">Biaya Riil</th>
            <th class="border border-black p-1.5 text-center w-20">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="(printableReports.length > 0 ? printableReports : reports).length === 0">
            <td colspan="8" class="border border-black p-6 text-center text-gray-500 italic">
              Tidak ada data laporan kerusakan pada periode yang dipilih.
            </td>
          </tr>
          <tr v-for="(row, idx) in (printableReports.length > 0 ? printableReports : reports)" :key="row.id">
            <td class="border border-black p-1.5 text-center">{{ idx + 1 }}</td>
            <td class="border border-black p-1.5 font-mono text-[10px]">
              <span class="font-bold">{{ row.nomor_laporan }}</span><br />
              <span class="text-gray-600">{{ formatDate(row.tanggal_lapor) }}</span>
            </td>
            <td class="border border-black p-1.5">
              <div class="font-bold text-black">{{ row.judul_kerusakan }}</div>
              <div class="text-[10px] text-gray-700 mt-0.5">
                📍 {{ row.room?.nama_ruang || row.lokasi_keterangan || 'Area Sekolah' }}
                <span v-if="row.item" class="italic">({{ row.item.nama_barang }})</span>
              </div>
            </td>
            <td class="border border-black p-1.5 text-[10px]">
              <div class="capitalize">{{ row.kategori }}</div>
              <div class="font-bold uppercase text-[9px] text-gray-700">Urgensi: {{ row.tingkat_urgensi }}</div>
            </td>
            <td class="border border-black p-1.5 text-[10px]">
              <div class="font-semibold">{{ row.pelapor?.name }}</div>
              <div class="text-[9px] text-gray-600 uppercase">{{ row.pelapor?.role }}</div>
            </td>
            <td class="border border-black p-1.5 text-[10px]">
              <div v-if="row.tindakan_perbaikan" class="text-gray-800">
                {{ row.tindakan_perbaikan }}
              </div>
              <div v-else class="text-gray-400 italic">-</div>
              <div v-if="row.teknisi" class="text-[9px] text-gray-600 font-semibold mt-0.5">
                Teknisi: {{ row.teknisi.name }}
              </div>
            </td>
            <td class="border border-black p-1.5 text-right font-mono font-bold text-[10px]">
              {{ row.realisasi_biaya ? formatCurrency(row.realisasi_biaya) : '-' }}
            </td>
            <td class="border border-black p-1.5 text-center font-bold uppercase text-[9px]">
              {{ row.status.replace('_', ' ') }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div class="grid grid-cols-2 text-xs font-sans mt-10 pt-4 break-inside-avoid">
        <div class="text-left">
          <p>Mengetahui,</p>
          <p class="font-bold">Kepala SMA Nusaputera</p>
          <div class="h-20"></div>
          <p class="font-bold underline">( ............................................ )</p>
          <p class="text-gray-600 text-[11px]">NIP / NIK. -</p>
        </div>
        <div class="text-right">
          <p>Semarang, {{ formatDate(new Date()) }}</p>
          <p class="font-bold">Petugas / Koordinator Sarpras</p>
          <div class="h-20"></div>
          <p class="font-bold underline">( {{ user?.name || 'Petugas Sarpras' }} )</p>
          <p class="text-gray-600 text-[11px]">NIP / NIK. -</p>
        </div>
      </div>
    </div>
  </div>
</template>
