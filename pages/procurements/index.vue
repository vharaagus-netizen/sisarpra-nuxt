<script setup>
const { user, isStaff } = useAuth()
const router = useRouter()

// Proteksi halaman: Hanya Staf (Petugas & Admin) yang diizinkan
onMounted(() => {
  if (user.value && !isStaff.value) {
    alert('Akses Ditolak: Halaman Pengadaan Barang hanya dapat diakses oleh Petugas Sarpra atau Admin.')
    router.push('/dashboard')
  }
})

// Tab State: 'sarpra' | 'lab'
const activeTab = ref('sarpra')

// Filter State
const search = ref('')
const filterStatus = ref('all')
const filterLabType = ref('all')
const filterMonth = ref('')

// Fetch Data
const { data: pageData, refresh: fetchProcurements, pending: loading } = await useFetch('/api/procurements', {
  query: computed(() => ({
    jenis_pengadaan: activeTab.value,
    status: filterStatus.value,
    lab_type: activeTab.value === 'lab' ? filterLabType.value : undefined,
    search: search.value || undefined,
    month: filterMonth.value || undefined
  }))
})

const procurements = computed(() => pageData.value?.procurements?.data || [])
const stats = computed(() => pageData.value?.stats || {
  total_semua: 0,
  total_sarpra: 0,
  total_lab: 0,
  menunggu_review: 0,
  disetujui: 0,
  ditolak: 0,
  estimasi_biaya_total: 0,
  estimasi_biaya_disetujui: 0
})

// Modal Form State: Sarpra
const showSarpraModal = ref(false)
const sarpraForm = reactive({
  nama_barang: '',
  kategori: 'Meubeler & Ruangan',
  jumlah: 1,
  satuan: 'unit',
  spesifikasi: '',
  estimasi_biaya: '',
  urgensi: 'sedang',
  alasan_kebutuhan: '',
  lokasi_penempatan: ''
})

const sarpraCategories = [
  'Meubeler & Ruangan',
  'Elektronik & Multimedia',
  'Sarana Olahraga & Seni',
  'Fasilitas Kelas & Kantor',
  'Kebersihan & Sanitasi',
  'Audio & Visual',
  'Perlengkapan Umum'
]

// Modal Form State: Lab
const showLabModal = ref(false)
const labForm = reactive({
  nama_barang: '',
  kategori: 'Alat Praktikum',
  lab_type: 'komputer',
  item_type: 'alat',
  jumlah: 1,
  satuan: 'unit',
  spesifikasi: '',
  estimasi_biaya: '',
  urgensi: 'sedang',
  alasan_kebutuhan: '',
  lokasi_penempatan: ''
})

// Modal Review Admin
const showReviewModal = ref(false)
const selectedProcurement = ref(null)
const reviewForm = reactive({
  status: 'disetujui',
  catatan_admin: ''
})

// Modal Detail & Print Individual
const showDetailModal = ref(false)
const activePrintItem = ref(null)

// Modal Print Rekap
const showPrintRekapModal = ref(false)

// Action Handlers
const submitSarpra = async () => {
  if (!sarpraForm.nama_barang || !sarpraForm.alasan_kebutuhan) {
    alert('Nama barang dan alasan kebutuhan wajib diisi!')
    return
  }
  try {
    const res = await $fetch('/api/procurements/store', {
      method: 'POST',
      body: {
        jenis_pengadaan: 'sarpra',
        nama_barang: sarpraForm.nama_barang,
        kategori: sarpraForm.kategori,
        jumlah: sarpraForm.jumlah,
        satuan: sarpraForm.satuan,
        spesifikasi: sarpraForm.spesifikasi,
        estimasi_biaya: sarpraForm.estimasi_biaya ? Number(sarpraForm.estimasi_biaya) : null,
        urgensi: sarpraForm.urgensi,
        alasan_kebutuhan: sarpraForm.alasan_kebutuhan,
        lokasi_penempatan: sarpraForm.lokasi_penempatan
      }
    })
    showSarpraModal.value = false
    // Reset Form
    sarpraForm.nama_barang = ''
    sarpraForm.spesifikasi = ''
    sarpraForm.jumlah = 1
    sarpraForm.estimasi_biaya = ''
    sarpraForm.urgensi = 'sedang'
    sarpraForm.alasan_kebutuhan = ''
    sarpraForm.lokasi_penempatan = ''

    await fetchProcurements()
    alert(res.message || 'Usulan pengadaan sarana berhasil diajukan!')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal mengajukan usulan sarana.')
  }
}

