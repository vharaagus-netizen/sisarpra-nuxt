<script setup>
const { user, isStaff } = useAuth()
const isTeacherOrStaff = computed(() =>
  ['admin', 'petugas', 'guru'].includes(user.value?.role) ||
  Boolean(pageData.value?.currentUser?.isStaffOrTeacher) ||
  isStaff.value
)

// Active Tab Filters
const activeLabTab = ref('semua') // 'semua' | 'komputer' | 'fisika' | 'kimia' | 'biologi'
const searchQuery = ref('')
const selectedItemType = ref('')
const selectedKondisi = ref('')
const selectedAlert = ref('')
const viewMode = ref('cards') // 'cards' | 'table'

// Fetch Data
const { data: pageData, refresh: fetchData, pending: loading } = await useFetch('/api/lab', {
  query: computed(() => ({
    lab_type: activeLabTab.value === 'semua' ? undefined : activeLabTab.value,
    item_type: selectedItemType.value || undefined,
    kondisi: selectedKondisi.value || undefined,
    alert_status: selectedAlert.value || undefined,
    search: searchQuery.value || undefined
  }))
})

const items = computed(() => pageData.value?.items || [])
const rooms = computed(() => pageData.value?.rooms || [])
const stats = computed(() => pageData.value?.stats || {
  total_all: 0,
  total_komputer: 0,
  total_fisika: 0,
  total_kimia: 0,
  total_biologi: 0,
  total_consumable: 0,
  total_tools: 0,
  total_kits: 0,
  alert_low_stock: 0,
  alert_expired: 0,
  alert_calibration: 0,
})

let searchTimeout = null
const onSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchData()
  }, 300)
}

// ==========================================
// MODAL DETAIL & RIWAYAT ITEM
// ==========================================
const showDetailModal = ref(false)
const selectedDetailItem = ref(null)
const loadingDetail = ref(false)
const detailActiveTab = ref('spec') // 'spec' | 'usage' | 'maintenance'

const openDetailModal = async (item) => {
  showDetailModal.value = true
  detailActiveTab.value = 'spec'
  loadingDetail.value = true
  try {
    const res = await $fetch(`/api/lab/${item.id}`)
    selectedDetailItem.value = res.item
  } catch (err) {
    selectedDetailItem.value = item
  } finally {
    loadingDetail.value = false
  }
}

// ==========================================
// MODAL CATAT PEMAKAIAN PRAKTIKUM
// ==========================================
const showUsageModal = ref(false)
const submittingUsage = ref(false)
const usageForm = reactive({
  lab_item_id: '',
  tanggal_praktikum: new Date().toISOString().split('T')[0],
  nama_guru: '',
  kelas_jurusan: 'XI MIPA 1',
  judul_praktikum: '',
  jumlah_digunakan: 1,
  kondisi_alat_kembali: 'baik',
  catatan: ''
})

const selectedItemForUsage = computed(() => {
  return items.value.find((i) => String(i.id) === String(usageForm.lab_item_id))
})

const openUsageModal = (item = null) => {
  usageForm.lab_item_id = item ? String(item.id) : (items.value[0]?.id ? String(items.value[0].id) : '')
  usageForm.tanggal_praktikum = new Date().toISOString().split('T')[0]
  usageForm.nama_guru = user.value?.name || ''
  usageForm.kelas_jurusan = 'XI MIPA 1'
  usageForm.judul_praktikum = ''
  usageForm.jumlah_digunakan = 1
  usageForm.kondisi_alat_kembali = 'baik'
  usageForm.catatan = ''
  showUsageModal.value = true
}

const submitUsage = async () => {
  if (!usageForm.lab_item_id || !usageForm.kelas_jurusan || !usageForm.judul_praktikum) {
    alert('Mohon lengkapi barang, kelas rombongan, dan judul praktikum.')
    return
  }

  submittingUsage.value = true
  try {
    const res = await $fetch('/api/lab/usage', {
      method: 'POST',
      body: { ...usageForm }
    })
    alert(res.message || 'Pemakaian praktikum berhasil dicatat.')
    showUsageModal.value = false
    await fetchData()
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal mencatat pemakaian praktikum.')
  } finally {
    submittingUsage.value = false
  }
}

// ==========================================
// MODAL CATAT PEMELIHARAAN / SERVIS
// ==========================================
const showMaintenanceModal = ref(false)
const submittingMaintenance = ref(false)
const maintenanceForm = reactive({
  lab_item_id: '',
  tanggal_tindakan: new Date().toISOString().split('T')[0],
  jenis_tindakan: 'install_ulang',
  deskripsi: '',
  status_akhir: 'selesai',
  biaya: 0,
  jadwal_kalibrasi_berikutnya: ''
})

const openMaintenanceModal = (item = null) => {
  maintenanceForm.lab_item_id = item ? String(item.id) : (items.value[0]?.id ? String(items.value[0].id) : '')
  maintenanceForm.tanggal_tindakan = new Date().toISOString().split('T')[0]
  maintenanceForm.jenis_tindakan = item?.lab_type === 'komputer' ? 'install_ulang' : (item?.lab_type === 'fisika' ? 'kalibrasi' : 'pembersihan_lensa')
  maintenanceForm.deskripsi = ''
  maintenanceForm.status_akhir = 'selesai'
  maintenanceForm.biaya = 0
  maintenanceForm.jadwal_kalibrasi_berikutnya = ''
  showMaintenanceModal.value = true
}

const submitMaintenance = async () => {
  if (!maintenanceForm.lab_item_id || !maintenanceForm.deskripsi) {
    alert('Mohon lengkapi barang dan deskripsi tindakan pemeliharaan.')
    return
  }

  submittingMaintenance.value = true
  try {
    const res = await $fetch('/api/lab/maintenance', {
      method: 'POST',
      body: { ...maintenanceForm }
    })
    alert(res.message || 'Data pemeliharaan berhasil disimpan.')
    showMaintenanceModal.value = false
    await fetchData()
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal mencatat pemeliharaan.')
  } finally {
    submittingMaintenance.value = false
  }
}

// ==========================================
// MODAL TAMBAH / EDIT BARANG LAB
// ==========================================
const showItemModal = ref(false)
const itemModalTitle = ref('Tambah Barang Laboratorium')
const savingItem = ref(false)
const itemForm = reactive({
  id: null,
  room_id: '',
  lab_type: 'komputer',
  item_type: 'alat',
  kode_item: '',
  nama_item: '',
  kategori: '',
  merk: '',
  stok_total: 1,
  stok_tersedia: 1,
  stok_minimum: 1,
  satuan: 'unit',
  kondisi: 'baik',
  lokasi_penyimpanan: '',
  tanggal_kadaluarsa: '',
  jadwal_kalibrasi: '',
  spesifikasi_khusus: '',
  keterangan: ''
})

const generateKodeItem = () => {
  const lab = itemForm.lab_type || 'kom'
  itemForm.kode_item = `LAB-${lab.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`
}

watch(() => itemForm.stok_total, (newVal) => {
  if (!itemForm.id) {
    itemForm.stok_tersedia = newVal
  }
})

