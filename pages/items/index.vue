<script setup>
const { user, isStaff } = useAuth()
const { data: pageData, refresh } = await useFetch('/api/items', {
  getCachedData: () => undefined,
})

const items = computed(() => pageData.value?.items || [])
const categories = computed(() => pageData.value?.categories || [])
const loans = computed(() => pageData.value?.loans?.data || [])
const users = computed(() => pageData.value?.users || [])

const refreshingUsers = ref(false)
const refreshUsers = async () => {
  try {
    refreshingUsers.value = true
    await refresh()
  } finally {
    refreshingUsers.value = false
  }
}

onMounted(() => {
  // Selalu segarkan data terbaru saat halaman dibuka
  refresh()
})

const activeTab = ref('catalog')
const selectedCategory = ref('all')
const searchQuery = ref('')
const userSearchQuery = ref('')
const showModal = ref(false)

const form = ref({
  item_id: '',
  user_id: '',
  jumlah: 1,
  tanggal_pinjam: new Date().toISOString().split('T')[0],
  tanggal_rencana_kembali: new Date().toISOString().split('T')[0],
  keperluan: '',
  direct_status: 'sedang_dipinjam',
})
const submitting = ref(false)
const loanError = ref('')

const showPrintModal = ref(false)
const selectedLoanForPrint = ref(null)

const filteredUsers = computed(() => {
  if (!userSearchQuery.value) return users.value
  const q = userSearchQuery.value.toLowerCase()
  return users.value.filter((u) => {
    const nameMatch = u.name && u.name.toLowerCase().includes(q)
    const nisMatch = u.nomor_induk && u.nomor_induk.toLowerCase().includes(q)
    const kelasMatch = u.kelas_jurusan && u.kelas_jurusan.toLowerCase().includes(q)
    const roleMatch = u.role && u.role.toLowerCase().includes(q)
    return nameMatch || nisMatch || kelasMatch || roleMatch
  })
})

const selectedBorrowerDetail = computed(() => {
  if (!form.value.user_id) return user.value
  return users.value.find((u) => String(u.id) === String(form.value.user_id)) || user.value
})

const openSuratJalan = (loan) => {
  selectedLoanForPrint.value = loan
  showPrintModal.value = true
}

const printDocument = () => {
  window.print()
}

const selectedItemDetail = computed(() => {
  return items.value.find((i) => String(i.id) === String(form.value.item_id)) || null
})

const openLoanModal = (item = null) => {
  // Segarkan data pengguna secara real-time di background
  refresh()

  form.value.tanggal_pinjam = new Date().toISOString().split('T')[0]
  form.value.tanggal_rencana_kembali = new Date().toISOString().split('T')[0]
  form.value.jumlah = 1
  form.value.keperluan = ''
  userSearchQuery.value = ''
  loanError.value = ''

  form.value.user_id = user.value?.id || ''
  form.value.direct_status = isStaff.value ? 'sedang_dipinjam' : 'pending'

  if (item) {
    form.value.item_id = item.id
  } else if (items.value.length > 0) {
    const availableFirst = items.value.find((i) => i.stok_tersedia > 0)
    form.value.item_id = availableFirst ? availableFirst.id : items.value[0].id
  }
  showModal.value = true
}

const submitLoan = async () => {
  try {
    submitting.value = true
    loanError.value = ''
    await $fetch('/api/items/loan', {
      method: 'POST',
      body: form.value,
    })
    showModal.value = false
    activeTab.value = 'history'
    await refresh()
  } catch (err) {
    loanError.value = err?.data?.statusMessage || err?.message || 'Gagal mengajukan peminjaman barang.'
  } finally {
    submitting.value = false
  }
}

const cancelLoan = async (id) => {
  if (confirm('Apakah Anda yakin ingin membatalkan pengajuan peminjaman barang ini?')) {
    try {
      await $fetch('/api/items/cancel', {
        method: 'POST',
        body: { id },
      })
      await refresh()
    } catch (err) {
      alert(err?.data?.statusMessage || err?.message || 'Gagal membatalkan.')
    }
  }
}