const submitLab = async () => {
  if (!labForm.nama_barang || !labForm.alasan_kebutuhan) {
    alert('Nama alat/bahan dan alasan kebutuhan wajib diisi!')
    return
  }
  try {
    const res = await $fetch('/api/procurements/store', {
      method: 'POST',
      body: {
        jenis_pengadaan: 'lab',
        nama_barang: labForm.nama_barang,
        kategori: labForm.item_type === 'bahan_habis_pakai' ? 'Bahan Habis Pakai' : 'Alat Praktikum',
        lab_type: labForm.lab_type,
        item_type: labForm.item_type,
        jumlah: labForm.jumlah,
        satuan: labForm.satuan,
        spesifikasi: labForm.spesifikasi,
        estimasi_biaya: labForm.estimasi_biaya ? Number(labForm.estimasi_biaya) : null,
        urgensi: labForm.urgensi,
        alasan_kebutuhan: labForm.alasan_kebutuhan,
        lokasi_penempatan: labForm.lokasi_penempatan
      }
    })
    showLabModal.value = false
    // Reset Form
    labForm.nama_barang = ''
    labForm.spesifikasi = ''
    labForm.jumlah = 1
    labForm.satuan = 'unit'
    labForm.estimasi_biaya = ''
    labForm.urgensi = 'sedang'
    labForm.alasan_kebutuhan = ''
    labForm.lokasi_penempatan = ''

    await fetchProcurements()
    alert(res.message || 'Usulan pengadaan lab berhasil diajukan!')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal mengajukan usulan lab.')
  }
}

const openReview = (p) => {
  selectedProcurement.value = p
  reviewForm.status = p.status === 'menunggu_review' ? 'disetujui' : p.status
  reviewForm.catatan_admin = p.catatan_admin || ''
  showReviewModal.value = true
}

const submitReview = async () => {
  if (!selectedProcurement.value) return
  try {
    const res = await $fetch('/api/procurements/review', {
      method: 'POST',
      body: {
        id: selectedProcurement.value.id,
        status: reviewForm.status,
        catatan_admin: reviewForm.catatan_admin
      }
    })
    showReviewModal.value = false
    await fetchProcurements()
    alert(res.message || 'Status usulan pengadaan berhasil diperbarui!')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal memperbarui status usulan.')
  }
}

const deleteProcurement = async (p) => {
  if (!confirm(`Hapus usulan pengadaan "${p.nama_barang}" (${p.nomor_pengajuan || 'Draft'})?`)) return
  try {
    const res = await $fetch('/api/procurements/delete', {
      method: 'POST',
      body: { id: p.id }
    })
    await fetchProcurements()
    alert(res.message || 'Data usulan pengadaan berhasil dihapus.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menghapus pengadaan.')
  }
}

const openDetail = (p) => {
  activePrintItem.value = p
  showDetailModal.value = true
}

const triggerPrint = () => {
  window.print()
}

