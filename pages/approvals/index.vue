<script setup>
const { isStaff } = useAuth()

// Pastikan hanya staff yang bisa membuka halaman ini
if (!isStaff.value) {
  navigateTo('/dashboard')
}

const { data: pageData, refresh } = await useFetch('/api/approvals')

const activeTab = ref('rooms')

const pendingRoomReservations = computed(() => pageData.value?.pendingRoomReservations || [])
const activeRoomReservations = computed(() => pageData.value?.activeRoomReservations || [])
const historyRoomReservations = computed(() => pageData.value?.historyRoomReservations || [])
const pendingItemLoans = computed(() => pageData.value?.pendingItemLoans || [])
const activeItemLoans = computed(() => pageData.value?.activeItemLoans || [])
const historyItemLoans = computed(() => pageData.value?.historyItemLoans || [])

// Modal Tolak
const showRejectModal = ref(false)
const rejectTarget = ref({ type: '', id: null, title: '' })
const rejectCatatan = ref('')

const openRejectModal = (type, item) => {
  rejectTarget.value = { type, id: item.id, title: item.nomor_peminjaman }
  rejectCatatan.value = ''
  showRejectModal.value = true
}

const submitReject = async () => {
  const endpoint = rejectTarget.value.type === 'room'
    ? '/api/approvals/rooms/reject'
    : '/api/approvals/items/reject'

  await $fetch(endpoint, {
    method: 'POST',
    body: { id: rejectTarget.value.id, catatan: rejectCatatan.value }
  })
  showRejectModal.value = false
  await refresh()
}

// Modal Cek Ruangan Selesai
const showRoomCheckoutModal = ref(false)
const checkoutRoomTarget = ref(null)
const roomDamageOptions = [
  'AC Rusak / Tidak Dingin',
  'Proyektor / Port HDMI Bermasalah',
  'Sound System / Mic Rusak',
  'Kursi / Meja Patah atau Rusak',
  'Stopkontak / Kelistrikan Rusak',
  'Pintu / Jendela / Kunci Rusak',
  'Banyak Sampah Berserakan'
]
const checkoutForm = reactive({
  kondisi_kebersihan: 'bersih',
  kondisi_fasilitas: 'baik',
  checklist_kerusakan: [],
  catatan_pengembalian: '',
  set_maintenance: false,
})

const openRoomCheckoutModal = (res) => {
  checkoutRoomTarget.value = res
  checkoutForm.kondisi_kebersihan = 'bersih'
  checkoutForm.kondisi_fasilitas = 'baik'
  checkoutForm.checklist_kerusakan = []
  checkoutForm.catatan_pengembalian = ''
  checkoutForm.set_maintenance = false
  showRoomCheckoutModal.value = true
}

const toggleRoomDamage = (item) => {
  const idx = checkoutForm.checklist_kerusakan.indexOf(item)
  if (idx > -1) {
    checkoutForm.checklist_kerusakan.splice(idx, 1)
  } else {
    checkoutForm.checklist_kerusakan.push(item)
  }
  if (checkoutForm.checklist_kerusakan.length > 0) {
    checkoutForm.set_maintenance = true
    checkoutForm.kondisi_fasilitas = 'rusak_ringan'
  } else {
    checkoutForm.set_maintenance = false
    checkoutForm.kondisi_fasilitas = 'baik'
  }
}

const submitRoomCheckout = async () => {
  try {
    const res = await $fetch('/api/approvals/rooms/complete', {
      method: 'POST',
      body: {
        id: checkoutRoomTarget.value.id,
        ...checkoutForm,
      }
    })
    showRoomCheckoutModal.value = false
    alert(res.message)
    await refresh()
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menyimpan pemeriksaan ruangan.')
  }
}

