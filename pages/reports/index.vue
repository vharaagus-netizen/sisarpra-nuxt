<script setup>
const { isStaff } = useAuth()

const activeTab = ref('rooms') // 'rooms' | 'items'
const startDate = ref('')
const endDate = ref('')
const selectedStatus = ref('')
const selectedRoomId = ref('')
const selectedItemId = ref('')

const loading = ref(false)
const reportData = ref([])
const stats = ref({ total: 0, approved: 0, finished: 0, rejected: 0 })
const roomsList = ref([])
const itemsList = ref([])

const fetchReport = async () => {
  loading.value = true
  try {
    const params = {
      tab: activeTab.value,
      ...(startDate.value && { start_date: startDate.value }),
      ...(endDate.value && { end_date: endDate.value }),
      ...(selectedStatus.value && { status: selectedStatus.value }),
      ...(activeTab.value === 'rooms' && selectedRoomId.value && { room_id: selectedRoomId.value }),
      ...(activeTab.value === 'items' && selectedItemId.value && { item_id: selectedItemId.value }),
    }

    const res = await $fetch('/api/reports', { query: params })
    reportData.value = res.reportData || []
    stats.value = res.stats || { total: 0, approved: 0, finished: 0, rejected: 0 }
    roomsList.value = res.rooms || []
    itemsList.value = res.items || []
  } catch (err) {
    console.error('Gagal mengambil laporan:', err)
  } finally {
    loading.value = false
  }
}

watch(activeTab, () => {
  selectedStatus.value = ''
  selectedRoomId.value = ''
  selectedItemId.value = ''
  fetchReport()
})

onMounted(() => {
  // Default to current month
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  startDate.value = firstDay.toISOString().split('T')[0]
  endDate.value = lastDay.toISOString().split('T')[0]
  fetchReport()
})

const handleReset = () => {
  const now = new Date()
  startDate.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  endDate.value = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  selectedStatus.value = ''
  selectedRoomId.value = ''
  selectedItemId.value = ''
  fetchReport()
}

const printReport = () => {
  window.print()
}