const filteredItems = computed(() => {
  return items.value.filter((item) => {
    const matchesCategory =
      selectedCategory.value === 'all' || String(item.category_id) === String(selectedCategory.value)
    const q = searchQuery.value.toLowerCase()
    const matchesSearch =
      !q ||
      item.nama_barang.toLowerCase().includes(q) ||
      item.kode_barang.toLowerCase().includes(q) ||
      (item.merk && item.merk.toLowerCase().includes(q)) ||
      (item.spesifikasi && item.spesifikasi.toLowerCase().includes(q))
    return matchesCategory && matchesSearch
  })
})

const getStatusBadge = (status) => {
  switch (status) {
    case 'disetujui':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
    case 'sedang_dipinjam':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
    case 'selesai':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
    case 'ditolak':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
    case 'batal':
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }
}

// formatDate otomatis di-auto-import dari utils/formatters.ts
</script>

<template>
  <div>
    <!-- Non-printable Web Page UI -->
    <div class="print:hidden space-y-6 max-w-7xl mx-auto">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-entrance">
      <div>
        <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Layanan Peminjaman Barang & Sarana
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pinjam peralatan elektronik, multimedia, sound system, hingga alat olahraga dengan kontrol kuantitas stok otomatis.
        </p>
      </div>

      <button
        type="button"
        @click="openLoanModal()"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 btn-shimmer"
      >
        <span>➕</span>
        <span>{{ isStaff ? 'Catat Peminjaman Barang (Staf)' : 'Ajukan Peminjaman Barang' }}</span>
      </button>
    </div>

    <!-- Tab Navigation & Filters -->
    <div class="space-y-4 border-b border-slate-200/80 dark:border-slate-800 pb-4 animate-entrance-delay-1">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
          <button
            type="button"
            @click="activeTab = 'catalog'"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2',
              activeTab === 'catalog'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            <span>📦</span>
            <span>Katalog Barang ({{ items.length }})</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'history'"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2',
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            ]"
          >
            <span>📋</span>
            <span>Riwayat Peminjaman ({{ loans.length }})</span>
          </button>
        </div>

        <div v-if="activeTab === 'catalog'" class="relative w-full sm:w-72">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Cari proyektor, kabel, mic, merk..."
            class="pl-4 pr-4 py-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 outline-none"
          />
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div v-if="activeTab === 'catalog'" class="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
        <button
          type="button"
          @click="selectedCategory = 'all'"
          :class="[
            'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shrink-0 border',
            selectedCategory === 'all'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
          ]"
        >
          Semua Kategori
        </button>

        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          @click="selectedCategory = cat.id"
          :class="[
            'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shrink-0 border',
            String(selectedCategory) === String(cat.id)
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
          ]"
        >
          {{ cat.nama_kategori }}
        </button>
      </div>
    </div>

    <!-- TAB 1: KATALOG BARANG -->
    <div v-if="activeTab === 'catalog'">
      <div v-if="filteredItems.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between group glass-card-interactive animate-entrance-delay-2"
        >
          <div>
            <div class="flex items-start justify-between gap-2">
              <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-105 transition-transform duration-200">
                📦
              </div>
              <div class="text-right">
                <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {{ item.kode_barang }}
                </span>
                <div class="mt-1">
                  <span class="inline-block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {{ item.category?.nama_kategori }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-4">
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {{ item.nama_barang }}
              </h3>
              <p v-if="item.merk" class="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                Merk: {{ item.merk }}
              </p>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
              <div v-if="item.spesifikasi" class="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 line-clamp-2">
                {{ item.spesifikasi }}
              </div>

              <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span class="text-slate-400">Lokasi Simpan:</span>
                <span class="font-medium text-right truncate max-w-[160px]">{{ item.lokasi_penyimpanan || 'Ruang Sarpras' }}</span>
              </div>

              <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span class="text-slate-400">Kondisi Fisik:</span>
                <span
                  class="font-bold capitalize inline-flex items-center gap-1.5"
                  :class="{
                    'text-emerald-600 dark:text-emerald-400': item.kondisi === 'baik',
                    'text-amber-600 dark:text-amber-400': item.kondisi === 'rusak_ringan',
                    'text-rose-600 dark:text-rose-400': item.kondisi === 'rusak_berat'
                  }"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="{
                      'bg-emerald-500 status-dot-radar status-dot-radar-green': item.kondisi === 'baik',
                      'bg-amber-500 status-dot-radar status-dot-radar-amber': item.kondisi === 'rusak_ringan',
                      'bg-rose-500 status-dot-radar status-dot-radar-red': item.kondisi === 'rusak_berat'
                    }"
                  ></span>
                  {{ item.kondisi.replace('_', ' ') }}
                </span>
              </div>
            </div>

            <!-- Stock Progress Bar -->
            <div class="mt-4 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="text-slate-500 dark:text-slate-400 font-medium">Ketersediaan Stok:</span>
                <span
                  :class="[
                    'font-extrabold',
                    item.stok_tersedia > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  ]"
                >
                  {{ item.stok_tersedia }} / {{ item.total_stok }} Unit
                </span>
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full animate-progress"
                  :class="item.stok_tersedia > 0 ? 'bg-emerald-500' : 'bg-rose-500'"
                  :style="{ width: `${Math.min(100, item.total_stok > 0 ? (item.stok_tersedia / item.total_stok) * 100 : 0)}%` }"
                ></div>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              @click="openLoanModal(item)"
              :disabled="item.stok_tersedia < 1"
              class="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center transition-all duration-200 flex items-center justify-center gap-2"
              :class="
                item.stok_tersedia > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              "
            >
              <span>{{ item.stok_tersedia > 0 ? 'Pinjam Alat Ini' : 'Stok Sedang Habis' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="p-12 text-center text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
        <p class="text-sm font-semibold">Tidak ditemukan barang pada kategori atau kata kunci tersebut.</p>
      </div>
    </div>

    <!-- TAB 2: RIWAYAT / STATUS TIKET -->
    <div v-if="activeTab === 'history'" class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
      <div class="p-6 border-b border-slate-200/80 dark:border-slate-800">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">
          Daftar Pengajuan Peminjaman Barang
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Pantau status tiket peminjaman dan jadwal pengembalian peralatan sekolah.
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th class="p-4">No. Peminjaman</th>
              <th class="p-4">Daftar Barang</th>
              <th class="p-4">Pemohon</th>
              <th class="p-4">Periode Pinjam</th>
              <th class="p-4">Keperluan</th>
              <th class="p-4">Status</th>
              <th class="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            <tr
              v-for="loan in loans"
              :key="loan.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <td class="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                {{ loan.nomor_peminjaman }}
              </td>
              <td class="p-4">
                <div v-for="detail in loan.details" :key="detail.id" class="font-bold text-slate-900 dark:text-white">
                  {{ detail.item?.nama_barang }}
                  <span class="inline-block ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    {{ detail.jumlah }} Unit
                  </span>
                </div>
              </td>
              <td class="p-4 text-slate-700 dark:text-slate-300">
                {{ loan.user?.name }}
              </td>
              <td class="p-4 text-slate-700 dark:text-slate-300">
                <div>Pinjam: <span class="font-semibold">{{ formatDate(loan.tanggal_pinjam) }}</span></div>
                <div class="text-[11px] text-slate-400 mt-0.5">Kembali: {{ formatDate(loan.tanggal_rencana_kembali) }}</div>
              </td>
              <td class="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" :title="loan.keperluan">
                {{ loan.keperluan }}
              </td>
              <td class="p-4">
                <span :class="['px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize inline-flex items-center gap-1', getStatusBadge(loan.status)]">
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="{
                      'status-dot-radar status-dot-radar-amber bg-amber-500': loan.status === 'pending',
                      'status-dot-radar status-dot-radar-blue bg-blue-500': loan.status === 'sedang_dipinjam',
                      'status-dot-radar status-dot-radar-green bg-emerald-500': ['disetujui','selesai'].includes(loan.status),
                      'bg-rose-500': loan.status === 'ditolak',
                      'bg-slate-400': !['pending','sedang_dipinjam','disetujui','selesai','ditolak'].includes(loan.status)
                    }"
                  ></span>
                  {{ loan.status.replace('_', ' ') }}
                </span>
              </td>
              <td class="p-4 text-right space-x-2 whitespace-nowrap">
                <button
                  v-if="['disetujui', 'sedang_dipinjam', 'selesai'].includes(loan.status)"
                  type="button"
                  @click="openSuratJalan(loan)"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900 transition-colors inline-flex items-center gap-1"
                  title="Cetak Surat Jalan Resmi"
                >
                  <span>📄</span>
                  <span>Surat Jalan</span>
                </button>
                <button
                  v-if="['pending', 'disetujui'].includes(loan.status)"
                  type="button"
                  @click="cancelLoan(loan.id)"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
                >
                  Batalkan
                </button>
                <span v-else-if="!['disetujui', 'sedang_dipinjam', 'selesai'].includes(loan.status)" class="text-slate-400 text-[11px]">—</span>
              </td>
            </tr>

            <tr v-if="loans.length === 0">
              <td colspan="7" class="p-8 text-center text-slate-400">
                Belum ada data pengajuan peminjaman barang.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL FORM PENGAJUAN PINJAM BARANG -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 transition-all duration-200">
        <button
          type="button"
          @click="showModal = false"
          class="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
        >
          ✕
        </button>

        <div class="mb-5">
          <span class="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 mb-2">
            {{ isStaff ? 'Entri Peminjaman Petugas' : 'Form Pengajuan' }}
          </span>
          <h3 class="text-xl font-extrabold text-slate-900 dark:text-white">
            {{ isStaff ? 'Catat Peminjaman Barang & Sarana' : 'Peminjaman Barang & Sarana' }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ isStaff ? 'Pilih peminjam (siswa/guru/staf) dan barang yang akan dipinjam serta status awal penyerahan.' : 'Pastikan jumlah unit tidak melebihi stok yang tersedia saat ini.' }}
          </p>
        </div>

        <div v-if="loanError" class="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{{ loanError }}</span>
        </div>

        <form @submit.prevent="submitLoan" class="space-y-4">
          <!-- Bagian Pemilihan Peminjam (Khusus Admin / Petugas) -->
          <div v-if="isStaff" class="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <span>👤</span>
                <span>Peminjam / Penanggung Jawab</span>
              </label>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="refreshUsers"
                  :disabled="refreshingUsers"
                  class="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
                  title="Segarkan daftar pengguna terbaru dari database"
                >
                  <span :class="{ 'animate-spin': refreshingUsers }">🔄</span>
                  <span>{{ refreshingUsers ? 'Memuat...' : 'Segarkan Data' }}</span>
                </button>
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {{ filteredUsers.length }} Orang
                </span>
              </div>
            </div>

            <!-- Filter Pencarian Pengguna -->
            <input
              type="text"
              v-model="userSearchQuery"
              placeholder="🔍 Cari nama, NIS, NIP, atau kelas peminjam..."
              class="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
            />

            <select
              v-model="form.user_id"
              required
              class="w-full rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              <option :value="user?.id">-- Diri Sendiri ({{ user?.name }} - {{ user?.role?.toUpperCase() }}) --</option>
              <optgroup :label="`Daftar Pengguna Terdaftar (${filteredUsers.length} orang)`">
                <option v-for="u in filteredUsers" :key="u.id" :value="u.id">
                  [{{ u.role.toUpperCase() }}] {{ u.name }} {{ u.kelas_jurusan ? `• ${u.kelas_jurusan}` : '' }} {{ u.nomor_induk ? `(No: ${u.nomor_induk})` : '' }}
                </option>
              </optgroup>
            </select>

            <div v-if="selectedBorrowerDetail" class="text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2 pt-0.5">
              <span class="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
              <span>Terpilih: <strong>{{ selectedBorrowerDetail.name }}</strong> ({{ selectedBorrowerDetail.role }}) {{ selectedBorrowerDetail.kelas_jurusan ? `• ${selectedBorrowerDetail.kelas_jurusan}` : '' }}</span>
            </div>
          </div>

          <!-- Pilihan Status Khusus Staff -->
          <div v-if="isStaff" class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-800 dark:text-slate-200">Status Tindakan Peminjaman</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="form.direct_status = 'sedang_dipinjam'"
                :class="[
                  'p-2 rounded-xl text-center border text-[11px] font-bold transition-all',
                  form.direct_status === 'sedang_dipinjam'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/40'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                ]"
              >
                📦 Serahkan Langsung
              </button>
              <button
                type="button"
                @click="form.direct_status = 'disetujui'"
                :class="[
                  'p-2 rounded-xl text-center border text-[11px] font-bold transition-all',
                  form.direct_status === 'disetujui'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/40'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                ]"
              >
                ✅ Disetujui
              </button>
              <button
                type="button"
                @click="form.direct_status = 'pending'"
                :class="[
                  'p-2 rounded-xl text-center border text-[11px] font-bold transition-all',
                  form.direct_status === 'pending'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                ]"
              >
                ⏳ Pending
              </button>
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400">
              <span v-if="form.direct_status === 'sedang_dipinjam'">Barang langsung diserahterimakan saat ini & stok otomatis dipotong.</span>
              <span v-else-if="form.direct_status === 'disetujui'">Peminjaman disetujui & stok dipotong, tinggal menunggu pengambilan barang di sarpra.</span>
              <span v-else>Pengajuan masuk antrean pending untuk diverifikasi terlebih dahulu.</span>
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold mb-1">Pilih Sarana / Barang</label>
            <select
              v-model="form.item_id"
              required
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="" disabled>-- Pilih Barang --</option>
              <option
                v-for="it in items"
                :key="it.id"
                :value="it.id"
                :disabled="it.stok_tersedia < 1"
              >
                {{ it.nama_barang }} (Sisa Stok: {{ it.stok_tersedia }} Unit)
              </option>
            </select>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-bold">Jumlah Unit yang Dipinjam</label>
              <span v-if="selectedItemDetail" class="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                Maksimal: {{ selectedItemDetail.stok_tersedia }} Unit
              </span>
            </div>
            <input
              type="number"
              v-model="form.jumlah"
              min="1"
              :max="selectedItemDetail ? selectedItemDetail.stok_tersedia : 100"
              required
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold mb-1">Tanggal Pinjam</label>
              <input
                type="date"
                v-model="form.tanggal_pinjam"
                :min="new Date().toISOString().split('T')[0]"
                required
                class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">Rencana Kembali</label>
              <input
                type="date"
                v-model="form.tanggal_rencana_kembali"
                :min="form.tanggal_pinjam"
                required
                class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold mb-1">Keperluan / Alasan Peminjaman</label>
            <textarea
              v-model="form.keperluan"
              rows="3"
              required
              placeholder="Contoh: Digunakan untuk presentasi kelas atau event OSIS"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md disabled:opacity-50"
            >
              {{ submitting ? 'Memproses...' : (isStaff && form.direct_status === 'sedang_dipinjam') ? 'Simpan & Serahkan Barang' : (isStaff && form.direct_status === 'disetujui') ? 'Simpan & Setujui Peminjaman' : 'Kirim Pengajuan Peminjaman' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
    <!-- END Non-printable Web Page UI -->

    <!-- MODAL PREVIEW SURAT JALAN & CETAK DOKUMEN (ISOLASI CETAK RESMI 1 HALAMAN) -->
    <div
      v-if="showPrintModal && selectedLoanForPrint"
      id="print-modal-container"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:static print:block print:w-full print:p-0 print:m-0 print:bg-white print:overflow-visible print-document-container"
    >
      <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto print:static print:block print:w-full print:max-w-none print:p-0 print:m-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible print:bg-white print-document-body">
        <!-- Action Buttons (Hidden when printing) -->
        <div class="print:hidden flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
          <div class="flex items-center gap-2">
            <span class="text-xl">📄</span>
            <span class="font-bold text-sm text-slate-900 dark:text-white">Surat Jalan Peminjaman Sarpras</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="printDocument"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 flex items-center gap-1.5"
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

        <!-- DOKUMEN RESMI (KOP SURAT SMA NUSAPUTERA) -->
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
                Jl. Ki Mangunsarkoro No.59 Semarang Tengah ,Telp 024 - 3542444<br />
                Email: sma_nusaputera@yahoo.id / info@smanusaputera.sch.id
              </p>
            </div>
            <div class="w-16 h-16 flex-shrink-0 flex items-center justify-center border border-gray-400 text-[8px] text-gray-500 uppercase text-center p-1 font-sans">
              SURAT JALAN<br />RESMI
            </div>
          </div>

          <!-- Judul Dokumen -->
          <div class="text-center mb-3">
            <h2 class="text-xs sm:text-sm font-bold uppercase underline tracking-wide">
              SURAT IZIN & BUKTI PEMINJAMAN SARANA / BARANG
            </h2>
            <p class="text-[10px] font-sans text-gray-600 mt-0.5">
              Nomor: <span class="font-mono font-bold">{{ selectedLoanForPrint.nomor_peminjaman }}</span>
            </p>
          </div>

          <!-- Keterangan Peminjam -->
          <div class="text-[11px] font-sans space-y-1 mb-3 text-gray-800 bg-gray-50/60 p-2.5 rounded border border-gray-200">
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Nama Peminjam</span>
              <span class="col-span-2 font-bold">: {{ selectedLoanForPrint.user?.name }} ({{ selectedLoanForPrint.user?.role }})</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Tanggal Pengambilan</span>
              <span class="col-span-2">: {{ formatDate(selectedLoanForPrint.tanggal_pinjam) }}</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Batas Pengembalian</span>
              <span class="col-span-2 font-bold text-indigo-900">: {{ formatDate(selectedLoanForPrint.tanggal_rencana_kembali) }}</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Keperluan / Acara</span>
              <span class="col-span-2">: {{ selectedLoanForPrint.keperluan }}</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Status Validasi</span>
              <span class="col-span-2 uppercase font-bold text-emerald-700">: {{ selectedLoanForPrint.status }} (TERVERIFIKASI)</span>
            </div>
          </div>

          <!-- Tabel Barang -->
          <table class="w-full text-[10.5px] font-sans border-collapse border border-black mb-3">
            <thead>
              <tr class="bg-gray-100 text-black font-bold uppercase text-[9.5px]">
                <th class="border border-black p-1.5 text-center w-8">No</th>
                <th class="border border-black p-1.5 text-left">Kode & Nama Barang</th>
                <th class="border border-black p-1.5 text-center w-20">Jumlah</th>
                <th class="border border-black p-1.5 text-center w-24">Kondisi Awal</th>
                <th class="border border-black p-1.5 text-center w-24">Kondisi Kembali</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, idx) in selectedLoanForPrint.details" :key="d.id">
                <td class="border border-black p-1.5 text-center">{{ idx + 1 }}</td>
                <td class="border border-black p-1.5">
                  <div class="font-bold">{{ d.item?.nama_barang }}</div>
                  <div class="text-[9px] text-gray-500 font-mono">{{ d.item?.kode_barang }}</div>
                </td>
                <td class="border border-black p-1.5 text-center font-bold">
                  {{ d.jumlah }} {{ d.item?.satuan || 'Unit' }}
                </td>
                <td class="border border-black p-1.5 text-center capitalize">
                  {{ d.kondisi_sebelum || 'Baik' }}
                </td>
                <td class="border border-black p-1.5 text-center capitalize">
                  {{ d.kondisi_sesudah || '-' }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Ketentuan -->
          <div class="text-[9px] font-sans text-gray-700 mb-3 bg-gray-50 p-2 rounded border border-gray-200 leading-tight">
            <span class="font-bold">Ketentuan & Kewajiban Peminjam:</span>
            <ol class="list-decimal pl-3 space-y-0.5 mt-0.5">
              <li>Peminjam wajib menjaga keutuhan, kebersihan, dan fungsi barang selama masa peminjaman.</li>
              <li>Barang wajib dikembalikan paling lambat pada tanggal yang telah ditentukan.</li>
              <li>Kerusakan atau kehilangan barang akibat kelalaian peminjam menjadi tanggung jawab penuh peminjam.</li>
            </ol>
          </div>

          <!-- Tanda Tangan -->
          <div class="grid grid-cols-2 text-[10.5px] font-sans mt-4 pt-1">
            <div class="text-left">
              <p>Peminjam / Pemohon,</p>
              <div class="h-12"></div>
              <p class="font-bold underline">( {{ selectedLoanForPrint.user?.name }} )</p>
              <p class="text-[9.5px] text-gray-600 capitalize">{{ selectedLoanForPrint.user?.role }}</p>
            </div>
            <div class="text-right">
              <p>Semarang, {{ formatDate(selectedLoanForPrint.tanggal_pinjam) }}</p>
              <p>Petugas Sarpras,</p>
              <div class="h-12"></div>
              <p class="font-bold underline">( {{ selectedLoanForPrint.approver?.name || 'Petugas Sarpra' }} )</p>
              <p class="text-[9.5px] text-gray-600">Bagian Sarana & Prasarana</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
