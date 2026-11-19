<script setup>
const { user: currentUser, isStaff } = useAuth()

// Fetch Locker Data & Users for Autocomplete
const searchQuery = ref('')
const selectedStatus = ref('')
const viewMode = ref('grid') // 'grid' | 'table'

const { data: pageData, refresh: fetchLockers, pending: loading } = await useFetch('/api/lockers', {
  query: computed(() => ({
    search: searchQuery.value || undefined,
    status: selectedStatus.value || undefined
  })),
  watch: [selectedStatus]
})

const lockers = computed(() => pageData.value?.lockers || [])
const allLockers = computed(() => pageData.value?.allLockers || [])
const stats = computed(() => pageData.value?.stats || { total: 24, tersedia: 0, terisi: 0, perbaikan: 0 })
const usersList = computed(() => pageData.value?.users || [])

let searchTimeout = null
const onSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchLockers()
  }, 300)
}

// Modal State: Alokasi & Edit Loker
const showModal = ref(false)
const modalSubmitting = ref(false)
const modalError = ref('')
const modalSuccess = ref('')

const form = reactive({
  id: null,
  nomor_loker: '',
  nomor_kunci: '',
  lokasi: '',
  status: 'tersedia',
  user_id: null,
  nama_pemilik: '',
  role_pemilik: 'siswa',
  nomor_induk: '',
  nomor_kontak: '',
  keperluan: '',
  isi_loker: '',
  tanggal_mulai: '',
  tanggal_selesai: '',
  catatan: ''
})

const openLockerModal = (locker) => {
  modalError.value = ''
  modalSuccess.value = ''
  form.id = locker.id
  form.nomor_loker = locker.nomor_loker
  form.nomor_kunci = locker.nomor_kunci || `K-${locker.nomor_loker.replace(/\D/g, '')}`
  form.lokasi = locker.lokasi || 'Koridor Utama Sarpra'
  form.status = locker.status || 'tersedia'
  form.user_id = locker.user_id || null
  form.nama_pemilik = locker.nama_pemilik || ''
  form.role_pemilik = locker.role_pemilik || 'siswa'
  form.nomor_induk = locker.nomor_induk || ''
  form.nomor_kontak = locker.nomor_kontak || ''
  form.keperluan = locker.keperluan || ''
  form.isi_loker = locker.isi_loker || ''
  form.tanggal_mulai = locker.tanggal_mulai || new Date().toISOString().split('T')[0]
  form.tanggal_selesai = locker.tanggal_selesai || ''
  form.catatan = locker.catatan || ''
  showModal.value = true
}

// Quick fill from user dropdown
const onSelectUser = (event) => {
  const userId = event.target.value
  if (!userId) {
    form.user_id = null
    return
  }
  const found = usersList.value.find(u => String(u.id) === String(userId))
  if (found) {
    form.user_id = found.id
    form.nama_pemilik = found.name
    form.role_pemilik = found.role
    form.nomor_induk = found.nomor_induk || ''
    form.nomor_kontak = found.no_telepon || ''
    if (form.status === 'tersedia') {
      form.status = 'terisi'
    }
  }
}

// Helper untuk tambah tag ke isi loker
const addTagToIsi = (text) => {
  if (!form.isi_loker) {
    form.isi_loker = `- ${text}`
  } else {
    form.isi_loker += `\n- ${text}`
  }
}

// Simpan Data Alokasi Loker
const submitLocker = async () => {
  try {
    modalSubmitting.value = true
    modalError.value = ''
    modalSuccess.value = ''

    const res = await $fetch('/api/lockers/save', {
      method: 'POST',
      body: {
        id: form.id,
        nomor_loker: form.nomor_loker,
        nomor_kunci: form.nomor_kunci,
        lokasi: form.lokasi,
        status: form.status,
        user_id: form.user_id,
        nama_pemilik: form.nama_pemilik,
        role_pemilik: form.role_pemilik,
        nomor_induk: form.nomor_induk,
        nomor_kontak: form.nomor_kontak,
        keperluan: form.keperluan,
        isi_loker: form.isi_loker,
        tanggal_mulai: form.tanggal_mulai,
        tanggal_selesai: form.tanggal_selesai,
        catatan: form.catatan
      }
    })

    modalSuccess.value = res.message || 'Data loker berhasil disimpan.'
    await fetchLockers()
    setTimeout(() => {
      showModal.value = false
    }, 900)
  } catch (err) {
    modalError.value = err.data?.statusMessage || err.message || 'Gagal menyimpan data loker.'
  } finally {
    modalSubmitting.value = false
  }
}

