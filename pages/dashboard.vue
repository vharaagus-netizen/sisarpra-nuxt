<script setup>
const { user, isStaff } = useAuth()

const { data: dashboardData, refresh } = await useFetch('/api/dashboard')

const stats = computed(() => dashboardData.value?.stats || {
  total_rooms: 0,
  available_rooms: 0,
  total_items: 0,
  available_item_units: 0,
  pending_room_reservations: 0,
  pending_item_loans: 0,
  active_item_loans: 0,
})

const recentRoomReservations = computed(() => dashboardData.value?.recentRoomReservations || [])
const recentItemLoans = computed(() => dashboardData.value?.recentItemLoans || [])

const totalPending = computed(() => {
  return (stats.value.pending_room_reservations || 0) + (stats.value.pending_item_loans || 0)
})

// Animated Number Counter Helper (Gaya 1 - SSR Safe)
const useAnimatedCounter = (getter, duration = 850) => {
  const getVal = () => (typeof getter === 'function' ? getter() : getter)
  const display = ref(Number(getVal()) || 0)

  const animate = (target) => {
    const end = Number(target) || 0
    if (end === 0) {
      display.value = 0
      return
    }
    if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
      display.value = end
      return
    }
    const startTime = performance.now()
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      display.value = Math.round(end * easeOut)
      if (progress < 1 && typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(step)
      } else {
        display.value = end
      }
    }
    requestAnimationFrame(step)
  }

  onMounted(() => {
    watch(() => getVal(), (newVal) => {
      animate(newVal)
    }, { immediate: true })
  })

  return display
}

const totalRoomsDisplay = useAnimatedCounter(() => stats.value.total_rooms)
const availableRoomsDisplay = useAnimatedCounter(() => stats.value.available_rooms)
const totalItemsDisplay = useAnimatedCounter(() => stats.value.total_items)
const availableItemUnitsDisplay = useAnimatedCounter(() => stats.value.available_item_units)
const totalPendingDisplay = useAnimatedCounter(() => totalPending.value)
const activeLoansDisplay = useAnimatedCounter(() => stats.value.active_item_loans)