// Modal Pengembalian Barang
const showReturnModal = ref(false)
const returnTarget = ref(null)
const itemDamageOptions = [
  'Fisik Retak / Pecah / Patah',
  'Mati Total / Tidak Berfungsi',
  'Kabel Putus / Terkelupas / Port Bengkok',
  'Kelengkapan / Aksesori Hilang (Adaptor/Remote/Tas)',
  'Kotor Berat / Coretan Permanen',
  'Baut / Tombol / Engsel Rusak'
]
const returnItemsCheck = ref([])

const openReturnModal = (loan) => {
  returnTarget.value = loan
  returnItemsCheck.value = (loan.details || []).map(d => ({
    detail_id: d.id,
    item_id: d.item_id,
    nama_barang: d.item?.nama_barang,
    kode_barang: d.item?.kode_barang,
    satuan: d.item?.satuan || 'Unit',
    total_pinjam: d.jumlah,
    jumlah_baik: d.jumlah,
    jumlah_rusak: 0,
    checklist_kerusakan: [],
    catatan: ''
  }))
  showReturnModal.value = true
}

const toggleItemDamage = (check, damageType) => {
  const idx = check.checklist_kerusakan.indexOf(damageType)
  if (idx > -1) {
    check.checklist_kerusakan.splice(idx, 1)
  } else {
    check.checklist_kerusakan.push(damageType)
  }
}

const onJumlahRusakChange = (check) => {
  check.jumlah_rusak = Math.min(check.total_pinjam, Math.max(0, Number(check.jumlah_rusak) || 0))
  check.jumlah_baik = Math.max(0, check.total_pinjam - check.jumlah_rusak)
}

const onJumlahBaikChange = (check) => {
  check.jumlah_baik = Math.min(check.total_pinjam, Math.max(0, Number(check.jumlah_baik) || 0))
  check.jumlah_rusak = Math.max(0, check.total_pinjam - check.jumlah_baik)
}

const submitReturn = async () => {
  try {
    const res = await $fetch('/api/approvals/items/return', {
      method: 'POST',
      body: {
        id: returnTarget.value.id,
        items_check: returnItemsCheck.value
      }
    })
    showReturnModal.value = false
    alert(res.message)
    await refresh()
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal memproses pengembalian barang.')
  }
}

// Direct Actions
const approveRoom = async (id) => {
  if (confirm('Setujui reservasi ruangan ini?')) {
    await $fetch('/api/approvals/rooms/approve', { method: 'POST', body: { id } })
    await refresh()
  }
}

const approveItem = async (id) => {
  if (confirm('Setujui peminjaman barang ini? Stok fisik unit akan otomatis dipotong.')) {
    try {
      await $fetch('/api/approvals/items/approve', { method: 'POST', body: { id } })
      await refresh()
    } catch (err) {
      alert(err?.data?.statusMessage || err?.message || 'Gagal menyetujui.')
    }
  }
}

const handoverItem = async (id) => {
  if (confirm('Tandai barang sudah diserahterimakan kepada peminjam?')) {
    await $fetch('/api/approvals/items/handover', { method: 'POST', body: { id } })
    await refresh()
  }
}

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
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
  }
}