// Kosongkan Loker
const releasing = ref(false)
const releaseLocker = async () => {
  if (!confirm(`Apakah Anda yakin ingin mengosongkan ${form.nomor_loker}? Data kepemilikan dan isi loker akan direset.`)) {
    return
  }

  try {
    releasing.value = true
    modalError.value = ''
    modalSuccess.value = ''

    const res = await $fetch('/api/lockers/release', {
      method: 'POST',
      body: { id: form.id }
    })

    modalSuccess.value = res.message || 'Loker berhasil dikosongkan.'
    await fetchLockers()
    setTimeout(() => {
      showModal.value = false
    }, 800)
  } catch (err) {
    modalError.value = err.data?.statusMessage || err.message || 'Gagal mengosongkan loker.'
  } finally {
    releasing.value = false
  }
}

// ==========================================
// CETAK KARTU / DOKUMEN RESMI LEMARI LOKER
// ==========================================
const showPrintModal = ref(false)
const printType = ref('single') // 'single' | 'all'
const selectedLockerForPrint = ref(null)

const openSinglePrint = (locker) => {
  printType.value = 'single'
  selectedLockerForPrint.value = locker
  showPrintModal.value = true
}

const openAllPrint = () => {
  printType.value = 'all'
  selectedLockerForPrint.value = lockers.value[0] || null
  showPrintModal.value = true
}

const printDocument = () => {
  window.print()
}

// formatDate otomatis di-auto-import dari utils/formatters.ts

// Format badge nomor loker: misal LOK-01 -> 01
const getDoorNumber = (code) => {
  const match = code.match(/\d+/)
  return match ? match[0] : code
}
</script>