const currentDate = computed(() => {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const getStatusBadge = (status) => {
  switch (status) {
    case 'disetujui':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
    case 'ditolak':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
    case 'sedang_dipinjam':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
    case 'batal':
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  }
}

// formatTime & formatDate otomatis di-auto-import dari utils/formatters.ts
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Welcome Hero Banner with Warm Orange Aurora Glow (Gaya 1 + 2) -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-950 via-stone-900 to-orange-900 text-white p-6 sm:p-8 shadow-xl border border-orange-800/40 animate-entrance">
      <!-- Background decorative aurora glow -->
      <div class="absolute -top-24 -right-24 w-80 h-80 bg-orange-500/25 rounded-full blur-3xl pointer-events-none animate-aurora-1"></div>
      <div class="absolute -bottom-24 left-1/3 w-80 h-80 bg-terracotta-500/20 rounded-full blur-3xl pointer-events-none animate-aurora-2"></div>

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 border border-orange-400/30 text-orange-200">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SMA NUSAPUTERA SEMARANG • {{ currentDate }}</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {{ user?.name }}! 👋
          </h2>
          <p class="text-xs sm:text-sm text-orange-100/90 max-w-xl">
            Sistem Informasi Sarana & Prasarana (SISARPRA) SMA Nusaputera — Kelola kebutuhan ruangan dan inventaris barang sekolah dengan cepat, tertib, dan transparan.
          </p>
        </div>

        <!-- Quick Actions Buttons with Shimmer & Lift -->
        <div class="flex flex-wrap items-center gap-2.5">
          <NuxtLink
            v-if="isStaff"
            to="/reports"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-500/40 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-md shadow-emerald-950/40 btn-shimmer"
          >
            <span>📊</span>
            <span>Laporan & Rekap</span>
          </NuxtLink>

          <NuxtLink
            to="/rooms"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 btn-shimmer"
          >
            <span>🏢</span>
            <span>Pinjam Ruang</span>
          </NuxtLink>

          <NuxtLink
            to="/items"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>📦</span>
            <span>Pinjam Barang</span>
          </NuxtLink>

          <NuxtLink
            to="/lockers"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white text-xs font-bold border border-terracotta-400/40 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-md shadow-stone-950/40 btn-shimmer"
          >
            <span>🗄️</span>
            <span>Lemari Loker (24)</span>
          </NuxtLink>

          <NuxtLink
            to="/procurements"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 text-xs font-bold border border-orange-400/30 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>📝</span>
            <span>Usulan Sarpras</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- 4 Statistic Overview Cards with Animated Counters & Hover Lift (Gaya 1 + 2 + 4) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Ruangan -->
      <div class="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm glass-card-interactive animate-entrance-delay-1">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Master Ruangan
          </span>
          <div class="p-2 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
            🏢
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {{ totalRoomsDisplay }}
          </span>
          <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span class="status-dot-radar status-dot-radar-green w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            {{ availableRoomsDisplay }} Siap Pakai
          </span>
        </div>
        <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          Lab Komputer, Aula, Ruang Rapat, dll
        </p>
      </div>

      <!-- Card 2: Barang & Stok -->
      <div class="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm glass-card-interactive animate-entrance-delay-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Inventaris
          </span>
          <div class="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            📦
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {{ totalItemsDisplay }}
          </span>
          <span class="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <span class="status-dot-radar status-dot-radar-blue w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
            {{ availableItemUnitsDisplay }} Unit Tersedia
          </span>
        </div>
        <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          Proyektor, Mic, Kabel, Alat Olahraga
        </p>
      </div>

      <!-- Card 3: Menunggu Approval -->
      <NuxtLink
        :to="isStaff ? '/approvals' : '#'"
        class="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm glass-card-interactive animate-entrance-delay-3 block group"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
            Perlu Persetujuan
          </span>
          <div class="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 group-hover:scale-105 transition-transform">
            ⏱️
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {{ totalPendingDisplay }}
          </span>
          <span v-if="totalPending > 0" class="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <span class="status-dot-radar status-dot-radar-amber w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            Tiket Baru
          </span>
          <span v-else class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Semua Tuntas
          </span>
        </div>
        <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          {{ stats.pending_room_reservations }} Ruang • {{ stats.pending_item_loans }} Barang
        </p>
      </NuxtLink>

      <!-- Card 4: Peminjaman Aktif -->
      <div class="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm glass-card-interactive animate-entrance-delay-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Sedang Dipinjam
          </span>
          <div class="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            🔄
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {{ activeLoansDisplay }}
          </span>
          <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span class="status-dot-radar status-dot-radar-green w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            Transaksi Aktif
          </span>
        </div>
        <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          Menunggu waktu pengembalian
        </p>
      </div>
    </div>

    <!-- Master Data Management Hub (Khusus Staff / Admin) -->
    <div v-if="isStaff" class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <span class="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            ⚙️ Master Data Sarpras
          </span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-900">
            Akses Administrator & Petugas
          </span>
        </div>
        <span class="text-xs text-slate-400">Pusat Pengelolaan Data Master</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Master User -->
        <NuxtLink
          to="/manage/users"
          class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm glass-card-interactive flex items-center justify-between group hover:border-indigo-500/50"
        >
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white text-xl shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              👥
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Master Pengguna (User)
              </div>
              <div class="text-[11px] text-slate-400">
                Kelola akun siswa, guru, petugas & admin
              </div>
            </div>
          </div>
          <span class="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
        </NuxtLink>

        <!-- Master Ruangan -->
        <NuxtLink
          to="/manage/rooms"
          class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm glass-card-interactive flex items-center justify-between group hover:border-indigo-500/50"
        >
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              🏢
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Master Ruangan
              </div>
              <div class="text-[11px] text-slate-400">
                Data ruang, kapasitas, & status perbaikan
              </div>
            </div>
          </div>
          <span class="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
        </NuxtLink>

        <!-- Master Barang -->
        <NuxtLink
          to="/manage/items"
          class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm glass-card-interactive flex items-center justify-between group hover:border-indigo-500/50"
        >
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xl shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              📦
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Master Barang & Aset
              </div>
              <div class="text-[11px] text-slate-400">
                Stok fisik, kondisi alat, & lokasi rak
              </div>
            </div>
          </div>
          <span class="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
        </NuxtLink>

        <!-- Lemari Loker (24 Pintu) -->
        <NuxtLink
          to="/lockers"
          class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm glass-card-interactive flex items-center justify-between group hover:border-teal-500/50"
        >
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-white text-xl shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              🗄️
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                Lemari Loker (24 Pintu)
              </div>
              <div class="text-[11px] text-slate-400">
                Data pemilik, keperluan & rincian isi
              </div>
            </div>
          </div>
          <span class="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Two Column Panels -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Panel: Jadwal / Reservasi Ruang -->
      <div class="lg:col-span-7 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm glass-card-interactive animate-entrance-delay-2">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="status-dot-radar status-dot-radar-blue w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
              Reservasi Ruangan Terkini
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daftar pemakaian ruangan dan status verifikasinya
            </p>
          </div>
          <NuxtLink to="/rooms" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Lihat Semua
          </NuxtLink>
        </div>

        <div v-if="recentRoomReservations.length > 0" class="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
          <div
            v-for="item in recentRoomReservations"
            :key="item.id"
            class="py-3.5 flex items-center justify-between gap-4"
          >
            <div class="min-w-0 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                🏢
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {{ item.room?.nama_ruang }}
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span>{{ item.user?.name }}</span>
                  <span>•</span>
                  <span>{{ formatDate(item.tanggal_pinjam) }} ({{ formatTime(item.jam_mulai) }} - {{ formatTime(item.jam_selesai) }})</span>
                </div>
              </div>
            </div>

            <span :class="['px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize shrink-0 inline-flex items-center gap-1', getStatusBadge(item.status)]">
              <span
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :class="{
                  'status-dot-radar status-dot-radar-amber bg-amber-500': item.status === 'pending',
                  'status-dot-radar status-dot-radar-green bg-emerald-500': item.status === 'disetujui',
                  'bg-rose-500': item.status === 'ditolak',
                  'bg-slate-400': !['pending','disetujui','ditolak'].includes(item.status)
                }"
              ></span>
              {{ item.status }}
            </span>
          </div>
        </div>

        <div v-else class="py-12 text-center text-slate-400 dark:text-slate-500">
          <p class="text-xs">Belum ada data reservasi ruangan saat ini.</p>
        </div>
      </div>

      <!-- Right Panel: Peminjaman Barang -->
      <div class="lg:col-span-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between glass-card-interactive animate-entrance-delay-3">
        <div>
          <div class="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span class="status-dot-radar status-dot-radar-blue w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                Peminjaman Barang
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Aktivitas peminjaman inventaris
              </p>
            </div>
            <NuxtLink to="/items" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Riwayat
            </NuxtLink>
          </div>

          <div v-if="recentItemLoans.length > 0" class="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
            <div
              v-for="loan in recentItemLoans"
              :key="loan.id"
              class="py-3.5 flex items-center justify-between gap-3"
            >
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {{ loan.details?.map(d => `${d.item?.nama_barang} (${d.jumlah})`).join(', ') || 'Alat Sarpra' }}
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Oleh: <span class="font-semibold text-slate-700 dark:text-slate-300">{{ loan.user?.name }}</span>
                </div>
              </div>

              <span :class="['px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize shrink-0 inline-flex items-center gap-1', getStatusBadge(loan.status)]">
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0"
                  :class="{
                    'status-dot-radar status-dot-radar-amber bg-amber-500': loan.status === 'pending',
                    'status-dot-radar status-dot-radar-blue bg-blue-500': loan.status === 'sedang_dipinjam',
                    'status-dot-radar status-dot-radar-green bg-emerald-500': loan.status === 'disetujui',
                    'bg-rose-500': loan.status === 'ditolak',
                    'bg-slate-400': !['pending','sedang_dipinjam','disetujui','ditolak'].includes(loan.status)
                  }"
                ></span>
                {{ loan.status.replace('_', ' ') }}
              </span>
            </div>
          </div>

          <div v-else class="py-12 text-center text-slate-400 dark:text-slate-500">
            <p class="text-xs">Belum ada riwayat peminjaman barang.</p>
          </div>
        </div>

        <div class="mt-6 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
          <div class="flex items-start gap-3">
            <span class="text-lg">📌</span>
            <div class="text-xs">
              <div class="font-bold text-indigo-950 dark:text-indigo-200">
                Alur Peminjaman Sarpra
              </div>
              <p class="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Pilih ruangan/alat → Tunggu persetujuan → Ambil fisik barang di Ruang Sarpra → Kembalikan tepat waktu dalam kondisi baik.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