// formatTime & formatDate otomatis di-auto-import dari utils/formatters.ts
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-entrance">
      <div>
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-2">
          <span>🛡️</span>
          <span>Panel Khusus Petugas Sarpra & Admin</span>
        </div>
        <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Pusat Persetujuan & Verifikasi
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Verifikasi permohonan peminjaman ruangan dan pengeluaran inventaris barang sekolah.
        </p>
      </div>
    </div>

    <!-- Tabs Switcher -->
    <div class="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md overflow-x-auto animate-entrance-delay-1">
      <button
        type="button"
        @click="activeTab = 'rooms'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 shrink-0',
          activeTab === 'rooms'
            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <span>🏢</span>
        <span>Reservasi Ruang</span>
        <span
          v-if="pendingRoomReservations.length > 0"
          class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white"
        >
          {{ pendingRoomReservations.length }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'items'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 shrink-0',
          activeTab === 'items'
            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <span>📦</span>
        <span>Peminjaman Barang & Fisik</span>
        <span
          v-if="pendingItemLoans.length > 0"
          class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white"
        >
          {{ pendingItemLoans.length }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'history'"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 shrink-0',
          activeTab === 'history'
            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <span>📑</span>
        <span>Arsip & Riwayat Keputusan</span>
      </button>
    </div>

    <!-- TAB 1: PERSETUJUAN RUANGAN -->
    <div v-if="activeTab === 'rooms'" class="space-y-6 animate-entrance-delay-2">
      <!-- Section Pending -->
      <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm glass-card-interactive">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span class="status-dot-radar status-dot-radar-amber w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
            Permintaan Reservasi Ruang Menunggu Persetujuan ({{ pendingRoomReservations.length }})
          </h3>
        </div>

        <div v-if="pendingRoomReservations.length > 0" class="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
          <div
            v-for="res in pendingRoomReservations"
            :key="res.id"
            class="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {{ res.nomor_peminjaman }}
                </span>
                <span class="text-xs font-bold text-slate-900 dark:text-white">
                  • {{ res.room?.nama_ruang }} ({{ res.room?.lokasi }})
                </span>
              </div>
              <div class="text-xs text-slate-600 dark:text-slate-300">
                Pemohon: <span class="font-bold text-slate-800 dark:text-slate-100">{{ res.user?.name }}</span>
                <span class="text-slate-400"> ({{ res.user?.role }})</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>📅 {{ formatDate(res.tanggal_pinjam) }}</span>
                <span>⏰ {{ formatTime(res.jam_mulai) }} - {{ formatTime(res.jam_selesai) }} WIB</span>
              </div>
              <div class="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 max-w-2xl mt-1">
                <span class="font-semibold text-slate-700 dark:text-slate-300">Keperluan:</span> {{ res.tujuan_kegiatan }}
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                @click="approveRoom(res.id)"
                class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
              >
                ✓ Setujui
              </button>
              <button
                type="button"
                @click="openRejectModal('room', res)"
                class="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 dark:border-rose-900 transition-all"
              >
                ✕ Tolak
              </button>
            </div>
          </div>
        </div>

        <div v-else class="py-10 text-center text-slate-400">
          <p class="text-xs">Tidak ada permohonan reservasi ruangan yang menunggu persetujuan saat ini.</p>
        </div>
      </div>

      <!-- Section Active Rooms -->
      <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm glass-card-interactive">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span class="status-dot-radar status-dot-radar-green w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            Reservasi Ruang Aktif & Siap Diperiksa ({{ activeRoomReservations.length }})
          </h3>
        </div>

        <div v-if="activeRoomReservations.length > 0" class="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
          <div
            v-for="res in activeRoomReservations"
            :key="res.id"
            class="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {{ res.nomor_peminjaman }}
                </span>
                <span class="text-xs font-bold text-slate-900 dark:text-white">
                  • {{ res.room?.nama_ruang }}
                </span>
              </div>
              <div class="text-xs text-slate-600">
                Peminjam: <span class="font-bold">{{ res.user?.name }}</span>
              </div>
              <div class="text-xs text-slate-500">
                📅 {{ formatDate(res.tanggal_pinjam) }} ({{ formatTime(res.jam_mulai) }} - {{ formatTime(res.jam_selesai) }} WIB)
              </div>
            </div>

            <button
              type="button"
              @click="openRoomCheckoutModal(res)"
              class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>🧹</span>
              <span>Cek Selesai & Evaluasi</span>
            </button>
          </div>
        </div>

        <div v-else class="py-10 text-center text-slate-400">
          <p class="text-xs">Tidak ada reservasi ruangan yang sedang aktif saat ini.</p>
        </div>
      </div>
    </div>

    <!-- TAB 2: PERSETUJUAN BARANG -->
    <div v-if="activeTab === 'items'" class="space-y-6 animate-entrance-delay-2">
      <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm glass-card-interactive">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span class="status-dot-radar status-dot-radar-amber w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
            Permintaan Peminjaman Barang Menunggu Verifikasi ({{ pendingItemLoans.length }})
          </h3>
        </div>

        <div v-if="pendingItemLoans.length > 0" class="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
          <div
            v-for="loan in pendingItemLoans"
            :key="loan.id"
            class="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  {{ loan.nomor_peminjaman }}
                </span>
                <span class="text-xs font-bold text-slate-900 dark:text-white">
                  • {{ loan.user?.name }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2 pt-1">
                <div
                  v-for="d in loan.details"
                  :key="d.id"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-900"
                >
                  <span>📦 {{ d.item?.nama_barang }}</span>
                  <span class="text-blue-600 font-black">({{ d.jumlah }} Unit)</span>
                </div>
              </div>
              <div class="text-xs text-slate-500 pt-1">
                Periode: {{ formatDate(loan.tanggal_pinjam) }} s/d {{ formatDate(loan.tanggal_rencana_kembali) }}
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                @click="approveItem(loan.id)"
                class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
              >
                ✓ Setujui
              </button>
              <button
                type="button"
                @click="openRejectModal('item', loan)"
                class="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all"
              >
                ✕ Tolak
              </button>
            </div>
          </div>
        </div>

        <div v-else class="py-10 text-center text-slate-400">
          <p class="text-xs">Tidak ada permohonan peminjaman barang baru saat ini.</p>
        </div>
      </div>

      <!-- Peminjaman Aktif -->
      <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm glass-card-interactive">
        <div class="pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span class="status-dot-radar status-dot-radar-blue w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
            Peminjaman Barang Aktif (Serah Terima & Pengembalian) ({{ activeItemLoans.length }})
          </h3>
        </div>

        <div v-if="activeItemLoans.length > 0" class="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
          <div
            v-for="loan in activeItemLoans"
            :key="loan.id"
            class="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-blue-600">
                  {{ loan.nomor_peminjaman }}
                </span>
                <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', getStatusBadge(loan.status)]">
                  {{ loan.status.replace('_', ' ') }}
                </span>
                <span class="text-xs font-bold text-slate-900 dark:text-white">
                  • {{ loan.user?.name }}
                </span>
              </div>
              <div class="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                {{ loan.details?.map(d => `${d.item?.nama_barang} (${d.jumlah} Unit)`).join(', ') }}
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                v-if="loan.status === 'disetujui'"
                type="button"
                @click="handoverItem(loan.id)"
                class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                📤 Serahkan Barang
              </button>
              <button
                v-if="loan.status === 'sedang_dipinjam'"
                type="button"
                @click="openReturnModal(loan)"
                class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm"
              >
                📥 Terima Pengembalian
              </button>
            </div>
          </div>
        </div>

        <div v-else class="py-10 text-center text-slate-400">
          <p class="text-xs">Tidak ada barang yang sedang aktif dipinjam saat ini.</p>
        </div>
      </div>
    </div>

    <!-- TAB 3: RIWAYAT / ARSIP -->
    <div v-if="activeTab === 'history'" class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm glass-card-interactive animate-entrance-delay-2">
      <h3 class="text-base font-bold text-slate-900 dark:text-white mb-4">
        Catatan Keputusan Petugas Terakhir
      </h3>

      <div class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
        <div v-for="h in historyRoomReservations" :key="h.id" class="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900 dark:text-white">{{ h.room?.nama_ruang }}</span>
              <span class="text-slate-400">oleh {{ h.user?.name }} ({{ formatDate(h.tanggal_pinjam) }})</span>
            </div>
            <div v-if="h.kondisi_kebersihan || h.kondisi_fasilitas" class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100">Kebersihan: {{ h.kondisi_kebersihan }}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100">Fasilitas: {{ h.kondisi_fasilitas }}</span>
            </div>
          </div>
          <span :class="['px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize', getStatusBadge(h.status)]">
            {{ h.status }}
          </span>
        </div>
      </div>
    </div>

    <!-- REJECT MODAL -->
    <div v-if="showRejectModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h3 class="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
          Tolak Permohonan: {{ rejectTarget.title }}
        </h3>
        <textarea
          v-model="rejectCatatan"
          rows="3"
          placeholder="Tuliskan alasan penolakan..."
          class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs"
        ></textarea>
        <div class="flex justify-end gap-2 mt-4">
          <button @click="showRejectModal = false" class="px-4 py-2 rounded-xl text-xs font-semibold">Batal</button>
          <button @click="submitReject" class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600">Tolak Permohonan</button>
        </div>
      </div>
    </div>

    <!-- ROOM CHECKOUT MODAL DENGAN INSPEKSI KERUSAKAN -->
    <div v-if="showRoomCheckoutModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-scale-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Inspeksi Pasca Pemakaian</span>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
              {{ checkoutRoomTarget?.room?.nama_ruang }}
            </h3>
            <div class="text-xs text-slate-400">Peminjam: {{ checkoutRoomTarget?.user?.name }}</div>
          </div>
          <button @click="showRoomCheckoutModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div class="space-y-4 text-xs">
          <!-- Kondisi Umum -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold mb-1 text-slate-700 dark:text-slate-300">Kondisi Kebersihan</label>
              <select v-model="checkoutForm.kondisi_kebersihan" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2">
                <option value="bersih">✨ Bersih & Rapi</option>
                <option value="kotor">⚠️ Kotor / Ada Sampah</option>
              </select>
            </div>
            <div>
              <label class="block font-bold mb-1 text-slate-700 dark:text-slate-300">Status Fasilitas</label>
              <select v-model="checkoutForm.kondisi_fasilitas" class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2">
                <option value="baik">✓ Normal & Berfungsi</option>
                <option value="rusak_ringan">⚠️ Ada Kerusakan Ringan</option>
                <option value="rusak_berat">❌ Kerusakan Berat</option>
              </select>
            </div>
          </div>

          <!-- Checklist Poin Kerusakan Ruangan -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <label class="block font-bold text-slate-800 dark:text-slate-200">
              Poin Kerusakan / Kendala (Centang jika ada):
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <label
                v-for="opt in roomDamageOptions"
                :key="opt"
                class="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors"
                :class="checkoutForm.checklist_kerusakan.includes(opt) ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-semibold' : 'text-slate-600 dark:text-slate-300'"
              >
                <input
                  type="checkbox"
                  :checked="checkoutForm.checklist_kerusakan.includes(opt)"
                  @change="toggleRoomDamage(opt)"
                  class="rounded text-amber-600 focus:ring-amber-500"
                />
                <span class="text-[11px]">{{ opt }}</span>
              </label>
            </div>
          </div>

          <!-- Lock Maintenance Checkbox -->
          <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between">
            <div>
              <div class="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <span>🔒</span>
                <span>Kunci Ruangan untuk Perbaikan (Maintenance)</span>
              </div>
              <div class="text-[10px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                Ruangan ini tidak akan bisa dipinjam oleh guru/siswa lain sampai perbaikan selesai.
              </div>
            </div>
            <input
              type="checkbox"
              id="maint"
              v-model="checkoutForm.set_maintenance"
              class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
          </div>

          <!-- Catatan Tindak Lanjut -->
          <div>
            <label class="block font-bold mb-1 text-slate-700 dark:text-slate-300">Catatan Pemeriksaan & Tindak Lanjut</label>
            <textarea
              v-model="checkoutForm.catatan_pengembalian"
              rows="2"
              placeholder="Contoh: Remote AC hilang, teknisi sarpra sudah dihubungi untuk perbaikan..."
              class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button @click="showRoomCheckoutModal = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
          <button @click="submitRoomCheckout" class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-md">Simpan Hasil Pemeriksaan</button>
        </div>
      </div>
    </div>

    <!-- RETURN MODAL DENGAN INSPEKSI STOK & KERUSAKAN -->
    <div v-if="showReturnModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-scale-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Penerimaan & Cek Fisik Barang</span>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
              No. Pinjam: {{ returnTarget?.nomor_peminjaman }}
            </h3>
            <div class="text-xs text-slate-400">Peminjam: {{ returnTarget?.user?.name }}</div>
          </div>
          <button @click="showReturnModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div class="space-y-4 text-xs">
          <!-- Item Inspection Cards -->
          <div
            v-for="check in returnItemsCheck"
            :key="check.detail_id"
            class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="font-extrabold text-slate-900 dark:text-white text-sm">
                  {{ check.nama_barang }}
                </div>
                <div class="text-[10px] font-mono text-slate-400">{{ check.kode_barang }}</div>
              </div>
              <span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                Total Dipinjam: {{ check.total_pinjam }} {{ check.satuan }}
              </span>
            </div>

            <!-- Jumlah Baik vs Jumlah Rusak -->
            <div class="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label class="block font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  ✓ Unit Kondisi BAIK (Bisa Dipinjam Lagi)
                </label>
                <input
                  type="number"
                  min="0"
                  :max="check.total_pinjam"
                  v-model.number="check.jumlah_baik"
                  @input="onJumlahBaikChange(check)"
                  class="w-full rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 p-2 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                />
              </div>

              <div>
                <label class="block font-bold text-rose-700 dark:text-rose-400 mb-1">
                  ⚠️ Unit RUSAK (Dikarantina)
                </label>
                <input
                  type="number"
                  min="0"
                  :max="check.total_pinjam"
                  v-model.number="check.jumlah_rusak"
                  @input="onJumlahRusakChange(check)"
                  class="w-full rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 p-2 text-xs font-bold text-rose-700 dark:text-rose-400"
                />
              </div>
            </div>

            <!-- Jika ada unit rusak: Tampilkan checklist kerusakan -->
            <div v-if="check.jumlah_rusak > 0" class="pt-2 space-y-2 border-t border-rose-200/60 dark:border-rose-900/40">
              <div class="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <span>⚠️</span>
                <span>Pilih Poin Kerusakan pada {{ check.jumlah_rusak }} unit tersebut:</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <label
                  v-for="dOpt in itemDamageOptions"
                  :key="dOpt"
                  class="flex items-center gap-2 p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 cursor-pointer"
                  :class="check.checklist_kerusakan.includes(dOpt) ? 'bg-rose-100/70 dark:bg-rose-950/60 font-semibold text-rose-900 dark:text-rose-200' : 'text-slate-600 dark:text-slate-300'"
                >
                  <input
                    type="checkbox"
                    :checked="check.checklist_kerusakan.includes(dOpt)"
                    @change="toggleItemDamage(check, dOpt)"
                    class="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span class="text-[10px]">{{ dOpt }}</span>
                </label>
              </div>

              <!-- Keterangan Tambahan -->
              <div>
                <input
                  type="text"
                  v-model="check.catatan"
                  placeholder="Keterangan spesifik (misal: kabel HDMI putus di ujung port)..."
                  class="w-full rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-800 p-2 text-xs"
                />
              </div>

              <div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[10px] text-amber-800 dark:text-amber-300">
                💡 <strong>Penyesuaian Stok Otomatis:</strong> Hanya <strong>{{ check.jumlah_baik }} unit</strong> yang kembali ke stok siap pinjam. Sebanyak <strong>{{ check.jumlah_rusak }} unit rusak</strong> otomatis dikunci dan tidak bisa dipinjam siswa/guru lain.
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button @click="showReturnModal = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100">Batal</button>
          <button @click="submitReturn" class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-md">Selesaikan Pengembalian</button>
        </div>
      </div>
    </div>
  </div>
</template>