watch(() => itemForm.lab_type, (newLab) => {
  if (!itemForm.id && newLab) {
    if (newLab === 'kimia') {
      itemForm.item_type = 'bahan_habis_pakai'
      itemForm.satuan = 'ml'
      itemForm.stok_total = 1000
      itemForm.stok_tersedia = 1000
      itemForm.stok_minimum = 200
    } else if (newLab === 'komputer') {
      itemForm.item_type = 'alat'
      itemForm.satuan = 'unit'
      itemForm.stok_total = 1
      itemForm.stok_tersedia = 1
      itemForm.stok_minimum = 1
    } else if (newLab === 'fisika') {
      itemForm.item_type = 'alat'
      itemForm.satuan = 'set'
      itemForm.stok_total = 1
      itemForm.stok_tersedia = 1
      itemForm.stok_minimum = 1
    } else if (newLab === 'biologi') {
      itemForm.item_type = 'alat'
      itemForm.satuan = 'unit'
      itemForm.stok_total = 1
      itemForm.stok_tersedia = 1
      itemForm.stok_minimum = 1
    }
    generateKodeItem()
  }
})

const openAddItemModal = () => {
  itemModalTitle.value = 'Tambah Barang / Bahan Lab Baru'
  itemForm.id = null
  const defaultLab = activeLabTab.value === 'semua' ? 'komputer' : activeLabTab.value
  itemForm.room_id = ''
  itemForm.lab_type = defaultLab
  itemForm.item_type = defaultLab === 'kimia' ? 'bahan_habis_pakai' : 'alat'
  itemForm.kode_item = `LAB-${defaultLab.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`
  itemForm.nama_item = ''
  itemForm.kategori = ''
  itemForm.merk = ''
  itemForm.stok_total = defaultLab === 'kimia' ? 1000 : 1
  itemForm.stok_tersedia = defaultLab === 'kimia' ? 1000 : 1
  itemForm.stok_minimum = defaultLab === 'kimia' ? 200 : 1
  itemForm.satuan = defaultLab === 'kimia' ? 'ml' : (defaultLab === 'fisika' ? 'set' : 'unit')
  itemForm.kondisi = 'baik'
  itemForm.lokasi_penyimpanan = ''
  itemForm.tanggal_kadaluarsa = ''
  itemForm.jadwal_kalibrasi = ''
  itemForm.spesifikasi_khusus = ''
  itemForm.keterangan = ''
  showItemModal.value = true
}

const openEditItemModal = (item) => {
  itemModalTitle.value = `Edit: ${item.nama_item}`
  itemForm.id = item.id
  itemForm.room_id = item.room_id ? String(item.room_id) : ''
  itemForm.lab_type = item.lab_type
  itemForm.item_type = item.item_type
  itemForm.kode_item = item.kode_item
  itemForm.nama_item = item.nama_item
  itemForm.kategori = item.kategori || ''
  itemForm.merk = item.merk || ''
  itemForm.stok_total = item.stok_total
  itemForm.stok_tersedia = item.stok_tersedia
  itemForm.stok_minimum = item.stok_minimum
  itemForm.satuan = item.satuan || 'unit'
  itemForm.kondisi = item.kondisi || 'baik'
  itemForm.lokasi_penyimpanan = item.lokasi_penyimpanan || ''
  itemForm.tanggal_kadaluarsa = item.tanggal_kadaluarsa ? item.tanggal_kadaluarsa.split('T')[0] : ''
  itemForm.jadwal_kalibrasi = item.jadwal_kalibrasi ? item.jadwal_kalibrasi.split('T')[0] : ''
  itemForm.spesifikasi_khusus = item.spesifikasi_khusus || ''
  itemForm.keterangan = item.keterangan || ''
  showItemModal.value = true
}

const saveItem = async () => {
  if (!itemForm.nama_item || !itemForm.kode_item || !itemForm.lab_type) {
    alert('Nama barang, kode item, dan jenis lab wajib diisi.')
    return
  }

  savingItem.value = true
  try {
    const res = await $fetch('/api/lab/save', {
      method: 'POST',
      body: {
        ...itemForm,
        room_id: itemForm.room_id ? Number(itemForm.room_id) : null,
      }
    })
    showItemModal.value = false
    await fetchData()
    alert(res?.message || 'Data inventaris lab berhasil disimpan.')
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal menyimpan barang lab.')
  } finally {
    savingItem.value = false
  }
}

const deleteItem = async (item) => {
  if (!confirm(`Hapus permanen '${item.nama_item}' (${item.kode_item}) dari inventaris lab?`)) {
    return
  }

  try {
    await $fetch('/api/lab/delete', {
      method: 'POST',
      body: { id: item.id }
    })
    await fetchData()
    alert('Barang laboratorium berhasil dihapus.')
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal menghapus barang lab.')
  }
}

// ==========================================
// MODAL IMPORT EXCEL LAB
// ==========================================
const showImportModal = ref(false)
const importStep = ref('upload')
const parsingFile = ref(false)
const parsedData = ref(null)
const importing = ref(false)
const importResult = ref(null)
const updateExisting = ref(true)
const fileInputRef = ref(null)
const isDragging = ref(false)

const openImportModal = () => {
  importStep.value = 'upload'
  parsedData.value = null
  importResult.value = null
  showImportModal.value = true
}

const closeImportModal = () => {
  showImportModal.value = false
  parsedData.value = null
  importResult.value = null
  importStep.value = 'upload'
}

const downloadTemplate = (labKey = 'semua') => {
  window.open(`/api/lab/template?lab=${labKey}`, '_blank')
}

const onFileChange = async (e) => {
  const file = e.target.files?.[0]
  if (file) await processFile(file)
}

const onDropFile = async (e) => {
  isDragging.value = false
  const file = e.dataTransfer.files?.[0]
  if (file) await processFile(file)
}