// Helpers
const getStatusBadge = (status) => {
  switch (status) {
    case 'disetujui':
      return { label: 'Disetujui', class: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
    case 'dianggarkan':
      return { label: 'Dianggarkan', class: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' }
    case 'terealisasi':
      return { label: 'Terealisasi', class: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' }
    case 'ditolak':
      return { label: 'Ditolak', class: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' }
    default:
      return { label: 'Menunggu Review', class: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
  }
}

const getUrgensiBadge = (urgensi) => {
  switch (urgensi) {
    case 'mendesak':
      return 'text-rose-700 dark:text-rose-400 font-black'
    case 'tinggi':
      return 'text-amber-700 dark:text-amber-400 font-bold'
    case 'rendah':
      return 'text-slate-500 dark:text-slate-400'
    default:
      return 'text-blue-600 dark:text-blue-400 font-medium'
  }
}

const getLabTypeLabel = (lt) => {
  switch (lt) {
    case 'komputer': return 'Lab Komputer'
    case 'kimia': return 'Lab Kimia'
    case 'fisika': return 'Lab Fisika'
    case 'biologi': return 'Lab Biologi'
    default: return 'Laboratorium'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Area Screen View -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Staff Only • Petugas & Admin
          </span>
          <span class="text-xs text-slate-400">• Bebas File Foto</span>
        </div>
        <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Pengadaan Barang (Sarpra & Lab)
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Pencatatan usulan pembelian sarana prasarana umum dan laboratorium SMA Nusaputera secara terpisah.
        </p>
      </div>

      <!-- Action Buttons Header -->
      <div class="flex items-center gap-2.5">
        <button
          type="button"
          @click="showPrintRekapModal = true"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all"
        >
          <span>🖨️</span>
          <span>Cetak Rekapitulasi</span>
        </button>

        <button
          v-if="activeTab === 'sarpra'"
          type="button"
          @click="showSarpraModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-md shadow-orange-600/25 transition-all"
        >
          <span>➕</span>
          <span>Ajukan Pengadaan Sarpra</span>
        </button>

        <button
          v-else
          type="button"
          @click="showLabModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md shadow-teal-600/25 transition-all"
        >
          <span>🔬</span>
          <span>Ajukan Pengadaan Lab</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tabs (Sarpra vs Lab) -->
    <div class="flex items-center gap-2 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl print:hidden">
      <button
        type="button"
        @click="activeTab = 'sarpra'"
        :class="[
          'flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all',
          activeTab === 'sarpra'
            ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <span class="text-base">🏢</span>
        <span>Pengadaan Sarpra Umum</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300">
          {{ stats.total_sarpra }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'lab'"
        :class="[
          'flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all',
          activeTab === 'lab'
            ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <span class="text-base">🔬</span>
        <span>Pengadaan Laboratorium (IPA & Komputer)</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300">
          {{ stats.total_lab }}
        </span>
      </button>
    </div>

    <!-- Statistik Ringkas -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {{ activeTab === 'sarpra' ? 'Total Usulan Sarpra' : 'Total Usulan Lab' }}
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-white mt-1">
          {{ activeTab === 'sarpra' ? stats.total_sarpra : stats.total_lab }} <span class="text-xs font-normal text-slate-400">item</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-1">
          Semua periode tercatat
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div class="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
          Menunggu Review
        </div>
        <div class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
          {{ stats.menunggu_review }} <span class="text-xs font-normal text-slate-400">usulan</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-1">
          Perlu tinjauan Super Admin
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Usulan Disetujui
        </div>
        <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
          {{ stats.disetujui }} <span class="text-xs font-normal text-slate-400">item</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-1">
          Disetujui / Dianggarkan / Terealisasi
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          Estimasi Nilai Disetujui
        </div>
        <div class="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 truncate">
          {{ formatRupiah(stats.estimasi_biaya_disetujui) }}
        </div>
        <div class="text-[10px] text-slate-400 mt-1 truncate">
          Total Pengajuan: {{ formatRupiah(stats.estimasi_biaya_total) }}
        </div>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3 print:hidden">
      <div class="flex-1 w-full relative">
        <input
          v-model="search"
          type="text"
          placeholder="Cari nama barang, no. pengajuan, merk, atau lokasi..."
          class="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
        <span class="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
      </div>

      <!-- Filter Lab Type jika di Tab Lab -->
      <select
        v-if="activeTab === 'lab'"
        v-model="filterLabType"
        class="w-full md:w-44 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
      >
        <option value="all">Semua Jenis Lab</option>
        <option value="komputer">Lab Komputer</option>
        <option value="kimia">Lab Kimia</option>
        <option value="fisika">Lab Fisika</option>
        <option value="biologi">Lab Biologi</option>
      </select>

      <!-- Filter Status -->
      <select
        v-model="filterStatus"
        class="w-full md:w-44 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
      >
        <option value="all">Semua Status</option>
        <option value="menunggu_review">Menunggu Review</option>
        <option value="disetujui">Disetujui</option>
        <option value="dianggarkan">Dianggarkan</option>
        <option value="terealisasi">Terealisasi</option>
        <option value="ditolak">Ditolak</option>
      </select>

      <!-- Filter Bulan -->
      <input
        v-model="filterMonth"
        type="month"
        class="w-full md:w-40 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
        title="Filter Periode Bulan"
      />

      <button
        type="button"
        @click="fetchProcurements"
        class="w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
      >
        🔄 Segarkan
      </button>
    </div>

    <!-- Tabel Data Pengadaan Screen View -->
    <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="py-3.5 px-4">No. Pengajuan & Tgl</th>
              <th class="py-3.5 px-4">
                {{ activeTab === 'sarpra' ? 'Nama Barang & Kategori' : 'Nama Alat/Bahan & Lab' }}
              </th>
              <th class="py-3.5 px-4">Jml & Satuan</th>
              <th class="py-3.5 px-4">Lokasi & Spek</th>
              <th class="py-3.5 px-4">Estimasi Biaya</th>
              <th class="py-3.5 px-4">Urgensi & Pemohon</th>
              <th class="py-3.5 px-4">Status</th>
              <th class="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="8" class="py-8 text-center text-slate-400">
                Memuat data pengadaan barang...
              </td>
            </tr>

            <tr v-else-if="procurements.length === 0">
              <td colspan="8" class="py-12 text-center text-slate-400">
                <div class="text-3xl mb-2">{{ activeTab === 'sarpra' ? '🏢' : '🔬' }}</div>
                <div class="font-bold text-slate-600 dark:text-slate-300">
                  Belum ada usulan pengadaan {{ activeTab === 'sarpra' ? 'Sarpra' : 'Laboratorium' }}
                </div>
                <div class="text-[11px] text-slate-400 mt-1">
                  Klik tombol tambah di atas untuk mengajukan usulan baru.
                </div>
              </td>
            </tr>

            <tr
              v-else
              v-for="p in procurements"
              :key="p.id"
              class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              <!-- No Pengajuan & Tanggal -->
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="font-mono font-bold text-slate-900 dark:text-white">
                  {{ p.nomor_pengajuan || `PGD-${p.id}` }}
                </div>
                <div class="text-[10px] text-slate-400">
                  {{ formatDate(p.created_at) }}
                </div>
              </td>

              <!-- Nama Barang -->
              <td class="py-3 px-4">
                <div class="font-bold text-slate-900 dark:text-white">
                  {{ p.nama_barang }}
                </div>
                <div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span v-if="p.jenis_pengadaan === 'lab'" class="px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 font-bold uppercase text-[9px]">
                    {{ getLabTypeLabel(p.lab_type) }}
                  </span>
                  <span>{{ p.kategori }}</span>
                  <span v-if="p.item_type" class="text-slate-300">• {{ p.item_type === 'bahan_habis_pakai' ? 'Bahan Habis Pakai' : 'Alat' }}</span>
                </div>
              </td>

              <!-- Jml & Satuan -->
              <td class="py-3 px-4 whitespace-nowrap">
                <span class="font-bold text-slate-900 dark:text-white">{{ p.jumlah }}</span>
                <span class="text-slate-500 ml-1">{{ p.satuan || 'unit' }}</span>
              </td>

              <!-- Lokasi & Spek -->
              <td class="py-3 px-4 max-w-xs">
                <div class="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {{ p.lokasi_penempatan || '-' }}
                </div>
                <div class="text-[10px] text-slate-400 truncate" :title="p.spesifikasi">
                  {{ p.spesifikasi || p.alasan_kebutuhan }}
                </div>
              </td>

              <!-- Estimasi Biaya -->
              <td class="py-3 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                {{ formatRupiah(p.estimasi_biaya) }}
              </td>

              <!-- Urgensi & Pemohon -->
              <td class="py-3 px-4 whitespace-nowrap">
                <div :class="['text-[11px] uppercase tracking-wider', getUrgensiBadge(p.urgensi)]">
                  {{ p.urgensi }}
                </div>
                <div class="text-[10px] text-slate-400">
                  Oleh: {{ p.user?.name || 'Petugas' }}
                </div>
              </td>

              <!-- Status -->
              <td class="py-3 px-4 whitespace-nowrap">
                <span :class="['px-2.5 py-1 rounded-full text-[10px] font-bold border', getStatusBadge(p.status).class]">
                  {{ getStatusBadge(p.status).label }}
                </span>
                <div v-if="p.reviewer" class="text-[9px] text-slate-400 mt-1">
                  Rev: {{ p.reviewer.name }}
                </div>
              </td>

              <!-- Aksi -->
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Detail & Cetak Lembar Individual -->
                  <button
                    type="button"
                    @click="openDetail(p)"
                    class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Lihat Detail & Cetak Form Pengajuan"
                  >
                    📄
                  </button>

                  <!-- Review (Admin Only) -->
                  <button
                    v-if="user?.role === 'admin'"
                    type="button"
                    @click="openReview(p)"
                    class="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
                    title="Review & Ubah Status Pengadaan"
                  >
                    ⚖️ Review
                  </button>

                  <!-- Delete -->
                  <button
                    v-if="user?.role === 'admin' || (p.status === 'menunggu_review' && String(p.user_id) === String(user?.id))"
                    type="button"
                    @click="deleteProcurement(p)"
                    class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Hapus Usulan"
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

    <!-- MODAL 1: Form Pengadaan Sarpra (Umum) -->
    <div
      v-if="showSarpraModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🏢</span>
              <span>Ajukan Pengadaan Sarana & Prasarana</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Formulir usulan sarana umum sekolah (tanpa unggah file/foto).
            </p>
          </div>
          <button
            type="button"
            @click="showSarpraModal = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="submitSarpra" class="space-y-4 mt-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Barang / Sarana <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="sarpraForm.nama_barang"
              type="text"
              required
              placeholder="Contoh: Proyektor Epson EB-X500, AC Daikin 1.5 PK, Meja Guru..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Sarana
              </label>
              <select
                v-model="sarpraForm.kategori"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option v-for="cat in sarpraCategories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah
                </label>
                <input
                  v-model.number="sarpraForm.jumlah"
                  type="number"
                  min="1"
                  required
                  class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Satuan
                </label>
                <input
                  v-model="sarpraForm.satuan"
                  type="text"
                  placeholder="unit / buah / set"
                  class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ruang / Lokasi Penempatan
              </label>
              <input
                v-model="sarpraForm.lokasi_penempatan"
                type="text"
                placeholder="Contoh: Ruang Kelas X-A, Aula SMA, Kantor..."
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estimasi Total Biaya (Rp)
              </label>
              <input
                v-model.number="sarpraForm.estimasi_biaya"
                type="number"
                placeholder="Contoh: 8500000"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
              <div v-if="sarpraForm.estimasi_biaya" class="text-[10px] text-orange-600 font-bold mt-1">
                {{ formatRupiah(sarpraForm.estimasi_biaya) }}
              </div>
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Spesifikasi / Merk / Keterangan Teknis
            </label>
            <input
              v-model="sarpraForm.spesifikasi"
              type="text"
              placeholder="Contoh: Merk Daikin Inverter FTKQ35, Pipa 5 meter, Braket..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tingkat Urgensi
            </label>
            <div class="grid grid-cols-4 gap-2">
              <label
                v-for="u in ['rendah', 'sedang', 'tinggi', 'mendesak']"
                :key="u"
                :class="[
                  'py-2 px-1 text-center rounded-xl cursor-pointer uppercase font-bold text-[10px] border transition-all',
                  sarpraForm.urgensi === u
                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                ]"
              >
                <input type="radio" v-model="sarpraForm.urgensi" :value="u" class="hidden" />
                {{ u }}
              </label>
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Kebutuhan / Justifikasi <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="sarpraForm.alasan_kebutuhan"
              required
              rows="3"
              placeholder="Jelaskan secara singkat mengapa sarana ini dibutuhkan (misal: AC lama rusak berat dan tidak dapat diperbaiki)..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
            ></textarea>
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showSarpraModal = false"
              class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold shadow-md shadow-orange-600/30"
            >
              Kirim Usulan Sarpra
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: Form Pengadaan Lab (IPA & Komputer) -->
    <div
      v-if="showLabModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🔬</span>
              <span>Ajukan Pengadaan Laboratorium</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Formulir usulan alat praktikum & bahan kimia/habis pakai laboratorium.
            </p>
          </div>
          <button
            type="button"
            @click="showLabModal = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="submitLab" class="space-y-4 mt-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Alat / Bahan Laboratorium <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="labForm.nama_barang"
              type="text"
              required
              placeholder="Contoh: Asam Sulfat H2SO4, Kabel UTP Cat6, Mikroskop Binokuler..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Laboratorium Tujuan
              </label>
              <select
                v-model="labForm.lab_type"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              >
                <option value="komputer">💻 Lab Komputer / Multimedia</option>
                <option value="kimia">🧪 Lab Kimia</option>
                <option value="fisika">⚡ Lab Fisika</option>
                <option value="biologi">🌱 Lab Biologi</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sifat Barang
              </label>
              <select
                v-model="labForm.item_type"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="alat">Alat Praktikum (Aset/Permanen)</option>
                <option value="bahan_habis_pakai">Bahan Habis Pakai (Zat/Kabel/Reagen)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah
              </label>
              <input
                v-model.number="labForm.jumlah"
                type="number"
                min="1"
                required
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Satuan
              </label>
              <input
                v-model="labForm.satuan"
                type="text"
                placeholder="botol / pack / kit / pcs"
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lokasi Simpan
              </label>
              <input
                v-model="labForm.lokasi_penempatan"
                type="text"
                placeholder="Lemari Asam / Rak B"
                class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Spesifikasi Teknis / Merk / Tingkat Kemurnian
            </label>
            <textarea
              v-model="labForm.spesifikasi"
              rows="2"
              placeholder="Contoh: Grade Pro Analisis (PA), 1 Liter/botol, Merk Merck KGaA..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estimasi Total Biaya (Rp)
              </label>
              <input
                v-model.number="labForm.estimasi_biaya"
                type="number"
                placeholder="Contoh: 1500000"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
              <div v-if="labForm.estimasi_biaya" class="text-[10px] text-teal-600 font-bold mt-1">
                {{ formatRupiah(labForm.estimasi_biaya) }}
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tingkat Urgensi
              </label>
              <select
                v-model="labForm.urgensi"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase font-bold"
              >
                <option value="rendah">Rendah</option>
                <option value="sedang">Sedang</option>
                <option value="tinggi">Tinggi</option>
                <option value="mendesak">Mendesak</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Kebutuhan Praktikum <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="labForm.alasan_kebutuhan"
              required
              rows="3"
              placeholder="Contoh: Stok asam klorida habis untuk praktikum ujian sekolah kelas XII..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
            ></textarea>
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showLabModal = false"
              class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold shadow-md shadow-teal-600/30"
            >
              Kirim Usulan Lab
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 3: Review / Ubah Status (Khusus Super Admin) -->
    <div
      v-if="showReviewModal && selectedProcurement"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 class="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>⚖️</span>
              <span>Tinjau Usulan Pengadaan</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {{ selectedProcurement.nomor_pengajuan }} • {{ selectedProcurement.nama_barang }}
            </p>
          </div>
          <button
            type="button"
            @click="showReviewModal = false"
            class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="submitReview" class="space-y-4 mt-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Status Persetujuan
            </label>
            <select
              v-model="reviewForm.status"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
            >
              <option value="menunggu_review">⏳ Menunggu Review</option>
              <option value="disetujui">✅ Disetujui (Rencana Beli)</option>
              <option value="dianggarkan">💰 Dianggarkan (Masuk RAPBS)</option>
              <option value="terealisasi">📦 Terealisasi (Barang Sudah Diterima)</option>
              <option value="ditolak">❌ Ditolak</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Admin / Alasan Keputusan
            </label>
            <textarea
              v-model="reviewForm.catatan_admin"
              rows="3"
              placeholder="Catatan persetujuan, vendor pembelian, atau alasan penolakan..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
            ></textarea>
          </div>

          <!-- Info Otomatis Masuk Inventaris saat Terealisasi -->
          <div
            v-if="reviewForm.status === 'terealisasi'"
            class="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-800 dark:text-purple-300 flex items-start gap-2 animate-fade-in"
          >
            <span class="text-base leading-none">📦</span>
            <div>
              <div class="font-bold">Otomatis Masuk Inventaris:</div>
              <p class="mt-0.5 leading-snug">
                Barang ini akan otomatis ditambahkan ke
                <strong>{{ selectedProcurement.jenis_pengadaan === 'lab' ? 'Inventaris Lab' : 'Master Barang & Aset' }}</strong>
                dengan stok {{ selectedProcurement.jumlah }} {{ selectedProcurement.satuan || 'unit' }} dan kode inventaris resmi!
              </p>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showReviewModal = false"
              class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/30"
            >
              Simpan Keputusan
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 4: Detail & Lembar Pengusulan Cetak Individual -->
    <div
      v-if="showDetailModal && activePrintItem"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0"
    >
      <div class="bg-white dark:bg-slate-900 print:dark:bg-white print:text-black border border-slate-200 dark:border-slate-800 print:border-none rounded-3xl print:rounded-none max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible">
        <!-- Close & Print Bar (Hidden on print) -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <span>📄</span>
            <span>Lembar Formulir Pengajuan Barang</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="triggerPrint"
              class="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Cetak Dokumen</span>
            </button>
            <button
              type="button"
              @click="showDetailModal = false"
              class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- PRINTABLE CONTENT CONTAINER -->
        <div class="mt-4 print:mt-0 text-slate-800 dark:text-slate-200 print:text-black text-xs leading-normal">
          <!-- Kop Surat Resmi -->
          <div class="text-center pb-3 border-b-2 border-black flex items-center justify-between gap-4">
            <div class="w-16 h-16 shrink-0 flex items-center justify-center">
              <img src="/images/logo.png" alt="Logo SMA" class="w-14 h-14 object-contain" />
            </div>
            <div class="flex-1 text-center">
              <div class="text-[11px] font-bold tracking-wider uppercase text-slate-600 print:text-black">
                YAYASAN PENDIDIKAN NUSAPUTERA
              </div>
              <div class="text-base font-black uppercase tracking-tight text-slate-900 print:text-black">
                SMA NUSAPUTERA SEMARANG
              </div>
              <div class="text-[10px] text-slate-500 print:text-black">
                Jl. Sompok No. 13, Lamper Lor, Kec. Semarang Selatan, Kota Semarang, Jawa Tengah 50249
              </div>
              <div class="text-[9px] text-slate-400 print:text-black">
                Website: nusaputera.sch.id • Sistem Informasi Sarana & Prasarana (SISARPRA)
              </div>
            </div>
            <div class="w-16 h-16 shrink-0 flex items-center justify-center">
              <img src="/images/logo.png" alt="Logo" class="w-14 h-14 object-contain opacity-0 print:hidden" />
            </div>
          </div>

          <!-- Judul Dokumen -->
          <div class="text-center my-4">
            <h2 class="text-sm font-black uppercase tracking-wide underline underline-offset-4 text-slate-900 print:text-black">
              SURAT USULAN PENGADAAN {{ activePrintItem.jenis_pengadaan === 'lab' ? 'LABORATORIUM' : 'SARANA PRASARANA' }}
            </h2>
            <div class="text-[11px] font-mono mt-1 text-slate-600 print:text-black">
              Nomor: {{ activePrintItem.nomor_pengajuan || `PGD-${activePrintItem.id}` }}
            </div>
          </div>

          <!-- Rincian Pengajuan -->
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 print:bg-transparent border border-slate-200 dark:border-slate-700 print:border-black space-y-2 mb-4">
            <div class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Tanggal Usulan:</div>
              <div class="col-span-2 font-bold">{{ formatDate(activePrintItem.created_at) }}</div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Petugas Pemohon:</div>
              <div class="col-span-2 font-bold">{{ activePrintItem.user?.name }} ({{ activePrintItem.user?.role }})</div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Jenis Pengadaan:</div>
              <div class="col-span-2 font-bold uppercase">
                {{ activePrintItem.jenis_pengadaan === 'lab' ? `Laboratorium (${getLabTypeLabel(activePrintItem.lab_type)})` : 'Sarana Prasarana Umum' }}
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Nama Barang/Alat:</div>
              <div class="col-span-2 font-extrabold text-sm">{{ activePrintItem.nama_barang }}</div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Kategori / Tipe:</div>
              <div class="col-span-2">{{ activePrintItem.kategori }} {{ activePrintItem.item_type ? `(${activePrintItem.item_type})` : '' }}</div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Jumlah Kebutuhan:</div>
              <div class="col-span-2 font-bold">{{ activePrintItem.jumlah }} {{ activePrintItem.satuan || 'unit' }}</div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Estimasi Total Biaya:</div>
              <div class="col-span-2 font-extrabold text-slate-900 print:text-black">
                {{ formatRupiah(activePrintItem.estimasi_biaya) }}
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Lokasi Penempatan:</div>
              <div class="col-span-2">{{ activePrintItem.lokasi_penempatan || '-' }}</div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Tingkat Urgensi:</div>
              <div class="col-span-2 font-bold uppercase">{{ activePrintItem.urgensi }}</div>
            </div>
            <div v-if="activePrintItem.spesifikasi" class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Spesifikasi Teknis:</div>
              <div class="col-span-2">{{ activePrintItem.spesifikasi }}</div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="text-slate-500 print:text-black font-semibold">Alasan Kebutuhan:</div>
              <div class="col-span-2">{{ activePrintItem.alasan_kebutuhan }}</div>
            </div>
          </div>

          <!-- Status & Catatan Persetujuan -->
          <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-700 print:border-black mb-6">
            <div class="font-bold mb-1 flex items-center justify-between">
              <span>STATUS TINJAUAN ADMIN:</span>
              <span class="uppercase font-black">{{ activePrintItem.status }}</span>
            </div>
            <div class="text-[11px] text-slate-600 print:text-black">
              Catatan Admin: {{ activePrintItem.catatan_admin || 'Belum ada catatan khusus.' }}
            </div>
            <div v-if="activePrintItem.reviewer" class="text-[10px] text-slate-400 print:text-black mt-1">
              Ditinjau oleh: {{ activePrintItem.reviewer.name }} pada {{ formatDate(activePrintItem.reviewed_at) }}
            </div>
          </div>

          <!-- 3 Kolom Tanda Tangan Resmi -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-700 print:border-black">
            <div class="text-right text-[10px] text-slate-500 print:text-black mb-4">
              Semarang, {{ formatDate(new Date()) }}
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-[11px]">
              <!-- Pemohon -->
              <div>
                <div class="font-semibold text-slate-600 print:text-black">Pemohon / Pengaju</div>
                <div class="h-16 flex items-center justify-center italic text-slate-400 print:text-black/50 text-[10px]">
                  (Tanda Tangan)
                </div>
                <div class="font-bold underline">{{ activePrintItem.user?.name || 'Petugas' }}</div>
                <div class="text-[9px] text-slate-500 print:text-black">Petugas Sarpra / Laboran</div>
              </div>

              <!-- Mengetahui Waka Sarpras -->
              <div>
                <div class="font-semibold text-slate-600 print:text-black">Mengetahui</div>
                <div class="h-16 flex items-center justify-center italic text-slate-400 print:text-black/50 text-[10px]">
                  (Tanda Tangan)
                </div>
                <div class="font-bold underline">Waka Sarana Prasarana</div>
                <div class="text-[9px] text-slate-500 print:text-black">SMA Nusaputera Semarang</div>
              </div>

              <!-- Menyetujui Kepala Sekolah / Super Admin -->
              <div>
                <div class="font-semibold text-slate-600 print:text-black">Menyetujui</div>
                <div class="h-16 flex items-center justify-center italic text-slate-400 print:text-black/50 text-[10px]">
                  (Tanda Tangan)
                </div>
                <div class="font-bold underline">{{ activePrintItem.reviewer?.name || 'Kepala Sekolah' }}</div>
                <div class="text-[9px] text-slate-500 print:text-black">Kepala SMA Nusaputera</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 5: Cetak Rekapitulasi Laporan (Bulanan/Tahunan) -->
    <div
      v-if="showPrintRekapModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0"
    >
      <div class="bg-white dark:bg-slate-900 print:dark:bg-white print:text-black border border-slate-200 dark:border-slate-800 print:border-none rounded-3xl print:rounded-none max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible">
        <!-- Close & Print Bar -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <span>🖨️</span>
            <span>Rekapitulasi Dokumen Laporan Pengadaan</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="triggerPrint"
              class="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Cetak Laporan (Print)</span>
            </button>
            <button
              type="button"
              @click="showPrintRekapModal = false"
              class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- REKAPITULASI PRINTABLE CONTAINER -->
        <div class="mt-4 print:mt-0 text-slate-800 dark:text-slate-200 print:text-black text-xs">
          <!-- Kop Surat Resmi -->
          <div class="text-center pb-3 border-b-2 border-black flex items-center justify-between gap-4">
            <div class="w-16 h-16 shrink-0 flex items-center justify-center">
              <img src="/images/logo.png" alt="Logo SMA" class="w-14 h-14 object-contain" />
            </div>
            <div class="flex-1 text-center">
              <div class="text-[11px] font-bold tracking-wider uppercase text-slate-600 print:text-black">
                YAYASAN PENDIDIKAN NUSAPUTERA
              </div>
              <div class="text-base font-black uppercase tracking-tight text-slate-900 print:text-black">
                SMA NUSAPUTERA SEMARANG
              </div>
              <div class="text-[10px] text-slate-500 print:text-black">
                Jl. Sompok No. 13, Lamper Lor, Kec. Semarang Selatan, Kota Semarang, Jawa Tengah 50249
              </div>
              <div class="text-[9px] text-slate-400 print:text-black">
                LAPORAN REKAPITULASI USULAN PENGADAAN SARANA PRASARANA & LABORATORIUM
              </div>
            </div>
            <div class="w-16 h-16 shrink-0 flex items-center justify-center">
              <img src="/images/logo.png" alt="Logo" class="w-14 h-14 object-contain opacity-0 print:hidden" />
            </div>
          </div>

          <!-- Periode & Filter Info -->
          <div class="my-4 flex items-center justify-between text-[11px]">
            <div>
              <strong>Kategori:</strong> {{ activeTab === 'sarpra' ? 'Sarana Prasarana Umum' : 'Laboratorium' }}
            </div>
            <div>
              <strong>Periode Cetak:</strong> {{ filterMonth ? `Bulan ${filterMonth}` : 'Semua Periode' }}
            </div>
            <div>
              <strong>Total Usulan:</strong> {{ procurements.length }} item
            </div>
          </div>

          <!-- Tabel Rekapitulasi -->
          <table class="w-full text-left border-collapse border border-black text-[10px] mb-4">
            <thead>
              <tr class="bg-slate-100 print:bg-slate-200 text-black">
                <th class="border border-black p-1.5 text-center w-8">No</th>
                <th class="border border-black p-1.5">No. Pengajuan</th>
                <th class="border border-black p-1.5">Nama Barang / Alat</th>
                <th class="border border-black p-1.5">Kategori / Lab</th>
                <th class="border border-black p-1.5 text-center">Jml</th>
                <th class="border border-black p-1.5">Lokasi</th>
                <th class="border border-black p-1.5 text-right">Estimasi Biaya</th>
                <th class="border border-black p-1.5 text-center">Urgensi</th>
                <th class="border border-black p-1.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, idx) in procurements" :key="p.id">
                <td class="border border-black p-1.5 text-center">{{ idx + 1 }}</td>
                <td class="border border-black p-1.5 font-mono">{{ p.nomor_pengajuan || `PGD-${p.id}` }}</td>
                <td class="border border-black p-1.5 font-bold">{{ p.nama_barang }}</td>
                <td class="border border-black p-1.5">
                  {{ p.jenis_pengadaan === 'lab' ? getLabTypeLabel(p.lab_type) : p.kategori }}
                </td>
                <td class="border border-black p-1.5 text-center">{{ p.jumlah }} {{ p.satuan || 'unit' }}</td>
                <td class="border border-black p-1.5">{{ p.lokasi_penempatan || '-' }}</td>
                <td class="border border-black p-1.5 text-right font-mono font-bold">{{ formatRupiah(p.estimasi_biaya) }}</td>
                <td class="border border-black p-1.5 text-center uppercase">{{ p.urgensi }}</td>
                <td class="border border-black p-1.5 text-center uppercase font-bold">{{ p.status }}</td>
              </tr>

              <tr v-if="procurements.length === 0">
                <td colspan="9" class="border border-black p-3 text-center italic">
                  Tidak ada data usulan pengadaan pada filter ini.
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-slate-100 print:bg-slate-200 font-bold text-black">
                <td colspan="6" class="border border-black p-1.5 text-right uppercase">
                  Total Estimasi Anggaran:
                </td>
                <td class="border border-black p-1.5 text-right font-mono">
                  {{ formatRupiah(procurements.reduce((acc, p) => acc + (p.estimasi_biaya ? Number(p.estimasi_biaya) : 0), 0)) }}
                </td>
                <td colspan="2" class="border border-black p-1.5"></td>
              </tr>
            </tfoot>
          </table>

          <!-- 2 Kolom Tanda Tangan Rekap -->
          <div class="pt-4 grid grid-cols-2 gap-4 text-center text-[11px]">
            <div>
              <div class="text-slate-600 print:text-black">Petugas Bagian Sarana & Prasarana</div>
              <div class="h-16 flex items-center justify-center italic text-slate-400 print:text-black/50 text-[10px]">
                (Tanda Tangan)
              </div>
              <div class="font-bold underline">{{ user?.name || 'Petugas Sarpras' }}</div>
              <div class="text-[9px] text-slate-500 print:text-black">NIP/NIY: _________________</div>
            </div>

            <div>
              <div class="text-slate-600 print:text-black">Kepala SMA Nusaputera Semarang</div>
              <div class="h-16 flex items-center justify-center italic text-slate-400 print:text-black/50 text-[10px]">
                (Tanda Tangan & Cap Sekolah)
              </div>
              <div class="font-bold underline">Kepala Sekolah SMA Nusaputera</div>
              <div class="text-[9px] text-slate-500 print:text-black">NIP/NIY: _________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  /* Hilangkan header, navbar, dan elemen di luar modal */
  body * {
    visibility: hidden;
  }
  .print\:fixed,
  .print\:fixed * {
    visibility: visible;
  }
  .print\:fixed {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
</style>