<template>
  <div>
    <!-- Non-printable Web Page UI -->
    <div class="print:hidden space-y-6 max-w-7xl mx-auto">
      <!-- Header Banner & Action Controls -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-white">
        <!-- Ambient decorative shapes -->
        <div class="absolute -right-10 -bottom-10 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 backdrop-blur-md">
              <span class="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
              <span>Sarana & Prasarana • Fasilitas Lemari Loker</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>🗄️ Manajemen Lemari Loker</span>
              <span class="text-xs px-2.5 py-1 rounded-lg bg-teal-600/30 text-teal-300 font-mono border border-teal-500/30">24 PINTU</span>
            </h1>
            <p class="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Monitoring status pemakaian, identitas pemilik, keperluan, dan rincian barang/dokumen di dalam 24 unit lemari loker SMA Nusaputera Semarang.
            </p>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-wrap items-center gap-2.5">
            <!-- View Mode Switcher -->
            <div class="inline-flex p-1 rounded-xl bg-slate-800/80 border border-slate-700">
              <button
                type="button"
                @click="viewMode = 'grid'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5',
                  viewMode === 'grid'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                ]"
              >
                <span>🗄️ Rak Fisik (Grid)</span>
              </button>
              <button
                type="button"
                @click="viewMode = 'table'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5',
                  viewMode === 'table'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                ]"
              >
                <span>📋 Tabel Data</span>
              </button>
            </div>

            <button
              type="button"
              @click="openAllPrint"
              class="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <span>🖨️ Cetak Rekap 24 Loker</span>
            </button>

            <button
              type="button"
              @click="fetchLockers"
              :disabled="loading"
              class="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <span :class="{ 'animate-spin': loading }">🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Metric Stats Cards (Gaya 1 Modern Cards) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Loker -->
        <div class="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm transition hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Kapasitas</span>
            <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
              🗄️
            </div>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{{ stats.total }}</span>
            <span class="text-xs text-slate-500">Unit Loker</span>
          </div>
          <div class="mt-2 text-[11px] text-slate-400">
            Bank Loker Koridor Sarpra
          </div>
        </div>

        <!-- Tersedia (Hijau) -->
        <div
          @click="selectedStatus = selectedStatus === 'tersedia' ? '' : 'tersedia'"
          :class="[
            'cursor-pointer relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-sm transition hover:shadow-md border',
            selectedStatus === 'tersedia'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Tersedia / Kosong
            </span>
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
              🔓
            </div>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{{ stats.tersedia }}</span>
            <span class="text-xs text-emerald-600/70">Pintu</span>
          </div>
          <div class="mt-2 text-[11px] text-emerald-600/80">
            Siap digunakan kapan saja
          </div>
        </div>

        <!-- Terisi (Biru) -->
        <div
          @click="selectedStatus = selectedStatus === 'terisi' ? '' : 'terisi'"
          :class="[
            'cursor-pointer relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-sm transition hover:shadow-md border',
            selectedStatus === 'terisi'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              Sedang Terisi
            </span>
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
              🔒
            </div>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{{ stats.terisi }}</span>
            <span class="text-xs text-blue-600/70">Pintu</span>
          </div>
          <div class="mt-2 text-[11px] text-blue-600/80">
            Ada pemilik & inventaris isi
          </div>
        </div>

        <!-- Perbaikan (Amber) -->
        <div
          @click="selectedStatus = selectedStatus === 'perbaikan' ? '' : 'perbaikan'"
          :class="[
            'cursor-pointer relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-sm transition hover:shadow-md border',
            selectedStatus === 'perbaikan'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          ]"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              Dalam Perbaikan
            </span>
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              ⚠️
            </div>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{{ stats.perbaikan }}</span>
            <span class="text-xs text-amber-600/70">Pintu</span>
          </div>
          <div class="mt-2 text-[11px] text-amber-600/80">
            Kunci / engsel dalam servis
          </div>
        </div>
      </div>

      <!-- Filter & Search Controls -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="relative flex-1">
          <input
            v-model="searchQuery"
            @input="onSearchInput"
            type="text"
            placeholder="Cari nomor loker (#01), nama pemilik, NIS/NIP, keperluan, atau isi di dalamnya..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
          />
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <button
            v-if="searchQuery"
            @click="searchQuery = ''; fetchLockers()"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div class="flex items-center gap-2">
          <!-- Filter Status Dropdown -->
          <select
            v-model="selectedStatus"
            class="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          >
            <option value="">Semua Status (24)</option>
            <option value="tersedia">Hanya Tersedia ({{ stats.tersedia }})</option>
            <option value="terisi">Hanya Terisi ({{ stats.terisi }})</option>
            <option value="perbaikan">Hanya Perbaikan ({{ stats.perbaikan }})</option>
          </select>

          <!-- Reset Filter if active -->
          <button
            v-if="selectedStatus || searchQuery"
            @click="selectedStatus = ''; searchQuery = ''; fetchLockers()"
            class="px-3 py-2.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition"
          >
            Reset Filter
          </button>
        </div>
      </div>

      <!-- VIEW MODE 1: INTERACTIVE PHYSICAL LOCKER CABINET (24 PINTU) -->
      <div v-if="viewMode === 'grid'" class="space-y-4">
        <!-- Cabinet Frame Header -->
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <span class="w-3 h-3 rounded bg-teal-500 inline-block"></span>
            <span>LEMARI LOKER SARPRA BLOK A (KORIDOR UTAMA)</span>
          </div>
          <span class="text-xs text-slate-400">💡 Klik salah satu pintu loker untuk kelola alokasi / isi</span>
        </div>

        <!-- The 24-Door Locker Cabinet Structure -->
        <div class="p-4 sm:p-6 rounded-3xl bg-slate-900 border-4 border-slate-800 shadow-2xl relative">
          <!-- Cabinet top beveled frame badge -->
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold tracking-widest text-slate-300 uppercase shadow-md">
            ★ LOCKER BANK • SMA NUSAPUTERA • 24 DOORS ★
          </div>

          <!-- Locker Doors arranged in 6 columns x 4 rows (or responsive) -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 pt-2">
            <div
              v-for="locker in (selectedStatus || searchQuery ? lockers : allLockers)"
              :key="locker.id"
              @click="openLockerModal(locker)"
              :class="[
                'group relative rounded-2xl p-3.5 sm:p-4 border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[220px]',
                locker.status === 'tersedia'
                  ? 'bg-gradient-to-b from-slate-800/90 via-slate-800/60 to-slate-800/95 border-emerald-500/40 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1'
                  : locker.status === 'terisi'
                  ? 'bg-gradient-to-b from-slate-800/95 via-indigo-950/40 to-slate-800/95 border-blue-500/50 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1'
                  : 'bg-gradient-to-b from-slate-800/90 via-amber-950/30 to-slate-800/95 border-amber-500/40 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1'
              ]"
            >
              <!-- Physical Air Ventilation Slits on Locker Door -->
              <div class="flex justify-center gap-1.5 opacity-40 group-hover:opacity-75 transition-opacity">
                <span class="w-5 h-0.5 bg-slate-400 rounded-full"></span>
                <span class="w-5 h-0.5 bg-slate-400 rounded-full"></span>
                <span class="w-5 h-0.5 bg-slate-400 rounded-full"></span>
              </div>

              <!-- Top section: Locker Number & Key Badge -->
              <div class="mt-2.5 flex items-start justify-between">
                <!-- Locker Door Number Badge -->
                <div class="flex items-center gap-1.5">
                  <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <span class="font-black text-xs text-white tracking-wider">#{{ getDoorNumber(locker.nomor_loker) }}</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-[11px] font-bold text-slate-200">{{ locker.nomor_loker }}</span>
                    <span class="text-[9px] font-mono text-slate-400">🔑 {{ locker.nomor_kunci || 'K-' + getDoorNumber(locker.nomor_loker) }}</span>
                  </div>
                </div>

                <!-- Status Dot Indicator -->
                <div class="flex items-center">
                  <span
                    v-if="locker.status === 'tersedia'"
                    class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse"
                    title="Tersedia"
                  ></span>
                  <span
                    v-else-if="locker.status === 'terisi'"
                    class="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50"
                    title="Terisi"
                  ></span>
                  <span
                    v-else
                    class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"
                    title="Perbaikan"
                  ></span>
                </div>
              </div>

              <!-- Middle section: Content & Owner Info -->
              <div class="my-3 space-y-2 flex-1">
                <!-- Status Badge -->
                <div class="flex items-center gap-1">
                  <span
                    :class="[
                      'text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider',
                      locker.status === 'tersedia'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : locker.status === 'terisi'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    ]"
                  >
                    {{ locker.status === 'tersedia' ? '🔓 Tersedia' : locker.status === 'terisi' ? '🔒 Terisi' : '⚠️ Perbaikan' }}
                  </span>
                </div>

                <!-- If Occupied (Terisi) -->
                <template v-if="locker.status === 'terisi'">
                  <div class="space-y-1">
                    <div class="text-xs font-bold text-white line-clamp-1 group-hover:text-teal-300 transition-colors">
                      {{ locker.nama_pemilik }}
                    </div>
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-300">
                      <span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] font-semibold uppercase border border-slate-700">
                        {{ locker.role_pemilik || 'Siswa' }}
                      </span>
                      <span v-if="locker.nomor_induk" class="text-slate-400 truncate">{{ locker.nomor_induk }}</span>
                    </div>
                  </div>

                  <!-- Keperluan Preview -->
                  <div v-if="locker.keperluan" class="text-[10px] text-slate-300 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80 line-clamp-2">
                    <span class="text-slate-400 font-semibold">Tujuan:</span> {{ locker.keperluan }}
                  </div>

                  <!-- Isi Loker Preview -->
                  <div v-if="locker.isi_loker" class="text-[10px] text-teal-300/90 bg-teal-950/30 p-1.5 rounded-lg border border-teal-800/40 line-clamp-2">
                    <span class="text-teal-400 font-bold">📦 Isi:</span> {{ locker.isi_loker }}
                  </div>
                </template>

                <!-- If Available (Tersedia) -->
                <template v-else-if="locker.status === 'tersedia'">
                  <div class="h-full flex flex-col justify-center items-center text-center p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    <span class="text-xl mb-1 opacity-70 group-hover:scale-110 transition-transform">✨</span>
                    <span class="text-[11px] font-semibold text-slate-300">Siap Dialokasikan</span>
                    <span class="text-[9px] text-teal-400 group-hover:underline mt-0.5">+ Klik untuk Isi</span>
                  </div>
                </template>

                <!-- If Under Maintenance (Perbaikan) -->
                <template v-else>
                  <div class="h-full flex flex-col justify-center items-center text-center p-2 rounded-xl bg-amber-950/20 border border-amber-900/40">
                    <span class="text-xl mb-1">🛠️</span>
                    <span class="text-[11px] font-bold text-amber-300">Dalam Servis</span>
                    <span class="text-[9px] text-amber-400/80 mt-0.5 line-clamp-2">{{ locker.catatan || 'Kunci / engsel rusak' }}</span>
                  </div>
                </template>
              </div>

              <!-- Bottom section: Door Handle & Keyhole Representation -->
              <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                <span class="text-[9px] text-slate-400 truncate max-w-[90px]">
                  {{ locker.tanggal_mulai ? formatDate(locker.tanggal_mulai) : 'Blok A' }}
                </span>

                <!-- Physical metallic door handle icon -->
                <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/80 border border-slate-600 text-slate-300 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                  <span class="text-[9px]">🗝️</span>
                  <span class="text-[9px] font-bold font-mono">HANDLE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW MODE 2: TABULAR DATA VIEW (TABEL LENGKAP) -->
      <div v-else-if="viewMode === 'table'" class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <span>📋 Daftar 24 Unit Lemari Loker</span>
            <span class="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              {{ lockers.length }} Data
            </span>
          </div>
          <span class="text-xs text-slate-400">Klik "Kelola / Isi" untuk alokasikan loker</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th class="py-3 px-4">No. Loker</th>
                <th class="py-3 px-3">Status</th>
                <th class="py-3 px-4">Pemilik & Kontak</th>
                <th class="py-3 px-4">Keperluan</th>
                <th class="py-3 px-4">Rincian Isi Loker</th>
                <th class="py-3 px-3">Periode</th>
                <th class="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr
                v-for="locker in lockers"
                :key="locker.id"
                class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
              >
                <!-- Nomor Loker -->
                <td class="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black">
                      #{{ getDoorNumber(locker.nomor_loker) }}
                    </span>
                    <div>
                      <div class="font-bold">{{ locker.nomor_loker }}</div>
                      <div class="text-[10px] text-slate-400">Kunci: {{ locker.nomor_kunci || '-' }}</div>
                    </div>
                  </div>
                </td>

                <!-- Status -->
                <td class="py-3.5 px-3">
                  <span
                    :class="[
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      locker.status === 'tersedia'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900'
                        : locker.status === 'terisi'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900'
                    ]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="locker.status === 'tersedia' ? 'bg-emerald-500' : locker.status === 'terisi' ? 'bg-blue-500' : 'bg-amber-500'"></span>
                    {{ locker.status }}
                  </span>
                </td>

                <!-- Pemilik & Kontak -->
                <td class="py-3.5 px-4">
                  <template v-if="locker.status === 'terisi' && locker.nama_pemilik">
                    <div class="font-bold text-slate-900 dark:text-white">{{ locker.nama_pemilik }}</div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] uppercase font-semibold">
                        {{ locker.role_pemilik || 'Umum' }}
                      </span>
                      <span v-if="locker.nomor_induk">{{ locker.nomor_induk }}</span>
                    </div>
                    <div v-if="locker.nomor_kontak" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      📞 {{ locker.nomor_kontak }}
                    </div>
                  </template>
                  <template v-else-if="locker.status === 'perbaikan'">
                    <span class="text-amber-600 dark:text-amber-400 font-semibold">Sedang Perbaikan</span>
                  </template>
                  <template v-else>
                    <span class="text-slate-400 italic">Belum ada pemilik (Kosong)</span>
                  </template>
                </td>

                <!-- Keperluan -->
                <td class="py-3.5 px-4 max-w-xs">
                  <div v-if="locker.keperluan" class="text-slate-700 dark:text-slate-200 line-clamp-2">
                    {{ locker.keperluan }}
                  </div>
                  <span v-else class="text-slate-400">-</span>
                </td>

                <!-- Isi Loker -->
                <td class="py-3.5 px-4 max-w-sm">
                  <div v-if="locker.isi_loker" class="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-line line-clamp-3">
                    {{ locker.isi_loker }}
                  </div>
                  <span v-else class="text-slate-400 italic">- Kosong -</span>
                </td>

                <!-- Periode -->
                <td class="py-3.5 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                  <div v-if="locker.tanggal_mulai">
                    <span>Mulai: {{ formatDate(locker.tanggal_mulai) }}</span>
                    <div v-if="locker.tanggal_selesai" class="text-slate-400">
                      S/d: {{ formatDate(locker.tanggal_selesai) }}
                    </div>
                  </div>
                  <span v-else class="text-slate-400">-</span>
                </td>

                <!-- Aksi -->
                <td class="py-3.5 px-4 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      @click="openLockerModal(locker)"
                      class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition"
                      title="Kelola / Isi Loker"
                    >
                      ✏️ Kelola
                    </button>
                    <button
                      v-if="locker.status === 'terisi'"
                      type="button"
                      @click="openSinglePrint(locker)"
                      class="p-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                      title="Cetak Bukti Loker"
                    >
                      🖨️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL KELOLA & ALOKASI LOKER -->
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      >
        <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-teal-600/30">
                #{{ getDoorNumber(form.nomor_loker) }}
              </div>
              <div>
                <h3 class="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Alokasi & Pendataan {{ form.nomor_loker }}</span>
                  <span class="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    🔑 {{ form.nomor_kunci }}
                  </span>
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Catat pemilik, keperluan, dan rincian isi barang di dalam loker.
                </p>
              </div>
            </div>
            <button
              type="button"
              @click="showModal = false"
              class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <!-- Alert Notifications -->
          <div v-if="modalError" class="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{{ modalError }}</span>
          </div>

          <div v-if="modalSuccess" class="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
            <span>✅</span>
            <span>{{ modalSuccess }}</span>
          </div>

          <!-- Form Fields -->
          <form @submit.prevent="submitLocker" class="space-y-4">
            <!-- Status Loker Selector -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Status Loker <span class="text-rose-500">*</span>
              </label>
              <div class="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  @click="form.status = 'tersedia'"
                  :class="[
                    'py-2 px-3 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-1.5',
                    form.status === 'tersedia'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  ]"
                >
                  <span>🔓 Tersedia</span>
                </button>
                <button
                  type="button"
                  @click="form.status = 'terisi'"
                  :class="[
                    'py-2 px-3 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-1.5',
                    form.status === 'terisi'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  ]"
                >
                  <span>🔒 Terisi</span>
                </button>
                <button
                  type="button"
                  @click="form.status = 'perbaikan'"
                  :class="[
                    'py-2 px-3 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-1.5',
                    form.status === 'perbaikan'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/25'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  ]"
                >
                  <span>⚠️ Perbaikan</span>
                </button>
              </div>
            </div>

            <!-- Auto-fill from Registered User Dropdown -->
            <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>👤 Data Pemilik Loker</span>
                </span>
                <span class="text-[10px] text-slate-500">Pilih dari database user atau isi manual</span>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Pilih Cepat Pengguna Terdaftar (Guru / Siswa / Petugas)
                </label>
                <select
                  :value="form.user_id"
                  @change="onSelectUser"
                  class="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  <option :value="null">-- Ketik Pemilik Manual / Tamu --</option>
                  <option v-for="u in usersList" :key="u.id" :value="u.id">
                    {{ u.name }} ({{ u.role }}) {{ u.nomor_induk ? ' - ' + u.nomor_induk : '' }}
                  </option>
                </select>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Nama Lengkap Pemilik <span class="text-rose-500" v-if="form.status === 'terisi'">*</span>
                  </label>
                  <input
                    v-model="form.nama_pemilik"
                    type="text"
                    placeholder="Contoh: Drs. Bambang / Anisa Maharani"
                    class="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Kategori / Role Pemilik
                  </label>
                  <select
                    v-model="form.role_pemilik"
                    class="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="guru">Guru / Pendidik</option>
                    <option value="siswa">Siswa / Siswi</option>
                    <option value="staf">Staf / Karyawan</option>
                    <option value="petugas">Petugas Sarpra</option>
                    <option value="umum">Umum / Tamu</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Nomor Induk (NIS / NIP)
                  </label>
                  <input
                    v-model="form.nomor_induk"
                    type="text"
                    placeholder="Contoh: 197508122000031002"
                    class="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    v-model="form.nomor_kontak"
                    type="text"
                    placeholder="Contoh: 081234567890"
                    class="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
              </div>
            </div>

            <!-- Keperluan Penggunaan -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Keperluan / Tujuan Penggunaan Loker
              </label>
              <input
                v-model="form.keperluan"
                type="text"
                placeholder="Contoh: Penyimpanan Berkas Ujian Tengah Semester & Media Pembelajaran Fisika"
                class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <!-- ISI LOKER (FIELD UTAMA DARI USER REQUEST) -->
            <div class="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 space-y-2.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                  <span>📦 Rincian Isi Loker</span>
                  <span class="text-[10px] font-normal text-teal-600 dark:text-teal-400">(Barang / dokumen di dalamnya)</span>
                </label>
                <span class="text-[10px] text-teal-700 dark:text-teal-400">Gunakan baris baru atau klik chip cepat</span>
              </div>

              <!-- Quick Tag Chips for Items -->
              <div class="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  @click="addTagToIsi('Berkas / Dokumen Soal Ujian')"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition"
                >
                  + Berkas Ujian
                </button>
                <button
                  type="button"
                  @click="addTagToIsi('Laptop / Perangkat Elektronik')"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition"
                >
                  + Laptop / Tablet
                </button>
                <button
                  type="button"
                  @click="addTagToIsi('Modul Ajar & Buku Kurikulum')"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition"
                >
                  + Modul Ajar
                </button>
                <button
                  type="button"
                  @click="addTagToIsi('Alat Praktikum / Toolkit Lab')"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition"
                >
                  + Alat Praktikum
                </button>
                <button
                  type="button"
                  @click="addTagToIsi('Handy Talky (HT) & Baterai')"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition"
                >
                  + HT & Komunikasi
                </button>
                <button
                  type="button"
                  @click="addTagToIsi('Seragam / Rompi Sarpra')"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition"
                >
                  + Seragam / Jas Lab
                </button>
              </div>

              <textarea
                v-model="form.isi_loker"
                rows="3"
                placeholder="Rincikan barang yang disimpan di dalam loker ini, contoh:&#10;1. 2 Unit Multimeter Sanwa&#10;2. Lembar Soal Ujian Tengah Semester Fisika&#10;3. Kabel Adaptor & Modul Praktikum"
                class="w-full px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              ></textarea>
            </div>

            <!-- Periode & Teknis Kunci -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nomor Kunci Fisik
                </label>
                <input
                  v-model="form.nomor_kunci"
                  type="text"
                  placeholder="K-01"
                  class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Tanggal Mulai
                </label>
                <input
                  v-model="form.tanggal_mulai"
                  type="date"
                  class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Tanggal Selesai (Opsional)
                </label>
                <input
                  v-model="form.tanggal_selesai"
                  type="date"
                  class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <!-- Catatan Tambahan -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Catatan Tambahan (Kondisi fisik, lokasi kunci master, dll.)
              </label>
              <input
                v-model="form.catatan"
                type="text"
                placeholder="Contoh: Kunci cadangan dipegang petugas lab sarpra"
                class="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              />
            </div>

            <!-- Modal Action Buttons -->
            <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <!-- Tombol Kosongkan jika terisi -->
              <div>
                <button
                  v-if="form.status === 'terisi' || form.nama_pemilik"
                  type="button"
                  @click="releaseLocker"
                  :disabled="releasing"
                  class="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition flex items-center gap-1.5"
                >
                  <span>🗑️</span>
                  <span>{{ releasing ? 'Mengosongkan...' : 'Kosongkan Loker' }}</span>
                </button>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="showModal = false"
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="modalSubmitting"
                  class="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>💾</span>
                  <span>{{ modalSubmitting ? 'Menyimpan...' : 'Simpan Data Loker' }}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    <!-- END Non-printable Web Page UI -->

    <!-- MODAL PREVIEW DOKUMEN CETAK RESMI (ISOLASI 1 HALAMAN KERTAS) -->
    <div
      v-if="showPrintModal"
      id="print-modal-container"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:static print:block print:w-full print:p-0 print:m-0 print:bg-white print:overflow-visible print-document-container"
    >
      <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto print:static print:block print:w-full print:max-w-none print:p-0 print:m-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible print:bg-white print-document-body">
        <!-- Action Buttons (Hidden when printing) -->
        <div class="print:hidden flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
          <div class="flex items-center gap-2">
            <span class="text-xl">🖨️</span>
            <span class="font-bold text-sm text-slate-900 dark:text-white">
              {{ printType === 'single' ? 'Kartu Tanda Pemilik & Isi Loker' : 'Rekapitulasi 24 Lemari Loker' }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="printDocument"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/25 flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              @click="showPrintModal = false"
              class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- DOKUMEN RESMI (KOP SURAT SMA NUSAPUTERA SEMARANG) -->
        <div class="bg-white text-black p-4 sm:p-6 print:p-0 font-serif leading-relaxed">
          <!-- Kop Surat Resmi -->
          <div class="flex items-center justify-between pb-2 border-b-2 border-black mb-3">
            <div class="w-16 h-16 flex-shrink-0">
              <img src="/images/logo.png" alt="Logo SMA Nusaputera" class="w-full h-full object-contain" />
            </div>
            <div class="text-center flex-1 px-3">
              <div class="text-[10px] font-semibold tracking-widest uppercase">YAYASAN PENDIDIKAN NUSAPUTERA</div>
              <h1 class="text-lg font-black tracking-wider uppercase mt-0.5">SMA NUSAPUTERA SEMARANG</h1>
              <p class="text-[9px] font-sans text-gray-700 mt-0.5 leading-tight">
                Jl. Ki Mangunsarkoro No.59 Semarang Tengah, Telp 024 - 3542444<br />
                Email: sma_nusaputera@yahoo.id / info@smanusaputera.sch.id
              </p>
            </div>
            <div class="w-16 h-16 flex-shrink-0 flex items-center justify-center border border-gray-400 text-[8px] text-gray-500 uppercase text-center p-1 font-sans">
              DOKUMEN<br />SARPRA
            </div>
          </div>

          <!-- KONDISI 1: CETAK KARTU TANDA PEMILIK LOKER TUNGGAL -->
          <template v-if="printType === 'single' && selectedLockerForPrint">
            <div class="text-center mb-3">
              <h2 class="text-xs sm:text-sm font-bold uppercase underline tracking-wide">
                KARTU TANDA PENGGUNA & INVENTARIS LEMARI LOKER
              </h2>
              <p class="text-[10px] font-sans text-gray-600 mt-0.5">
                Nomor Loker: <span class="font-mono font-black text-black">{{ selectedLockerForPrint.nomor_loker }}</span> |
                Kode Kunci: <span class="font-mono font-bold">{{ selectedLockerForPrint.nomor_kunci || '-' }}</span>
              </p>
            </div>

            <!-- Detail Loker & Pemilik -->
            <div class="text-[11px] font-sans space-y-1 mb-3 text-gray-800 bg-gray-50/60 p-3 rounded border border-gray-300">
              <div class="grid grid-cols-3">
                <span class="text-gray-500">Nama Pemilik</span>
                <span class="col-span-2 font-bold">: {{ selectedLockerForPrint.nama_pemilik || '-' }}</span>
              </div>
              <div class="grid grid-cols-3">
                <span class="text-gray-500">Status / Role</span>
                <span class="col-span-2 uppercase font-semibold">: {{ selectedLockerForPrint.role_pemilik || '-' }}</span>
              </div>
              <div class="grid grid-cols-3">
                <span class="text-gray-500">Nomor Induk (NIS/NIP)</span>
                <span class="col-span-2">: {{ selectedLockerForPrint.nomor_induk || '-' }}</span>
              </div>
              <div class="grid grid-cols-3">
                <span class="text-gray-500">Kontak WhatsApp/HP</span>
                <span class="col-span-2">: {{ selectedLockerForPrint.nomor_kontak || '-' }}</span>
              </div>
              <div class="grid grid-cols-3">
                <span class="text-gray-500">Lokasi Penempatan</span>
                <span class="col-span-2">: {{ selectedLockerForPrint.lokasi || 'Koridor Utama Sarpra' }}</span>
              </div>
              <div class="grid grid-cols-3">
                <span class="text-gray-500">Keperluan</span>
                <span class="col-span-2 font-semibold">: {{ selectedLockerForPrint.keperluan || '-' }}</span>
              </div>
              <div class="grid grid-cols-3">
                <span class="text-gray-500">Tanggal Penggunaan</span>
                <span class="col-span-2">: {{ formatDate(selectedLockerForPrint.tanggal_mulai) }} s/d {{ formatDate(selectedLockerForPrint.tanggal_selesai) }}</span>
              </div>
            </div>

            <!-- Rincian Isi Loker -->
            <div class="mb-4">
              <div class="text-[11px] font-bold uppercase mb-1.5 font-sans flex items-center justify-between">
                <span>Rincian Barang / Dokumen di Dalam Loker:</span>
                <span class="text-[9px] text-gray-500 font-normal">Wajib dijaga keutuhannya</span>
              </div>
              <div class="p-3 bg-white border border-gray-300 rounded text-[11px] font-sans whitespace-pre-line leading-relaxed text-gray-900 min-h-[70px]">
                {{ selectedLockerForPrint.isi_loker || 'Tidak ada catatan rincian isi barang.' }}
              </div>
            </div>

            <!-- Tata Tertib Loker -->
            <div class="text-[9px] font-sans text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 mb-4 leading-tight">
              <strong>Ketentuan Penggunaan Lemari Loker:</strong>
              <ol class="list-decimal pl-3.5 mt-0.5 space-y-0.5">
                <li>Kunci loker wajib dijaga oleh pemilik dan dilarang menduplikasi tanpa izin petugas sarpra.</li>
                <li>Dilarang menyimpan benda terlarang, makanan mudah membusuk, atau zat berbahaya.</li>
                <li>Kehilangan kunci loker wajib segera dilaporkan ke bagian sarana dan prasarana sekolah.</li>
              </ol>
            </div>
          </template>

          <!-- KONDISI 2: CETAK REKAPITULASI STATUS 24 LOKER -->
          <template v-else>
            <div class="text-center mb-3">
              <h2 class="text-xs sm:text-sm font-bold uppercase underline tracking-wide">
                REKAPITULASI STATUS & PEMILIK LEMARI LOKER (24 PINTU)
              </h2>
              <p class="text-[10px] font-sans text-gray-600 mt-0.5">
                Bank Loker Koridor Utama Sarpra • Tanggal Cetak: {{ formatDate(new Date().toISOString()) }}
              </p>
            </div>

            <!-- Tabel Rekap 24 Loker -->
            <table class="w-full border-collapse border border-black text-[9px] font-sans mb-3">
              <thead>
                <tr class="bg-gray-100 font-bold uppercase text-center">
                  <th class="border border-black py-1 px-1.5 w-12">No. Loker</th>
                  <th class="border border-black py-1 px-1 w-10">Kunci</th>
                  <th class="border border-black py-1 px-1.5 w-14">Status</th>
                  <th class="border border-black py-1 px-2 text-left">Pemilik & Role</th>
                  <th class="border border-black py-1 px-2 text-left">Keperluan</th>
                  <th class="border border-black py-1 px-2 text-left">Rincian Isi Loker</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in allLockers" :key="l.id">
                  <td class="border border-black py-1 px-1.5 text-center font-bold font-mono">#{{ getDoorNumber(l.nomor_loker) }}</td>
                  <td class="border border-black py-1 px-1 text-center font-mono">{{ l.nomor_kunci || '-' }}</td>
                  <td class="border border-black py-1 px-1.5 text-center uppercase font-bold" :class="l.status === 'tersedia' ? 'text-green-700' : l.status === 'terisi' ? 'text-blue-800' : 'text-amber-700'">
                    {{ l.status }}
                  </td>
                  <td class="border border-black py-1 px-2 font-medium">
                    <span v-if="l.nama_pemilik">{{ l.nama_pemilik }} ({{ l.role_pemilik || '-' }})</span>
                    <span v-else class="text-gray-400 italic">Kosong</span>
                  </td>
                  <td class="border border-black py-1 px-2 text-gray-800">
                    {{ l.keperluan || '-' }}
                  </td>
                  <td class="border border-black py-1 px-2 text-gray-800">
                    {{ l.isi_loker ? l.isi_loker.replace(/\n/g, ', ') : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- Tanda Tangan Resmi Pengesahan -->
          <div class="grid grid-cols-2 text-center text-[10px] font-sans pt-2">
            <div>
              <p>Peminjam / Pemegang Loker,</p>
              <div class="h-14 flex items-end justify-center">
                <span class="font-bold underline">
                  {{ printType === 'single' && selectedLockerForPrint?.nama_pemilik ? selectedLockerForPrint.nama_pemilik : '( ........................................ )' }}
                </span>
              </div>
              <p class="text-[9px] text-gray-500">Pemilik Loker</p>
            </div>
            <div>
              <p>Semarang, {{ formatDate(new Date().toISOString()) }}<br />Petugas Sarana & Prasarana,</p>
              <div class="h-14 flex items-end justify-center">
                <span class="font-bold underline">
                  {{ currentUser?.name || 'Administrator Sarpra' }}
                </span>
              </div>
              <p class="text-[9px] text-gray-500">NIP / ID Petugas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