const processFile = async (file) => {
  try {
    parsingFile.value = true
    const formData = new FormData()
    formData.append('file', file)

    const res = await $fetch('/api/lab/parse', {
      method: 'POST',
      body: formData
    })

    parsedData.value = res
    importStep.value = 'preview'
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal membaca atau memproses file Excel lab.')
  } finally {
    parsingFile.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const submitImport = async () => {
  if (!parsedData.value || !parsedData.value.rows || parsedData.value.validCount === 0) {
    alert('Tidak ada data valid untuk diimport.')
    return
  }

  try {
    importing.value = true
    const validRows = parsedData.value.rows.filter(r => r.isValid)
    const res = await $fetch('/api/lab/import', {
      method: 'POST',
      body: {
        rows: validRows,
        updateExisting: updateExisting.value
      }
    })

    importResult.value = res
    importStep.value = 'success'
    await fetchData()
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal mengimport data inventaris lab.')
  } finally {
    importing.value = false
  }
}

// ==========================================
// MODAL CETAK LABEL QR CODE & BARCODE
// ==========================================
const showQRModal = ref(false)
const selectedQRItem = ref(null)

const openQRModal = (item) => {
  selectedQRItem.value = item
  showQRModal.value = true
}

const printLabel = () => {
  window.print()
}

// Helpers Badge UI
const getLabBadge = (lab) => {
  switch (lab) {
    case 'komputer':
      return { label: 'Lab Komputer', icon: '💻', class: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900' }
    case 'kimia':
      return { label: 'Lab Kimia', icon: '⚗️', class: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900' }
    case 'fisika':
      return { label: 'Lab Fisika', icon: '⚡', class: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900' }
    case 'biologi':
      return { label: 'Lab Biologi', icon: '🔬', class: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900' }
    default:
      return { label: lab, icon: '🏛️', class: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' }
  }
}

const getItemTypeBadge = (type) => {
  switch (type) {
    case 'bahan_habis_pakai':
      return { label: 'Bahan Habis Pakai (Reagen)', class: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900' }
    case 'kit':
      return { label: 'Kit Praktikum', class: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900' }
    default:
      return { label: 'Alat & Instrumen', class: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' }
  }
}

const getKondisiBadge = (kondisi) => {
  switch (kondisi) {
    case 'baik':
      return { label: 'Baik / Siap Pakai', class: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' }
    case 'rusak_ringan':
      return { label: 'Perlu Perbaikan / Kurang', class: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' }
    case 'rusak_berat':
      return { label: 'Rusak Berat / Mati', class: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' }
    case 'habis':
      return { label: 'Stok Habis', class: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' }
    default:
      return { label: kondisi, class: 'bg-slate-100 text-slate-700 border-slate-200' }
  }
}

const parseSpecJson = (specStr) => {
  if (!specStr) return null
  try {
    return JSON.parse(specStr)
  } catch {
    return null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Non-print Web View Area -->
    <div class="print:hidden space-y-6">
      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-entrance">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 mb-2">
            <span>🔬</span>
            Sistem Inventaris Khusus Laboratorium
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Inventaris Laboratorium Terpadu
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Manajemen spesifikasi PC Lab Komputer, instrumen Lab Fisika, reagen kimia habis pakai ($B_3$), dan preparat/mikroskop Lab Biologi SMA Nusaputera Semarang.
          </p>
        </div>

        <!-- Action Buttons for Teacher & Staff -->
        <div v-if="isTeacherOrStaff" class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            @click="openUsageModal()"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/25 transition-all duration-200 active:scale-95 btn-shimmer"
            title="Catat bahan atau alat yang digunakan untuk sesi praktikum"
          >
            <span>📝</span>
            <span>Catat Pemakaian Praktikum</span>
          </button>

          <button
            type="button"
            @click="openImportModal"
            class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25 transition-all duration-200 active:scale-95"
          >
            <span>📊</span>
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            @click="openAddItemModal"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs shadow-md transition-all duration-200 active:scale-95"
          >
            <span>➕</span>
            <span>Tambah Barang</span>
          </button>
        </div>

        <!-- Siswa Info Banner -->
        <div v-else class="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-2">
          <span>🎓</span>
          <span>Mode Siswa: Katalog referensi alat & bahan praktikum (Read-Only).</span>
        </div>
      </div>

      <!-- 4 Lab Switcher Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200/80 dark:border-slate-800 animate-entrance-delay-1">
        <button
          type="button"
          @click="activeLabTab = 'semua'"
          :class="[
            'px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2',
            activeLabTab === 'semua'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
          ]"
        >
          <span>🌐</span>
          <span>Semua Lab</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 dark:bg-black/20 font-mono">{{ stats.total_all }}</span>
        </button>

        <button
          type="button"
          @click="activeLabTab = 'komputer'"
          :class="[
            'px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2',
            activeLabTab === 'komputer'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
          ]"
        >
          <span>💻</span>
          <span>Lab Komputer</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 dark:bg-black/20 font-mono">{{ stats.total_komputer }}</span>
        </button>

        <button
          type="button"
          @click="activeLabTab = 'kimia'"
          :class="[
            'px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2',
            activeLabTab === 'kimia'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
          ]"
        >
          <span>⚗️</span>
          <span>Lab Kimia</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 dark:bg-black/20 font-mono">{{ stats.total_kimia }}</span>
        </button>

        <button
          type="button"
          @click="activeLabTab = 'fisika'"
          :class="[
            'px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2',
            activeLabTab === 'fisika'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
          ]"
        >
          <span>⚡</span>
          <span>Lab Fisika</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 dark:bg-black/20 font-mono">{{ stats.total_fisika }}</span>
        </button>

        <button
          type="button"
          @click="activeLabTab = 'biologi'"
          :class="[
            'px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2',
            activeLabTab === 'biologi'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
          ]"
        >
          <span>🔬</span>
          <span>Lab Biologi</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 dark:bg-black/20 font-mono">{{ stats.total_biologi }}</span>
        </button>
      </div>

      <!-- Overview Cards (Radar Pulse Status) -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3.5 animate-entrance-delay-2">
        <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Alat & Kit</div>
          <div class="mt-1 text-2xl font-black text-slate-900 dark:text-white font-mono">
            {{ stats.total_tools + stats.total_kits }}
          </div>
          <div class="text-[11px] text-slate-500 mt-0.5">Instrumen, PC, & Set Kit</div>
        </div>

        <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bahan Habis Pakai</div>
          <div class="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {{ stats.total_consumable }}
          </div>
          <div class="text-[11px] text-slate-500 mt-0.5">Reagen Kimia & Biologi</div>
        </div>

        <div
          @click="selectedAlert = selectedAlert === 'low_stock' ? '' : 'low_stock'"
          :class="[
            'p-4 rounded-2xl border transition-all cursor-pointer',
            selectedAlert === 'low_stock'
              ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-300'
              : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-rose-400'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Stok Kritis</span>
            <span v-if="stats.alert_low_stock > 0" class="status-dot-radar status-dot-radar-red w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
          <div class="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {{ stats.alert_low_stock }}
          </div>
          <div class="text-[11px] text-slate-500 mt-0.5">&le; Batas Minimum Reorder</div>
        </div>

        <div
          @click="selectedAlert = selectedAlert === 'expired' ? '' : 'expired'"
          :class="[
            'p-4 rounded-2xl border transition-all cursor-pointer',
            selectedAlert === 'expired'
              ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-300'
              : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-amber-400'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Reagen Expired</span>
            <span v-if="stats.alert_expired > 0" class="status-dot-radar status-dot-radar-amber w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <div class="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {{ stats.alert_expired }}
          </div>
          <div class="text-[11px] text-slate-500 mt-0.5">Jatuh Tempo &le; 30 Hari</div>
        </div>

        <div
          @click="selectedAlert = selectedAlert === 'calibration' ? '' : 'calibration'"
          :class="[
            'p-4 rounded-2xl border transition-all cursor-pointer col-span-2 lg:col-span-1',
            selectedAlert === 'calibration'
              ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300'
              : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Jadwal Kalibrasi</span>
            <span v-if="stats.alert_calibration > 0" class="status-dot-radar status-dot-radar-blue w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <div class="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {{ stats.alert_calibration }}
          </div>
          <div class="text-[11px] text-slate-500 mt-0.5">Alat Ukur / Servis PC</div>
        </div>
      </div>

      <!-- Filter Bar & Search -->
      <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between animate-entrance-delay-3">
        <div class="w-full md:w-80">
          <input
            type="text"
            v-model="searchQuery"
            @input="onSearchInput"
            placeholder="Cari nama, rumus kimia, kode, merk..."
            class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            v-model="selectedItemType"
            class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Tipe Barang</option>
            <option value="alat">Alat & Instrumen</option>
            <option value="bahan_habis_pakai">Bahan Habis Pakai</option>
            <option value="kit">Kit Praktikum</option>
          </select>

          <select
            v-model="selectedKondisi"
            class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Kondisi</option>
            <option value="baik">Kondisi Baik</option>
            <option value="rusak_ringan">Perlu Servis / Kurang</option>
            <option value="rusak_berat">Rusak Berat</option>
            <option value="habis">Stok Habis</option>
          </select>

          <!-- Toggle View Mode -->
          <div class="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              @click="viewMode = 'cards'"
              :class="['px-2.5 py-1 rounded-lg text-xs font-bold transition-colors', viewMode === 'cards' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600' : 'text-slate-500']"
              title="Tampilan Kartu Grid"
            >
              ⊞ Grid
            </button>
            <button
              type="button"
              @click="viewMode = 'table'"
              :class="['px-2.5 py-1 rounded-lg text-xs font-bold transition-colors', viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600' : 'text-slate-500']"
              title="Tampilan Tabel Rinci"
            >
              ☰ Tabel
            </button>
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT: CARDS VIEW -->
      <div v-if="viewMode === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="item in items"
          :key="item.id"
          class="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 glass-card-interactive flex flex-col justify-between"
        >
          <div>
            <!-- Top Badges -->
            <div class="flex items-center justify-between gap-2 mb-3">
              <span :class="['px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1', getLabBadge(item.lab_type).class]">
                <span>{{ getLabBadge(item.lab_type).icon }}</span>
                <span>{{ getLabBadge(item.lab_type).label }}</span>
              </span>

              <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold border', getKondisiBadge(item.kondisi).class]">
                {{ getKondisiBadge(item.kondisi).label }}
              </span>
            </div>

            <!-- Item Code & Name -->
            <div class="text-[11px] font-mono font-bold text-orange-600 dark:text-orange-400">
              {{ item.kode_item }}
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white leading-snug mt-0.5">
              {{ item.nama_item }}
            </h3>
            <p v-if="item.kategori || item.merk" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {{ [item.kategori, item.merk].filter(Boolean).join(' • ') }}
            </p>

            <!-- Specific Lab Payload Previews -->
            <div class="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 space-y-1.5 text-xs">
              <!-- LAB KIMIA SPECIFIC -->
              <template v-if="item.lab_type === 'kimia'">
                <div v-if="parseSpecJson(item.spesifikasi_khusus)?.formula" class="flex items-center justify-between">
                  <span class="text-slate-400">Rumus Kimia:</span>
                  <span class="font-bold font-mono text-indigo-600 dark:text-indigo-400">{{ parseSpecJson(item.spesifikasi_khusus).formula }}</span>
                </div>
                <div v-if="item.tanggal_kadaluarsa" class="flex items-center justify-between">
                  <span class="text-slate-400">Kadaluarsa:</span>
                  <span :class="['font-semibold text-[11px]', new Date(item.tanggal_kadaluarsa) <= new Date(Date.now() + 30 * 86400000) ? 'text-amber-600 font-bold' : 'text-slate-700 dark:text-slate-300']">
                    {{ new Date(item.tanggal_kadaluarsa).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) }}
                  </span>
                </div>
                <div v-if="parseSpecJson(item.spesifikasi_khusus)?.hazard_symbols" class="flex items-center gap-1.5 pt-1">
                  <span class="text-[10px] text-slate-400">Bahaya B3:</span>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="sym in parseSpecJson(item.spesifikasi_khusus).hazard_symbols"
                      :key="sym"
                      class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200"
                    >
                      ⚠ {{ sym }}
                    </span>
                  </div>
                </div>
              </template>

              <!-- LAB KOMPUTER SPECIFIC -->
              <template v-else-if="item.lab_type === 'komputer'">
                <div v-if="parseSpecJson(item.spesifikasi_khusus)?.processor" class="flex items-center justify-between">
                  <span class="text-slate-400">Processor:</span>
                  <span class="font-medium text-[11px] truncate max-w-[170px]">{{ parseSpecJson(item.spesifikasi_khusus).processor }}</span>
                </div>
                <div v-if="parseSpecJson(item.spesifikasi_khusus)?.ram_gb" class="flex items-center justify-between">
                  <span class="text-slate-400">RAM & Storage:</span>
                  <span class="font-bold text-[11px]">{{ parseSpecJson(item.spesifikasi_khusus).ram_gb }} GB RAM • {{ parseSpecJson(item.spesifikasi_khusus).storage || 'SSD' }}</span>
                </div>
                <div v-if="parseSpecJson(item.spesifikasi_khusus)?.mac_address" class="flex items-center justify-between">
                  <span class="text-slate-400">MAC Addr:</span>
                  <span class="font-mono text-[10px] text-slate-500">{{ parseSpecJson(item.spesifikasi_khusus).mac_address }}</span>
                </div>
              </template>

              <!-- LAB FISIKA SPECIFIC -->
              <template v-else-if="item.lab_type === 'fisika'">
                <div v-if="item.jadwal_kalibrasi" class="flex items-center justify-between">
                  <span class="text-slate-400">Kalibrasi:</span>
                  <span class="font-semibold text-[11px] text-indigo-600 dark:text-indigo-400">
                    {{ new Date(item.jadwal_kalibrasi).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) }}
                  </span>
                </div>
                <div v-if="parseSpecJson(item.spesifikasi_khusus)?.components_checklist" class="flex items-center justify-between">
                  <span class="text-slate-400">Sub-Komponen:</span>
                  <span class="font-bold text-[11px]">{{ parseSpecJson(item.spesifikasi_khusus).components_checklist.length }} Komponen Box</span>
                </div>
              </template>

              <!-- LAB BIOLOGI SPECIFIC -->
              <template v-else-if="item.lab_type === 'biologi'">
                <div v-if="parseSpecJson(item.spesifikasi_khusus)?.eyepiece" class="flex items-center justify-between">
                  <span class="text-slate-400">Lensa Okuler:</span>
                  <span class="font-bold text-[11px]">{{ parseSpecJson(item.spesifikasi_khusus).eyepiece }}</span>
                </div>
                <div v-if="parseSpecJson(item.spesifikasi_khusus)?.slides_count" class="flex items-center justify-between">
                  <span class="text-slate-400">Kaca Sediaan:</span>
                  <span class="font-bold text-[11px]">{{ parseSpecJson(item.spesifikasi_khusus).slides_count }} Preparat Slide</span>
                </div>
              </template>

              <div class="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px]">
                <span class="text-slate-400">Lokasi:</span>
                <span class="font-medium text-slate-700 dark:text-slate-300">{{ item.lokasi_penyimpanan || 'Ruang Lab' }}</span>
              </div>
            </div>

            <!-- Stok Progress Bar -->
            <div class="mt-4">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-slate-500 font-medium">Ketersediaan Stok:</span>
                <span class="font-bold font-mono">
                  <span :class="item.stok_tersedia <= item.stok_minimum ? 'text-rose-600 font-black' : 'text-emerald-600'">
                    {{ item.stok_tersedia }}
                  </span>
                  <span class="text-slate-400"> / {{ item.stok_total }} {{ item.satuan }}</span>
                </span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  :class="[
                    'h-full rounded-full transition-all duration-300',
                    item.stok_tersedia <= item.stok_minimum ? 'bg-rose-500' : 'bg-emerald-500'
                  ]"
                  :style="{ width: `${Math.min(100, (item.stok_tersedia / (item.stok_total || 1)) * 100)}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Bottom Card Action Controls -->
          <div class="mt-5 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                @click="openDetailModal(item)"
                class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                title="Lihat riwayat pemakaian & servis"
              >
                Detail & Log
              </button>
              <button
                type="button"
                @click="openQRModal(item)"
                class="p-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Cetak Label QR Code / Barcode"
              >
                🏷️
              </button>
            </div>

            <!-- Action Buttons for Teacher & Staff -->
            <div v-if="isTeacherOrStaff" class="flex items-center gap-1">
              <button
                v-if="item.item_type === 'bahan_habis_pakai'"
                type="button"
                @click="openUsageModal(item)"
                class="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/60 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 transition-colors"
                title="Catat pemakaian bahan praktikum ini"
              >
                Pakai Praktikum
              </button>
              <button
                v-else
                type="button"
                @click="openMaintenanceModal(item)"
                class="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                title="Catat tindakan perbaikan / servis"
              >
                Servis
              </button>

              <button
                type="button"
                @click="openEditItemModal(item)"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs"
                title="Edit data barang lab"
              >
                ✏️
              </button>
              <button
                v-if="isStaff"
                type="button"
                @click="deleteItem(item)"
                class="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 text-xs"
                title="Hapus barang lab"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT: TABLE VIEW -->
      <div v-else class="rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th class="p-3.5">Kode & Nama Item</th>
                <th class="p-3.5">Lab / Tipe</th>
                <th class="p-3.5">Kategori / Merk</th>
                <th class="p-3.5 text-center">Stok Sedia / Total</th>
                <th class="p-3.5">Kondisi</th>
                <th class="p-3.5">Lokasi Simpan</th>
                <th class="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/80 dark:divide-slate-800">
              <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td class="p-3.5">
                  <div class="font-mono font-bold text-orange-600 dark:text-orange-400">{{ item.kode_item }}</div>
                  <div class="font-bold text-slate-900 dark:text-white text-xs mt-0.5">{{ item.nama_item }}</div>
                  <div v-if="parseSpecJson(item.spesifikasi_khusus)?.formula" class="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {{ parseSpecJson(item.spesifikasi_khusus).formula }}
                  </div>
                </td>
                <td class="p-3.5">
                  <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1', getLabBadge(item.lab_type).class]">
                    <span>{{ getLabBadge(item.lab_type).icon }}</span>
                    <span>{{ getLabBadge(item.lab_type).label }}</span>
                  </span>
                  <div class="text-[10px] text-slate-400 mt-1">{{ item.item_type }}</div>
                </td>
                <td class="p-3.5">
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ item.kategori || '-' }}</div>
                  <div class="text-[10px] text-slate-400">{{ item.merk || '-' }}</div>
                </td>
                <td class="p-3.5 text-center font-mono">
                  <span :class="['font-bold', item.stok_tersedia <= item.stok_minimum ? 'text-rose-600' : 'text-emerald-600']">
                    {{ item.stok_tersedia }}
                  </span>
                  <span class="text-slate-400"> / {{ item.stok_total }} {{ item.satuan }}</span>
                </td>
                <td class="p-3.5">
                  <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold border', getKondisiBadge(item.kondisi).class]">
                    {{ getKondisiBadge(item.kondisi).label }}
                  </span>
                </td>
                <td class="p-3.5 text-slate-600 dark:text-slate-400">
                  {{ item.lokasi_penyimpanan || 'Lab' }}
                </td>
                <td class="p-3.5 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      @click="openDetailModal(item)"
                      class="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      Detail
                    </button>
                    <button
                      type="button"
                      @click="openQRModal(item)"
                      class="p-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100"
                      title="Cetak Label"
                    >
                      🏷️
                    </button>
                    <button
                      v-if="isTeacherOrStaff"
                      type="button"
                      @click="item.item_type === 'bahan_habis_pakai' ? openUsageModal(item) : openMaintenanceModal(item)"
                      class="px-2 py-1 rounded-lg text-xs font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200"
                    >
                      {{ item.item_type === 'bahan_habis_pakai' ? 'Pakai' : 'Servis' }}
                    </button>
                    <button
                      v-if="isTeacherOrStaff"
                      type="button"
                      @click="openEditItemModal(item)"
                      class="p-1 rounded-lg text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100"
                      title="Edit data barang lab"
                    >
                      ✏️
                    </button>
                    <button
                      v-if="isStaff"
                      type="button"
                      @click="deleteItem(item)"
                      class="p-1 rounded-lg text-xs text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Hapus barang lab"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && items.length === 0" class="p-12 text-center rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <div class="text-4xl mb-2">🔬</div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">Tidak ada barang laboratorium ditemukan</h3>
        <p class="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau ganti filter tab laboratorium.</p>
        <div v-if="isTeacherOrStaff" class="mt-4">
          <button
            type="button"
            @click="openAddItemModal"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/25 transition-all"
          >
            <span>➕</span>
            <span>Tambah Barang Lab Baru</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 1: DETAIL & RIWAYAT ITEM             -->
    <!-- ========================================== -->
    <div
      v-if="showDetailModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
    >
      <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="text-xs font-mono font-bold text-orange-600">{{ selectedDetailItem?.kode_item }}</div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ selectedDetailItem?.nama_item }}</h3>
          </div>
          <button @click="showDetailModal = false" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <!-- Detail Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pt-3">
          <button
            @click="detailActiveTab = 'spec'"
            :class="['px-3 py-2 text-xs font-bold border-b-2 transition-colors', detailActiveTab === 'spec' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400']"
          >
            Spesifikasi Lengkap
          </button>
          <button
            @click="detailActiveTab = 'usage'"
            :class="['px-3 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5', detailActiveTab === 'usage' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400']"
          >
            <span>Riwayat Pemakaian Praktikum</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">{{ selectedDetailItem?.usage_logs?.length || 0 }}</span>
          </button>
          <button
            @click="detailActiveTab = 'maintenance'"
            :class="['px-3 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5', detailActiveTab === 'maintenance' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400']"
          >
            <span>Riwayat Servis & Kalibrasi</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">{{ selectedDetailItem?.maintenance_logs?.length || 0 }}</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto py-4 space-y-4">
          <!-- Spec Tab -->
          <div v-if="detailActiveTab === 'spec'" class="space-y-3 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div class="text-[10px] text-slate-400">Laboratorium</div>
                <div class="font-bold capitalize">{{ selectedDetailItem?.lab_type }}</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div class="text-[10px] text-slate-400">Tipe Barang</div>
                <div class="font-bold capitalize">{{ selectedDetailItem?.item_type }}</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div class="text-[10px] text-slate-400">Total Stok & Tersedia</div>
                <div class="font-bold font-mono">{{ selectedDetailItem?.stok_tersedia }} / {{ selectedDetailItem?.stok_total }} {{ selectedDetailItem?.satuan }}</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div class="text-[10px] text-slate-400">Lokasi Simpan</div>
                <div class="font-bold">{{ selectedDetailItem?.lokasi_penyimpanan || '-' }}</div>
              </div>
            </div>

            <div v-if="selectedDetailItem?.keterangan" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div class="text-[10px] text-slate-400 mb-1">Keterangan / Panduan</div>
              <p class="leading-relaxed">{{ selectedDetailItem.keterangan }}</p>
            </div>

            <!-- JSON Payload formatted -->
            <div v-if="selectedDetailItem?.spesifikasi_khusus" class="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
              <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-sans font-bold">Metadata Spesifikasi:</div>
              <pre>{{ JSON.stringify(parseSpecJson(selectedDetailItem.spesifikasi_khusus) || selectedDetailItem.spesifikasi_khusus, null, 2) }}</pre>
            </div>
          </div>

          <!-- Usage Tab -->
          <div v-else-if="detailActiveTab === 'usage'" class="space-y-3">
            <div v-if="!selectedDetailItem?.usage_logs?.length" class="p-8 text-center text-slate-400 text-xs">
              Belum ada riwayat pemakaian praktikum untuk barang ini.
            </div>
            <div v-for="log in selectedDetailItem?.usage_logs || []" :key="log.id" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-900 dark:text-white">{{ log.judul_praktikum }}</span>
                <span class="font-mono text-slate-400">{{ new Date(log.tanggal_praktikum).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
              </div>
              <div class="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Kelas: <strong>{{ log.kelas_jurusan }}</strong> (Guru: {{ log.nama_guru || '-' }})</span>
                <span class="font-mono font-bold text-orange-600">-{{ log.jumlah_digunakan }} {{ selectedDetailItem.satuan }} (Sisa: {{ log.sisa_stok_setelahnya }})</span>
              </div>
              <div v-if="log.catatan" class="text-[11px] text-slate-500 italic mt-1">
                "{{ log.catatan }}"
              </div>
            </div>
          </div>

          <!-- Maintenance Tab -->
          <div v-else-if="detailActiveTab === 'maintenance'" class="space-y-3">
            <div v-if="!selectedDetailItem?.maintenance_logs?.length" class="p-8 text-center text-slate-400 text-xs">
              Belum ada riwayat servis atau tindakan kalibrasi.
            </div>
            <div v-for="log in selectedDetailItem?.maintenance_logs || []" :key="log.id" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold capitalize text-slate-900 dark:text-white">Tindakan: {{ log.jenis_tindakan.replace(/_/g, ' ') }}</span>
                <span class="font-mono text-slate-400">{{ new Date(log.tanggal_tindakan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
              </div>
              <p class="text-slate-600 dark:text-slate-300">{{ log.deskripsi }}</p>
              <div class="flex items-center justify-between pt-1 text-[11px]">
                <span class="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{{ log.status_akhir }}</span>
                <span v-if="log.biaya" class="font-mono text-slate-500">Biaya: Rp {{ Number(log.biaya).toLocaleString('id-ID') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 2: CATAT PEMAKAIAN PRAKTIKUM         -->
    <!-- ========================================== -->
    <div
      v-if="showUsageModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📝</span> Catat Pemakaian Sesi Praktikum
          </h3>
          <button @click="showUsageModal = false" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form @submit.prevent="submitUsage" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Barang / Bahan Lab *</label>
            <select
              v-model="usageForm.lab_item_id"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <option v-for="i in items" :key="i.id" :value="String(i.id)">
                [{{ i.lab_type.toUpperCase() }}] {{ i.kode_item }} - {{ i.nama_item }} (Tersedia: {{ i.stok_tersedia }} {{ i.satuan }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Praktikum *</label>
              <input
                type="date"
                v-model="usageForm.tanggal_praktikum"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kelas / Rombongan *</label>
              <input
                type="text"
                v-model="usageForm.kelas_jurusan"
                placeholder="Contoh: XI MIPA 2"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Judul / Materi Praktikum *</label>
            <input
              type="text"
              v-model="usageForm.judul_praktikum"
              placeholder="Contoh: Uji Titrasi Asam Basa HCl dan NaOH"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Digunakan * (Satuan: {{ selectedItemForUsage?.satuan || 'unit' }})
              </label>
              <input
                type="number"
                v-model="usageForm.jumlah_digunakan"
                min="1"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Guru Pembimbing</label>
              <input
                type="text"
                v-model="usageForm.nama_guru"
                placeholder="Nama guru pengampu"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <!-- Live Stok Calculation Preview -->
          <div v-if="selectedItemForUsage" class="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 text-xs flex items-center justify-between">
            <span class="text-orange-900 dark:text-orange-200">Kalkulasi Sisa Stok:</span>
            <span class="font-mono font-bold">
              {{ selectedItemForUsage.stok_tersedia }} - {{ usageForm.jumlah_digunakan }} =
              <span :class="(selectedItemForUsage.stok_tersedia - usageForm.jumlah_digunakan) < 0 ? 'text-rose-600 font-black' : 'text-emerald-600'">
                {{ selectedItemForUsage.stok_tersedia - usageForm.jumlah_digunakan }} {{ selectedItemForUsage.satuan }}
              </span>
            </span>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan / Laporan Kejadian (Opsional)</label>
            <textarea
              v-model="usageForm.catatan"
              rows="2"
              placeholder="Contoh: Praktikum selesai lancar. Tidak ada alat yang pecah."
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              @click="showUsageModal = false"
              class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submittingUsage"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-600/25 disabled:opacity-50"
            >
              {{ submittingUsage ? 'Menyimpan...' : 'Simpan Pemakaian' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 3: CATAT PEMELIHARAAN / SERVIS       -->
    <!-- ========================================== -->
    <div
      v-if="showMaintenanceModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🔧</span> Catat Pemeliharaan / Troubleshooting
          </h3>
          <button @click="showMaintenanceModal = false" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form @submit.prevent="submitMaintenance" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Barang yang Diservis *</label>
            <select
              v-model="maintenanceForm.lab_item_id"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <option v-for="i in items" :key="i.id" :value="String(i.id)">
                [{{ i.lab_type.toUpperCase() }}] {{ i.kode_item }} - {{ i.nama_item }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Tindakan *</label>
              <input
                type="date"
                v-model="maintenanceForm.tanggal_tindakan"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Tindakan *</label>
              <select
                v-model="maintenanceForm.jenis_tindakan"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="install_ulang">Install Ulang OS / Software</option>
                <option value="ganti_part">Pergantian Hardware / Komponen</option>
                <option value="kalibrasi">Kalibrasi Alat Ukur / Presisi</option>
                <option value="pembersihan_lensa">Pembersihan Optik & Lensa</option>
                <option value="perbaikan">Perbaikan Umum & Servis</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Tindakan yang Dilakukan *</label>
            <textarea
              v-model="maintenanceForm.deskripsi"
              rows="3"
              required
              placeholder="Contoh: Pembersihan debu heatsink, ganti thermal paste, instalasi ulang Windows 11 dan software browser CBT."
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Akhir Kondisi *</label>
              <select
                v-model="maintenanceForm.status_akhir"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              >
                <option value="selesai">Selesai (Kondisi Kembali Baik)</option>
                <option value="menunggu_komponen">Menunggu Komponen Pengganti</option>
                <option value="afkir">Rusak Berat / Afkir</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Estimasi Biaya (Rp)</label>
              <input
                type="number"
                v-model="maintenanceForm.biaya"
                placeholder="0"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              @click="showMaintenanceModal = false"
              class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submittingMaintenance"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/25 disabled:opacity-50"
            >
              {{ submittingMaintenance ? 'Menyimpan...' : 'Simpan Tindakan Servis' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 4: FORM TAMBAH / EDIT BARANG LAB    -->
    <!-- ========================================== -->
    <div
      v-if="showItemModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
    >
      <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🔬</span> {{ itemModalTitle }}
          </h3>
          <button @click="showItemModal = false" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form @submit.prevent="saveItem" class="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rumpun Laboratorium *</label>
              <select
                v-model="itemForm.lab_type"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              >
                <option value="komputer">💻 Lab Komputer</option>
                <option value="kimia">⚗️ Lab Kimia</option>
                <option value="fisika">⚡ Lab Fisika</option>
                <option value="biologi">🔬 Lab Biologi</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipe Entitas *</label>
              <select
                v-model="itemForm.item_type"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              >
                <option value="alat">Alat / Instrumen Tetap</option>
                <option value="bahan_habis_pakai">Bahan Habis Pakai (Reagen)</option>
                <option value="kit">Kit Percobaan Terpadu</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ruangan Laboratorium</label>
              <select
                v-model="itemForm.room_id"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="">-- Tanpa Ruangan Tertentu --</option>
                <option v-for="r in rooms" :key="r.id" :value="String(r.id)">
                  {{ r.nama_ruang }} ({{ r.kode_ruang }})
                </option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lokasi Rak / Meja / Lemari</label>
              <input
                type="text"
                v-model="itemForm.lokasi_penyimpanan"
                placeholder="Contoh: Lemari Asam B3 / Rak 2"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-1">
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700 dark:text-slate-300">Kode Item *</label>
                <button
                  type="button"
                  @click="generateKodeItem"
                  class="text-[10px] text-orange-600 dark:text-orange-400 font-semibold hover:underline"
                  title="Generate kode unik otomatis"
                >
                  ⚡ Acak
                </button>
              </div>
              <input
                type="text"
                v-model="itemForm.kode_item"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold uppercase text-orange-600"
              />
            </div>
            <div class="col-span-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Barang / Reagen / Alat *</label>
              <input
                type="text"
                v-model="itemForm.nama_item"
                required
                placeholder="Contoh: Larutan Asam Klorida HCl 1M / PC Klien 01"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori Khusus</label>
              <input
                type="text"
                v-model="itemForm.kategori"
                placeholder="Reagen Asam / Kit Optik / PC Workstation"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Merk / Produsen</label>
              <input
                type="text"
                v-model="itemForm.merk"
                placeholder="Merck / Lenovo / Pudak / Olympus"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Total Stok *</label>
              <input
                type="number"
                v-model="itemForm.stok_total"
                min="0"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tersedia *</label>
              <input
                type="number"
                v-model="itemForm.stok_tersedia"
                min="0"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Batas Minimum</label>
              <input
                type="number"
                v-model="itemForm.stok_minimum"
                min="0"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Satuan *</label>
              <input
                type="text"
                v-model="itemForm.satuan"
                placeholder="ml / gram / unit / set / pcs"
                required
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kondisi Fisik *</label>
              <select
                v-model="itemForm.kondisi"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="baik">Kondisi Baik</option>
                <option value="rusak_ringan">Perlu Perbaikan / Kurang Part</option>
                <option value="rusak_berat">Rusak Berat / Afkir</option>
                <option value="habis">Stok Habis</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tgl Kadaluarsa (Reagen)</label>
              <input
                type="date"
                v-model="itemForm.tanggal_kadaluarsa"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jadwal Kalibrasi / Servis</label>
              <input
                type="date"
                v-model="itemForm.jadwal_kalibrasi"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Spesifikasi Khusus / JSON / Rincian Teknis</label>
            <textarea
              v-model="itemForm.spesifikasi_khusus"
              rows="2"
              placeholder='Contoh: {"formula":"HCl", "hazard_symbols":["corrosive"]} atau {"processor":"Core i5", "ram_gb":16}'
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
            ></textarea>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              v-model="itemForm.keterangan"
              placeholder="Contoh: Khusus praktikum kelas XI, jangan dipindah tanpa izin guru lab"
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              @click="showItemModal = false"
              class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingItem"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-600/25 disabled:opacity-50"
            >
              {{ savingItem ? 'Menyimpan...' : 'Simpan Barang Lab' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 5: IMPORT EXCEL KHUSUS LAB           -->
    <!-- ========================================== -->
    <div
      v-if="showImportModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
    >
      <div class="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-sm">
              📊
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                Import Data Inventaris Laboratorium via Excel / CSV
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Tambah ratusan reagen, perangkat PC, dan instrumen praktikum sekaligus.
              </p>
            </div>
          </div>
          <button @click="closeImportModal" class="p-2 text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        <!-- Step 1: Upload -->
        <div v-if="importStep === 'upload'" class="space-y-5 overflow-y-auto pr-1">
          <div class="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div class="text-xs font-bold text-orange-950 dark:text-orange-200">
                Pilih Format Template Resmi Sesuai Rumpun Lab:
              </div>
              <div class="text-[11px] text-orange-800/80 dark:text-orange-300 mt-0.5">
                Tersedia format khusus Lab Kimia (dengan rumus & expired), Lab Komputer (dengan spec hardware), atau format umum.
              </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                @click="downloadTemplate('kimia')"
                class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px]"
              >
                ⚗️ Template Kimia
              </button>
              <button
                type="button"
                @click="downloadTemplate('komputer')"
                class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px]"
              >
                💻 Template Komputer
              </button>
              <button
                type="button"
                @click="downloadTemplate('semua')"
                class="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px]"
              >
                📄 Template Semua Lab
              </button>
            </div>
          </div>

          <div
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDropFile"
            @click="fileInputRef?.click()"
            :class="[
              'border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center',
              isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'
            ]"
          >
            <input ref="fileInputRef" type="file" accept=".xlsx, .xls, .csv" @change="onFileChange" class="hidden" />
            <div v-if="parsingFile" class="flex flex-col items-center gap-3">
              <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Membaca file data lab...</div>
            </div>
            <div v-else class="flex flex-col items-center gap-3">
              <div class="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl shadow-sm">🔬</div>
              <div>
                <div class="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Tarik & Lepas File ke Sini, atau <span class="text-emerald-600 underline">Pilih File</span>
                </div>
                <div class="text-xs text-slate-400 mt-1">Format: <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Preview -->
        <div v-else-if="importStep === 'preview'" class="flex-1 flex flex-col min-h-0 space-y-4">
          <div class="grid grid-cols-4 gap-2.5">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border">
              <div class="text-[10px] text-slate-400 font-bold uppercase">Total Baris</div>
              <div class="text-lg font-black">{{ parsedData?.total || 0 }}</div>
            </div>
            <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700">
              <div class="text-[10px] font-bold uppercase">Siap Import</div>
              <div class="text-lg font-black">{{ parsedData?.validCount || 0 }}</div>
            </div>
            <div class="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-blue-700">
              <div class="text-[10px] font-bold uppercase">Baru</div>
              <div class="text-lg font-black">{{ parsedData?.rows?.filter(r => r.isValid && r.action === 'create').length || 0 }}</div>
            </div>
            <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-700">
              <div class="text-[10px] font-bold uppercase">Update Data</div>
              <div class="text-lg font-black">{{ parsedData?.rows?.filter(r => r.isValid && r.action === 'update').length || 0 }}</div>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border flex items-center justify-between text-xs">
            <label class="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
              <input type="checkbox" v-model="updateExisting" class="rounded text-orange-600 focus:ring-orange-500" />
              <span>Perbarui data jika Kode Item sudah ada</span>
            </label>
            <span class="text-slate-400 text-[11px]">File: {{ parsedData?.filename }}</span>
          </div>

          <div class="flex-1 overflow-y-auto border rounded-2xl text-xs">
            <table class="w-full text-left border-collapse">
              <thead class="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold text-[11px]">
                <tr>
                  <th class="p-3">Kode Item</th>
                  <th class="p-3">Nama Barang</th>
                  <th class="p-3">Lab</th>
                  <th class="p-3">Stok</th>
                  <th class="p-3">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="(r, idx) in parsedData?.rows || []" :key="idx" :class="[!r.isValid ? 'bg-rose-50/50' : '']">
                  <td class="p-3 font-mono font-bold text-orange-600">{{ r.kode_item }}</td>
                  <td class="p-3 font-medium">{{ r.nama_item }}</td>
                  <td class="p-3 capitalize">{{ r.lab_type }}</td>
                  <td class="p-3 font-mono">{{ r.stok_tersedia }} / {{ r.stok_total }} {{ r.satuan }}</td>
                  <td class="p-3">
                    <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold', r.action === 'create' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700']">
                      {{ r.action === 'create' ? 'Baru' : 'Update' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between pt-2">
            <button @click="importStep = 'upload'" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600">← Pilih File Lain</button>
            <button
              @click="submitImport"
              :disabled="importing || !parsedData?.validCount"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/25 disabled:opacity-50"
            >
              {{ importing ? 'Mengimport...' : `Konfirmasi & Import (${parsedData?.validCount} Barang Lab)` }}
            </button>
          </div>
        </div>

        <!-- Step 3: Success -->
        <div v-else-if="importStep === 'success'" class="space-y-6 text-center py-6">
          <div class="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center text-3xl font-bold">✓</div>
          <div>
            <h4 class="text-lg font-extrabold text-slate-900 dark:text-white">Import Inventaris Lab Selesai!</h4>
            <p class="text-xs text-slate-400 mt-1">Data berhasil disinkronkan ke database laboratorium sekolah.</p>
          </div>
          <div class="grid grid-cols-3 gap-3 max-w-md mx-auto text-xs">
            <div class="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <div class="text-[10px] font-bold">Dibuat Baru</div>
              <div class="text-xl font-black font-mono">{{ importResult?.createdCount || 0 }}</div>
            </div>
            <div class="p-3 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
              <div class="text-[10px] font-bold">Diperbarui</div>
              <div class="text-xl font-black font-mono">{{ importResult?.updatedCount || 0 }}</div>
            </div>
            <div class="p-3 rounded-2xl bg-slate-50 text-slate-500 border">
              <div class="text-[10px] font-bold">Dilewati</div>
              <div class="text-xl font-black font-mono">{{ importResult?.skippedCount || 0 }}</div>
            </div>
          </div>
          <button @click="closeImportModal" class="px-6 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-md">Selesai & Tutup</button>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL 6: CETAK LABEL QR CODE & BARCODE     -->
    <!-- ========================================== -->
    <div
      v-if="showQRModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
    >
      <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in text-center space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <span class="text-xs font-bold text-slate-500">Label Inventaris Laboratorium</span>
          <button @click="showQRModal = false" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <!-- Label Card Visualizer -->
        <div class="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white text-slate-900 shadow-sm text-left space-y-2">
          <div class="flex items-center justify-between border-b pb-2">
            <div>
              <div class="text-[9px] font-bold uppercase tracking-wider text-orange-600">SMA NUSAPUTERA SEMARANG</div>
              <div class="text-[11px] font-extrabold uppercase">LAB {{ selectedQRItem?.lab_type }}</div>
            </div>
            <div class="w-8 h-8 rounded-lg bg-orange-50 p-0.5 border border-orange-200 flex items-center justify-center">
              <img src="/images/logo.png" alt="Logo" class="w-full h-full object-contain" />
            </div>
          </div>

          <div class="flex items-center gap-3 pt-1">
            <!-- Simulated QR code pattern -->
            <div class="w-16 h-16 bg-slate-900 text-white flex flex-col items-center justify-center p-1 rounded-lg shrink-0">
              <span class="text-2xl">▦</span>
              <span class="text-[7px] font-mono tracking-tighter">QR-SCAN</span>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-mono font-black text-orange-600">{{ selectedQRItem?.kode_item }}</div>
              <div class="text-xs font-bold truncate leading-tight mt-0.5">{{ selectedQRItem?.nama_item }}</div>
              <div class="text-[10px] text-slate-500 mt-1 truncate">Lokasi: {{ selectedQRItem?.lokasi_penyimpanan || 'Lab' }}</div>
            </div>
          </div>

          <div class="pt-2 border-t text-[8px] text-center text-slate-400 uppercase tracking-widest font-mono">
            SISARPRA • PROPERTY OF SMA NUSAPUTERA
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button @click="showQRModal = false" class="px-4 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100">Tutup</button>
          <button @click="printLabel" class="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-600/25 flex items-center gap-1.5">
            <span>🖨️</span>
            <span>Cetak Stiker Label</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