// formatDate otomatis di-auto-import dari utils/formatters.ts

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusBadge = (status) => {
  switch (status) {
    case 'disetujui':
      return { label: 'Disetujui', class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' }
    case 'sedang_dipinjam':
      return { label: 'Sedang Dipinjam', class: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' }
    case 'selesai':
      return { label: 'Selesai', class: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' }
    case 'ditolak':
      return { label: 'Ditolak', class: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' }
    case 'batal':
      return { label: 'Dibatalkan', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' }
    default:
      return { label: 'Menunggu', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' }
  }
}
</script>

<template>
  <div>
    <!-- Screen View (Hidden when printing) -->
    <div class="print:hidden space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Rekapitulasi Operasional Sarpras
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Laporan Sarpras SMA Nusaputera
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Data rekap peminjaman ruang, peminjaman barang, serta rekam jejak pengguna.
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            @click="printReport"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all duration-200 active:scale-95"
          >
            <span>🖨️</span>
            <span>Cetak Dokumen Resmi</span>
          </button>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="flex p-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 w-fit">
        <button
          type="button"
          @click="activeTab = 'rooms'"
          :class="[
            'px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2',
            activeTab === 'rooms'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          <span>🏢</span>
          <span>Laporan Peminjaman Ruangan</span>
        </button>
        <button
          type="button"
          @click="activeTab = 'items'"
          :class="[
            'px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2',
            activeTab === 'items'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          <span>📦</span>
          <span>Laporan Peminjaman Barang</span>
        </button>
      </div>

      <!-- Filter Controls Panel -->
      <div class="glass-card-interactive p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Start Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tanggal Mulai
            </label>
            <input
              type="date"
              v-model="startDate"
              class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- End Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tanggal Selesai
            </label>
            <input
              type="date"
              v-model="endDate"
              class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Status Peminjaman
            </label>
            <select
              v-model="selectedStatus"
              class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu Persetujuan</option>
              <option value="disetujui">Disetujui</option>
              <option v-if="activeTab === 'items'" value="sedang_dipinjam">Sedang Dipinjam</option>
              <option value="selesai">Selesai</option>
              <option value="ditolak">Ditolak</option>
              <option value="batal">Dibatalkan</option>
            </select>
          </div>

          <!-- Specific Room or Item Filter -->
          <div v-if="activeTab === 'rooms'">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pilihan Ruangan
            </label>
            <select
              v-model="selectedRoomId"
              class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Ruangan</option>
              <option v-for="room in roomsList" :key="room.id" :value="room.id">
                {{ room.nama_ruang }} ({{ room.kode_ruang }})
              </option>
            </select>
          </div>
          <div v-else>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pilihan Barang
            </label>
            <select
              v-model="selectedItemId"
              class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Barang</option>
              <option v-for="item in itemsList" :key="item.id" :value="item.id">
                {{ item.nama_barang }} ({{ item.kode_barang }})
              </option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <button
            type="button"
            @click="handleReset"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Reset Filter
          </button>
          <button
            type="button"
            @click="fetchReport"
            :disabled="loading"
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-60 transition-all duration-200"
          >
            {{ loading ? 'Memuat...' : '🔍 Terapkan Filter' }}
          </button>
        </div>
      </div>

      <!-- Quick Metrics Overview -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pengajuan</div>
            <div class="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{{ stats.total || 0 }}</div>
          </div>
          <span class="text-2xl">📋</span>
        </div>

        <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Disetujui / Aktif</div>
            <div class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{{ stats.approved || stats.active || 0 }}</div>
          </div>
          <span class="text-2xl">✅</span>
        </div>

        <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-blue-500">Selesai Dikembalikan</div>
            <div class="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{{ stats.finished || 0 }}</div>
          </div>
          <span class="text-2xl">🎉</span>
        </div>

        <div class="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-rose-500">Ditolak</div>
            <div class="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{{ stats.rejected || 0 }}</div>
          </div>
          <span class="text-2xl">❌</span>
        </div>
      </div>

      <!-- Report Data Table -->
      <div class="glass-card-interactive rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <div class="font-bold text-sm text-slate-800 dark:text-slate-100">
            Daftar Data Rekapitulasi ({{ reportData.length }} transaksi)
          </div>
          <div class="text-xs text-slate-500">
            Periode: {{ formatDate(startDate) }} s/d {{ formatDate(endDate) }}
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200/80 dark:border-slate-800/80">
              <tr v-if="activeTab === 'rooms'">
                <th class="py-3 px-4">No. Res / Tgl</th>
                <th class="py-3 px-4">Ruangan</th>
                <th class="py-3 px-4">Peminjam</th>
                <th class="py-3 px-4">Waktu Pinjam</th>
                <th class="py-3 px-4">Keperluan</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Petugas Approval</th>
              </tr>
              <tr v-else>
                <th class="py-3 px-4">No. Pinjam / Tgl</th>
                <th class="py-3 px-4">Peminjam</th>
                <th class="py-3 px-4">Daftar Barang & Jumlah</th>
                <th class="py-3 px-4">Jangka Waktu</th>
                <th class="py-3 px-4">Keperluan</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Petugas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              <tr v-if="reportData.length === 0">
                <td colspan="7" class="py-12 text-center text-slate-400">
                  Tidak ada data peminjaman yang sesuai dengan filter periode.
                </td>
              </tr>
              <template v-if="activeTab === 'rooms'">
                <tr v-for="res in reportData" :key="res.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td class="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    <div>{{ res.nomor_peminjaman || res.nomor_reservasi }}</div>
                    <div class="text-[10px] text-slate-400 font-sans">{{ formatDate(res.tanggal_pinjam) }}</div>
                  </td>
                  <td class="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    <div>{{ res.room?.nama_ruang }}</div>
                    <div class="text-[10px] text-slate-400">📍 {{ res.room?.lokasi || res.room?.kode_ruang }}</div>
                  </td>
                  <td class="py-3 px-4">
                    <div class="font-medium text-slate-800 dark:text-slate-200">{{ res.user?.name }}</div>
                    <div class="text-[10px] text-slate-400 capitalize">{{ res.user?.role }}</div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {{ formatTime(res.jam_mulai) }} - {{ formatTime(res.jam_selesai) }} WIB
                    </span>
                  </td>
                  <td class="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300" :title="res.tujuan_kegiatan || res.keperluan">
                    {{ res.tujuan_kegiatan || res.keperluan || '-' }}
                  </td>
                  <td class="py-3 px-4">
                    <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(res.status).class]">
                      {{ getStatusBadge(res.status).label }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                    {{ res.approver?.name || '-' }}
                  </td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="loan in reportData" :key="loan.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td class="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                    <div>{{ loan.nomor_peminjaman }}</div>
                    <div class="text-[10px] text-slate-400 font-sans">{{ formatDate(loan.tanggal_pinjam) }}</div>
                  </td>
                  <td class="py-3 px-4">
                    <div class="font-medium text-slate-800 dark:text-slate-200">{{ loan.user?.name }}</div>
                    <div class="text-[10px] text-slate-400 capitalize">{{ loan.user?.role }}</div>
                  </td>
                  <td class="py-3 px-4">
                    <ul class="space-y-1">
                      <li v-for="detail in loan.details" :key="detail.id" class="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                        • {{ detail.item?.nama_barang }} ({{ detail.jumlah }} {{ detail.item?.satuan || 'unit' }})
                      </li>
                    </ul>
                  </td>
                  <td class="py-3 px-4">
                    <div class="text-[11px] text-slate-700 dark:text-slate-300">
                      Rencana: {{ formatDate(loan.tanggal_rencana_kembali) }}
                    </div>
                    <div v-if="loan.tanggal_realisasi_kembali" class="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Kembali: {{ formatDate(loan.tanggal_realisasi_kembali) }}
                    </div>
                  </td>
                  <td class="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                    {{ loan.keperluan }}
                  </td>
                  <td class="py-3 px-4">
                    <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(loan.status).class]">
                      {{ getStatusBadge(loan.status).label }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                    {{ loan.approver?.name || '-' }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Official Printable Document View (Visible ONLY when printing) -->
    <div class="hidden print:block print-document-container print-document-body bg-white text-black p-8 print:p-0 font-serif leading-relaxed">
      <!-- KOP SURAT RESMI SMA NUSAPUTERA -->
      <div class="flex items-center justify-between pb-4 border-b-4 border-double border-black mb-6">
        <div class="w-24 h-24 flex-shrink-0">
          <img src="/images/logo.png" alt="Logo SMA Nusaputera" class="w-full h-full object-contain" />
        </div>
        <div class="text-center flex-1 px-4">
          <div class="text-sm font-semibold tracking-widest uppercase">YAYASAN PENDIDIKAN NUSAPUTERA</div>
          <h1 class="text-2xl font-black tracking-wider uppercase mt-0.5">SMA NUSAPUTERA SEMARANG</h1>
          <p class="text-[11px] font-sans text-gray-700 mt-1">
            Jl. Ki Mangunsarkoro No.59 Semarang Tengah ,Telp 024 - 3542444<br />
            Email: sma_nusaputera@yahoo.id / info@smanusaputera.sch.id
          </p>
        </div>
        <div class="w-24 h-24 flex-shrink-0 flex items-center justify-center border border-gray-300 text-[9px] text-gray-400 uppercase text-center p-1 font-sans">
          SISARPRA<br />Dokumen Resmi
        </div>
      </div>

      <!-- Document Title -->
      <div class="text-center mb-6">
        <h2 class="text-base font-bold uppercase underline tracking-wide">
          LAPORAN REKAPITULASI {{ activeTab === 'rooms' ? 'PEMINJAMAN RUANGAN' : 'PEMINJAMAN BARANG & SARANA' }}
        </h2>
        <p class="text-xs text-gray-600 font-sans mt-1">
          Periode: {{ formatDate(startDate) }} sampai {{ formatDate(endDate) }}
        </p>
      </div>

      <!-- Printable Table -->
      <table class="w-full text-xs font-sans border-collapse border border-black mb-8">
        <thead>
          <tr class="bg-gray-100 text-black font-bold uppercase text-[10px]">
            <th class="border border-black p-2 text-center w-8">No</th>
            <th class="border border-black p-2 text-left">Kode & Tanggal</th>
            <th class="border border-black p-2 text-left">{{ activeTab === 'rooms' ? 'Ruangan' : 'Barang & Qty' }}</th>
            <th class="border border-black p-2 text-left">Nama Peminjam</th>
            <th class="border border-black p-2 text-left">Waktu / Rencana</th>
            <th class="border border-black p-2 text-left">Keperluan</th>
            <th class="border border-black p-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="activeTab === 'rooms'">
            <tr v-for="(row, idx) in reportData" :key="row.id">
              <td class="border border-black p-2 text-center">{{ idx + 1 }}</td>
              <td class="border border-black p-2 font-mono">
                {{ row.nomor_peminjaman || row.nomor_reservasi }}<br />
                <span class="text-[10px] text-gray-600">{{ formatDate(row.tanggal_pinjam) }}</span>
              </td>
              <td class="border border-black p-2 font-semibold">
                {{ row.room?.nama_ruang }} ({{ row.room?.kode_ruang }})
              </td>
              <td class="border border-black p-2">
                {{ row.user?.name }} ({{ row.user?.role }})
              </td>
              <td class="border border-black p-2">
                {{ formatTime(row.jam_mulai) }} - {{ formatTime(row.jam_selesai) }} WIB
              </td>
              <td class="border border-black p-2 text-gray-800">
                {{ row.tujuan_kegiatan || row.keperluan || '-' }}
              </td>
              <td class="border border-black p-2 text-center font-bold uppercase text-[10px]">
                {{ row.status }}
              </td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="(row, idx) in reportData" :key="row.id">
              <td class="border border-black p-2 text-center">{{ idx + 1 }}</td>
              <td class="border border-black p-2 font-mono">
                {{ row.nomor_peminjaman }}<br />
                <span class="text-[10px] text-gray-600">{{ formatDate(row.tanggal_pinjam) }}</span>
              </td>
              <td class="border border-black p-2">
                <div v-for="d in row.details" :key="d.id" class="font-semibold">
                  • {{ d.item?.nama_barang }} ({{ d.jumlah }} {{ d.item?.satuan }})
                </div>
              </td>
              <td class="border border-black p-2">
                {{ row.user?.name }} ({{ row.user?.role }})
              </td>
              <td class="border border-black p-2">
                Kembali: {{ formatDate(row.tanggal_rencana_kembali) }}
              </td>
              <td class="border border-black p-2 text-gray-800">
                {{ row.keperluan }}
              </td>
              <td class="border border-black p-2 text-center font-bold uppercase text-[10px]">
                {{ row.status }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div class="grid grid-cols-2 text-xs font-sans mt-12 pt-4">
        <div class="text-left">
          <p>Mengetahui,</p>
          <p class="font-bold">Kepala SMA Nusaputera</p>
          <div class="h-20"></div>
          <p class="font-bold underline">( ............................................ )</p>
          <p class="text-gray-600 text-[11px]">NIP. -</p>
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

