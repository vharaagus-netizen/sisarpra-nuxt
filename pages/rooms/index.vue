<script setup>
const { user, isStaff } = useAuth()
const { data: pageData, refresh } = await useFetch('/api/rooms', {
  getCachedData: () => undefined,
})

const rooms = computed(() => pageData.value?.rooms || [])
const reservations = computed(() => pageData.value?.reservations?.data || [])
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
const searchQuery = ref('')
const userSearchQuery = ref('')

// Booking Modal State
const showModal = ref(false)
const form = ref({
  room_id: '',
  user_id: '',
  tanggal_pinjam: new Date().toISOString().split('T')[0],
  jam_mulai: '08:00',
  jam_selesai: '10:00',
  tujuan_kegiatan: '',
  direct_status: 'disetujui',
})
const submitting = ref(false)
const bookingError = ref('')

const showPrintModal = ref(false)
const selectedReservationForPrint = ref(null)

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

const openRoomPermit = (res) => {
  selectedReservationForPrint.value = res
  showPrintModal.value = true
}

const printDocument = () => {
  window.print()
}

// Schedule Checker Modal State
const showScheduleModal = ref(false)
const scheduleRoom = ref(null)
const scheduleDate = ref(new Date().toISOString().split('T')[0])
const scheduleBookings = ref([])
const loadingSchedule = ref(false)

// Time slots
const timeSlots = [
  { start: '07:00', end: '08:00', label: '07:00 - 08:00' },
  { start: '08:00', end: '09:00', label: '08:00 - 09:00' },
  { start: '09:00', end: '10:00', label: '09:00 - 10:00' },
  { start: '10:00', end: '11:00', label: '10:00 - 11:00' },
  { start: '11:00', end: '12:00', label: '11:00 - 12:00' },
  { start: '12:00', end: '13:00', label: '12:00 - 13:00' },
  { start: '13:00', end: '14:00', label: '13:00 - 14:00' },
  { start: '14:00', end: '15:00', label: '14:00 - 15:00' },
  { start: '15:00', end: '16:00', label: '15:00 - 16:00' },
  { start: '16:00', end: '17:00', label: '16:00 - 17:00' },
]

const modalBookings = computed(() => {
  if (!form.value.room_id || !form.value.tanggal_pinjam) return []
  const room = rooms.value.find((r) => String(r.id) === String(form.value.room_id))
  if (!room || !room.reservations) return []
  return room.reservations.filter((res) => {
    const resDate = res.tanggal_pinjam ? res.tanggal_pinjam.substring(0, 10) : ''
    return resDate === form.value.tanggal_pinjam && ['pending', 'disetujui'].includes(res.status)
  })
})

const isSlotBooked = (slot, bookingsList) => {
  return bookingsList.some((b) => {
    const bStart = formatTime(b.jam_mulai)
    const bEnd = formatTime(b.jam_selesai)
    return slot.start < bEnd && slot.end > bStart
  })
}

const currentConflict = computed(() => {
  if (!form.value.jam_mulai || !form.value.jam_selesai) return null
  return modalBookings.value.find((b) => {
    const bStart = formatTime(b.jam_mulai)
    const bEnd = formatTime(b.jam_selesai)
    return form.value.jam_mulai < bEnd && form.value.jam_selesai > bStart
  })
})

const pickSlot = (slot) => {
  form.value.jam_mulai = slot.start
  form.value.jam_selesai = slot.end
}

const openBookingModal = (room = null) => {
  // Segarkan data pengguna secara real-time di background
  refresh()

  form.value.tanggal_pinjam = new Date().toISOString().split('T')[0]
  form.value.jam_mulai = '08:00'
  form.value.jam_selesai = '10:00'
  form.value.tujuan_kegiatan = ''
  userSearchQuery.value = ''
  bookingError.value = ''

  form.value.user_id = user.value?.id || ''
  form.value.direct_status = isStaff.value ? 'disetujui' : 'pending'

  if (room) {
    form.value.room_id = room.id
  } else if (rooms.value.length > 0) {
    form.value.room_id = rooms.value[0].id
  }
  showModal.value = true
}

const submitBooking = async () => {
  try {
    submitting.value = true
    bookingError.value = ''
    await $fetch('/api/rooms/book', {
      method: 'POST',
      body: form.value,
    })
    showModal.value = false
    activeTab.value = 'history'
    await refresh()
  } catch (err) {
    bookingError.value = err?.data?.statusMessage || err?.message || 'Gagal mengirim pengajuan peminjaman.'
  } finally {
    submitting.value = false
  }
}

const cancelReservation = async (id) => {
  if (confirm('Apakah Anda yakin ingin membatalkan pengajuan peminjaman ruangan ini?')) {
    try {
      await $fetch('/api/rooms/cancel', {
        method: 'POST',
        body: { id },
      })
      await refresh()
    } catch (err) {
      alert(err?.data?.statusMessage || err?.message || 'Gagal membatalkan.')
    }
  }
}

// Schedule Checker
const openScheduleModal = async (room) => {
  scheduleRoom.value = room
  scheduleDate.value = new Date().toISOString().split('T')[0]
  showScheduleModal.value = true
  await fetchSchedule(room.id, scheduleDate.value)
}

const changeScheduleDate = async (e) => {
  scheduleDate.value = e.target.value
  if (scheduleRoom.value) {
    await fetchSchedule(scheduleRoom.value.id, scheduleDate.value)
  }
}

const fetchSchedule = async (roomId, date) => {
  loadingSchedule.value = true
  try {
    const data = await $fetch(`/api/rooms/schedule?room_id=${roomId}&date=${date}`)
    scheduleBookings.value = data.bookings || []
  } catch {
    scheduleBookings.value = []
  } finally {
    loadingSchedule.value = false
  }
}

const filteredRooms = computed(() => {
  if (!searchQuery.value) return rooms.value
  const q = searchQuery.value.toLowerCase()
  return rooms.value.filter(
    (r) =>
      r.nama_ruang.toLowerCase().includes(q) ||
      r.kode_ruang.toLowerCase().includes(q) ||
      (r.lokasi && r.lokasi.toLowerCase().includes(q)) ||
      (r.fasilitas && r.fasilitas.toLowerCase().includes(q))
  )
})

const getStatusBadge = (status) => {
  switch (status) {
    case 'disetujui':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
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

// formatTime & formatDate otomatis di-auto-import dari utils/formatters.ts
</script>

<template>
  <div>
    <!-- Non-printable Web Page UI -->
    <div class="print:hidden space-y-6 max-w-7xl mx-auto">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-entrance">
      <div>
        <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Layanan Peminjaman Ruang
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Satu ruangan dapat dipinjam beberapa kali dalam sehari pada rentang waktu (time frame) yang berbeda tanpa bentrok.
        </p>
      </div>

      <button
        type="button"
        @click="openBookingModal()"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 btn-shimmer"
      >
        <span>➕</span>
        <span>{{ isStaff ? 'Catat Peminjaman Ruang (Staf)' : 'Ajukan Peminjaman Ruang' }}</span>
      </button>
    </div>

    <!-- Tab Navigation & Search Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4 animate-entrance-delay-1">
      <div class="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
        <button
          type="button"
          @click="activeTab = 'catalog'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2',
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          <span>🏢</span>
          <span>Katalog Ruangan ({{ rooms.length }})</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'history'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2',
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          <span>📋</span>
          <span>Riwayat / Status Tiket ({{ reservations.length }})</span>
        </button>
      </div>

      <div v-if="activeTab === 'catalog'" class="relative w-full sm:w-72">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Cari ruang / lokasi / fasilitas..."
          class="pl-4 pr-4 py-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 outline-none"
        />
      </div>
    </div>

    <!-- TAB 1: KATALOG RUANGAN -->
    <div v-if="activeTab === 'catalog'">
      <div v-if="filteredRooms.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="room in filteredRooms"
          :key="room.id"
          class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between group glass-card-interactive animate-entrance-delay-2"
        >
          <div>
            <div class="flex items-start justify-between gap-2">
              <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-105 transition-transform duration-200">
                🏢
              </div>
              <div class="text-right">
                <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {{ room.kode_ruang }}
                </span>
                <div class="mt-1">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border',
                      room.status === 'tersedia'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : room.status === 'perbaikan'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                    ]"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="room.status === 'tersedia'
                        ? 'bg-emerald-500 status-dot-radar status-dot-radar-green'
                        : room.status === 'perbaikan'
                          ? 'bg-amber-500 status-dot-radar status-dot-radar-amber'
                          : 'bg-rose-500 status-dot-radar status-dot-radar-red'"
                    ></span>
                    {{ room.status === 'perbaikan' ? 'Sedang Perbaikan' : room.status }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-4">
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {{ room.nama_ruang }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <span>📍</span>
                <span>{{ room.lokasi || 'Lokasi Sekolah' }}</span>
              </p>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <div class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span class="text-slate-400 dark:text-slate-500">Kapasitas:</span>
                <span class="font-bold">{{ room.kapasitas || 0 }} Orang</span>
              </div>

              <div v-if="room.fasilitas" class="text-xs">
                <span class="text-slate-400 dark:text-slate-500 block mb-1">Fasilitas:</span>
                <p class="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 line-clamp-2">
                  {{ room.fasilitas }}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="openScheduleModal(room)"
              class="py-2.5 px-3 rounded-xl text-xs font-bold text-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all duration-200 flex items-center justify-center gap-1.5"
            >
              <span>⏱️ Cek Jadwal</span>
            </button>

            <button
              type="button"
              @click="openBookingModal(room)"
              :disabled="room.status !== 'tersedia'"
              class="py-2.5 px-3 rounded-xl text-xs font-bold text-center transition-all duration-200 flex items-center justify-center gap-1.5"
              :class="
                room.status === 'tersedia'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              "
            >
              <span>{{ room.status === 'perbaikan' ? '🛠️ Perbaikan' : 'Pesan Ruang' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="p-12 text-center text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
        <p class="text-sm font-semibold">Tidak ditemukan ruangan dengan kata kunci tersebut.</p>
      </div>
    </div>

    <!-- TAB 2: RIWAYAT / STATUS TIKET -->
    <div v-if="activeTab === 'history'" class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
      <div class="p-6 border-b border-slate-200/80 dark:border-slate-800">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">
          Daftar Pengajuan Peminjaman Ruang
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Lacak status persetujuan atau batalkan permohonan yang masih dalam status pending.
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th class="p-4">No. Peminjaman</th>
              <th class="p-4">Ruangan</th>
              <th class="p-4">Pemohon</th>
              <th class="p-4">Tanggal & Waktu</th>
              <th class="p-4">Keperluan</th>
              <th class="p-4">Status</th>
              <th class="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            <tr
              v-for="res in reservations"
              :key="res.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <td class="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {{ res.nomor_peminjaman }}
              </td>
              <td class="p-4 font-bold text-slate-900 dark:text-white">
                {{ res.room?.nama_ruang }}
                <div class="text-[10px] text-slate-400 font-normal">{{ res.room?.lokasi }}</div>
              </td>
              <td class="p-4 text-slate-700 dark:text-slate-300">
                {{ res.user?.name }}
              </td>
              <td class="p-4 text-slate-700 dark:text-slate-300">
                <div class="font-semibold">{{ formatDate(res.tanggal_pinjam) }}</div>
                <div class="text-[11px] text-slate-400">
                  {{ formatTime(res.jam_mulai) }} - {{ formatTime(res.jam_selesai) }} WIB
                </div>
              </td>
              <td class="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" :title="res.tujuan_kegiatan">
                {{ res.tujuan_kegiatan }}
              </td>
              <td class="p-4">
                <span :class="['px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize inline-flex items-center gap-1 w-fit', getStatusBadge(res.status)]">
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="{
                      'status-dot-radar status-dot-radar-amber bg-amber-500': res.status === 'pending',
                      'status-dot-radar status-dot-radar-green bg-emerald-500': res.status === 'disetujui',
                      'bg-rose-500': res.status === 'ditolak',
                      'bg-slate-400': !['pending','disetujui','ditolak'].includes(res.status)
                    }"
                  ></span>
                  {{ res.status }}
                </span>
                <div v-if="res.status === 'selesai'" class="mt-1 flex flex-col gap-0.5 text-[9px] font-semibold">
                  <span :class="res.kondisi_kebersihan === 'bersih' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                    {{ res.kondisi_kebersihan === 'bersih' ? '✨ Bersih & Rapi' : '⚠️ Kotor' }}
                  </span>
                  <span :class="res.kondisi_fasilitas === 'baik' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                    {{ res.kondisi_fasilitas === 'baik' ? '✓ Fasilitas Normal' : '⚠️ Ada Kerusakan' }}
                  </span>
                </div>
              </td>
              <td class="p-4 text-right space-x-2 whitespace-nowrap">
                <button
                  v-if="['disetujui', 'selesai'].includes(res.status)"
                  type="button"
                  @click="openRoomPermit(res)"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 transition-colors inline-flex items-center gap-1"
                  title="Cetak Surat Izin Ruangan"
                >
                  <span>📄</span>
                  <span>Bukti Izin</span>
                </button>
                <button
                  v-if="['pending', 'disetujui'].includes(res.status)"
                  type="button"
                  @click="cancelReservation(res.id)"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
                >
                  Batalkan
                </button>
                <span v-else-if="!['disetujui', 'selesai'].includes(res.status)" class="text-slate-400 text-[11px]">—</span>
              </td>
            </tr>

            <tr v-if="reservations.length === 0">
              <td colspan="7" class="p-8 text-center text-slate-400">
                Belum ada data pengajuan peminjaman ruangan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL FORM PENGAJUAN PINJAM RUANG -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 transition-all duration-200 my-8">
        <button
          type="button"
          @click="showModal = false"
          class="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
        >
          ✕
        </button>

        <div class="mb-5">
          <span class="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 mb-2">
            {{ isStaff ? 'Entri Reservasi Petugas' : 'Form Pengajuan' }}
          </span>
          <h3 class="text-xl font-extrabold text-slate-900 dark:text-white">
            {{ isStaff ? 'Catat Peminjaman Ruangan' : 'Peminjaman Ruangan Berbasis Time Frame' }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ isStaff ? 'Pilih peminjam (siswa/guru/staf), ruangan yang akan dipinjam, serta rentang jam kegiatan.' : 'Pilih slot jam yang tersedia (berwarna hijau). Anda bebas meminjam di jam yang belum terpakai orang lain.' }}
          </p>
        </div>

        <div v-if="bookingError" class="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{{ bookingError }}</span>
        </div>

        <form @submit.prevent="submitBooking" class="space-y-5">
          <!-- Bagian Pemilihan Peminjam (Khusus Admin / Petugas) -->
          <div v-if="isStaff" class="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <span>👤</span>
                <span>Peminjam / Penanggung Jawab Ruangan</span>
              </label>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="refreshUsers"
                  :disabled="refreshingUsers"
                  class="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
                  title="Segarkan daftar pengguna terbaru dari database"
                >
                  <span :class="{ 'animate-spin': refreshingUsers }">🔄</span>
                  <span>{{ refreshingUsers ? 'Memuat...' : 'Segarkan Data' }}</span>
                </button>
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                  {{ filteredUsers.length }} Orang
                </span>
              </div>
            </div>

            <!-- Filter Pencarian Pengguna -->
            <input
              type="text"
              v-model="userSearchQuery"
              placeholder="🔍 Cari nama, NIS, NIP, atau kelas peminjam..."
              class="w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
            />

            <select
              v-model="form.user_id"
              required
              class="w-full rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              <option :value="user?.id">-- Diri Sendiri ({{ user?.name }} - {{ user?.role?.toUpperCase() }}) --</option>
              <optgroup :label="`Daftar Pengguna Terdaftar (${filteredUsers.length} orang)`">
                <option v-for="u in filteredUsers" :key="u.id" :value="u.id">
                  [{{ u.role.toUpperCase() }}] {{ u.name }} {{ u.kelas_jurusan ? `• ${u.kelas_jurusan}` : '' }} {{ u.nomor_induk ? `(No: ${u.nomor_induk})` : '' }}
                </option>
              </optgroup>
            </select>

            <div v-if="selectedBorrowerDetail" class="text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-2 pt-0.5">
              <span class="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
              <span>Terpilih: <strong>{{ selectedBorrowerDetail.name }}</strong> ({{ selectedBorrowerDetail.role }}) {{ selectedBorrowerDetail.kelas_jurusan ? `• ${selectedBorrowerDetail.kelas_jurusan}` : '' }}</span>
            </div>
          </div>

          <!-- Pilihan Status Khusus Staff -->
          <div v-if="isStaff" class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-800 dark:text-slate-200">Status Persetujuan Reservasi</label>
            <div class="grid grid-cols-2 gap-2">
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
                ✅ Langsung Disetujui (Kunci Jadwal)
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
                ⏳ Masuk Antrean Pending
              </button>
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400">
              <span v-if="form.direct_status === 'disetujui'">Jadwal ruangan langsung berstatus disetujui dan terkunci di timeline peminjaman.</span>
              <span v-else>Pengajuan reservasi disimpan sebagai pending untuk dikonfirmasi kemudian.</span>
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold mb-1">Pilih Ruangan</label>
              <select
                v-model="form.room_id"
                required
                class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="" disabled>-- Pilih Ruangan --</option>
                <option
                  v-for="r in rooms"
                  :key="r.id"
                  :value="r.id"
                  :disabled="r.status !== 'tersedia'"
                >
                  {{ r.nama_ruang }} ({{ r.status }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold mb-1">Tanggal Peminjaman</label>
              <input
                type="date"
                v-model="form.tanggal_pinjam"
                :min="new Date().toISOString().split('T')[0]"
                required
                class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <!-- Time Slots Grid -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-800 dark:text-slate-200">
                ⏱️ Peta Ketersediaan Jam ({{ formatDate(form.tanggal_pinjam) }}):
              </span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                v-for="slot in timeSlots"
                :key="slot.start"
                type="button"
                @click="!isSlotBooked(slot, modalBookings) ? pickSlot(slot) : null"
                :disabled="isSlotBooked(slot, modalBookings)"
                :class="[
                  'p-2 rounded-xl text-center text-xs font-bold border transition-all duration-150',
                  isSlotBooked(slot, modalBookings)
                    ? 'bg-rose-50 text-rose-700 border-rose-200 cursor-not-allowed opacity-80'
                    : (form.jam_mulai <= slot.start && form.jam_selesai >= slot.end)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-400'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                ]"
              >
                <div class="text-[11px] leading-tight">{{ slot.label }}</div>
                <div class="text-[9px] mt-0.5 font-normal">
                  {{ isSlotBooked(slot, modalBookings) ? '❌ Terisi' : '✓ Siap Pakai' }}
                </div>
              </button>
            </div>

            <div
              v-if="currentConflict"
              class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"
            >
              <span>⚠️</span>
              <span><strong>Jadwal Bentrok!</strong> Slot jam bertabrakan dengan jadwal yang sudah ada.</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold mb-1">Jam Mulai</label>
              <input
                type="time"
                v-model="form.jam_mulai"
                required
                class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">Jam Selesai</label>
              <input
                type="time"
                v-model="form.jam_selesai"
                required
                class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold mb-1">Tujuan / Keperluan Kegiatan</label>
            <textarea
              v-model="form.tujuan_kegiatan"
              rows="2"
              required
              placeholder="Contoh: Latihan debat OSIS persiapan lomba tingkat kota"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submitting || Boolean(currentConflict)"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md disabled:opacity-50"
            >
              {{ submitting ? 'Memproses...' : (isStaff && form.direct_status === 'disetujui') ? 'Simpan & Kunci Jadwal Ruangan' : 'Kirim Pengajuan Peminjaman' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL CEK JADWAL -->
    <div
      v-if="showScheduleModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          @click="showScheduleModal = false"
          class="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
        >
          ✕
        </button>

        <h3 class="text-xl font-extrabold text-slate-900 dark:text-white">
          {{ scheduleRoom?.nama_ruang }}
        </h3>
        <p class="text-xs text-slate-500 mb-4">
          Lokasi: {{ scheduleRoom?.lokasi }} • Kapasitas: {{ scheduleRoom?.kapasitas }} Orang
        </p>

        <div class="mb-4">
          <label class="block text-xs font-bold mb-1">Pilih Tanggal Pengecekan:</label>
          <input
            type="date"
            :value="scheduleDate"
            @change="changeScheduleDate"
            class="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-3 py-2"
          />
        </div>

        <div class="space-y-2 max-h-60 overflow-y-auto">
          <div v-if="loadingSchedule" class="text-center py-6 text-xs text-slate-400">
            Memuat jadwal...
          </div>
          <div v-else-if="scheduleBookings.length > 0" class="space-y-2">
            <div
              v-for="b in scheduleBookings"
              :key="b.id"
              class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
            >
              <div>
                <div class="font-bold text-slate-900 dark:text-white">{{ b.tujuan_kegiatan }}</div>
                <div class="text-[11px] text-slate-500">Oleh: {{ b.user?.name }}</div>
              </div>
              <div class="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {{ formatTime(b.jam_mulai) }} - {{ formatTime(b.jam_selesai) }} WIB
              </div>
            </div>
          </div>
          <div v-else class="text-center py-6 text-xs text-emerald-600 font-semibold">
            ✨ Ruangan kosong dan siap digunakan sepanjang hari pada tanggal ini.
          </div>
        </div>
      </div>
    </div>
    </div>
    <!-- END Non-printable Web Page UI -->

    <!-- MODAL PREVIEW SURAT IZIN RUANGAN & CETAK (ISOLASI CETAK RESMI 1 HALAMAN) -->
    <div
      v-if="showPrintModal && selectedReservationForPrint"
      id="print-modal-container"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:static print:block print:w-full print:p-0 print:m-0 print:bg-white print:overflow-visible print-document-container"
    >
      <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto print:static print:block print:w-full print:max-w-none print:p-0 print:m-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible print:bg-white print-document-body">
        <!-- Action Buttons (Hidden when printing) -->
        <div class="print:hidden flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
          <div class="flex items-center gap-2">
            <span class="text-xl">📄</span>
            <span class="font-bold text-sm text-slate-900 dark:text-white">Surat Izin Pemakaian Ruangan</span>
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
              SURAT IZIN<br />RUANGAN
            </div>
          </div>

          <!-- Judul Dokumen -->
          <div class="text-center mb-3">
            <h2 class="text-xs sm:text-sm font-bold uppercase underline tracking-wide">
              SURAT PERSETUJUAN & IZIN PENGGUNAAN RUANGAN
            </h2>
            <p class="text-[10px] font-sans text-gray-600 mt-0.5">
              Nomor: <span class="font-mono font-bold">{{ selectedReservationForPrint.nomor_reservasi }}</span>
            </p>
          </div>

          <!-- Keterangan Izin Ruangan -->
          <div class="text-[11px] font-sans space-y-1 mb-3 text-gray-800 bg-gray-50/60 p-2.5 rounded border border-gray-200">
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Nama Pemohon / Peminjam</span>
              <span class="col-span-2 font-bold">: {{ selectedReservationForPrint.user?.name }} ({{ selectedReservationForPrint.user?.role }})</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Ruangan yang Dipinjam</span>
              <span class="col-span-2 font-bold text-indigo-900">: {{ selectedReservationForPrint.room?.nama_ruang }} (Kode: {{ selectedReservationForPrint.room?.kode_ruang }})</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Lokasi / Lantai</span>
              <span class="col-span-2">: {{ selectedReservationForPrint.room?.lokasi }} • Lantai {{ selectedReservationForPrint.room?.lantai }}</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Hari & Tanggal</span>
              <span class="col-span-2">: {{ formatDate(selectedReservationForPrint.tanggal_pinjam) }}</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Alokasi Waktu</span>
              <span class="col-span-2 font-mono font-bold">: {{ formatTime(selectedReservationForPrint.jam_mulai) }} - {{ formatTime(selectedReservationForPrint.jam_selesai) }} WIB</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Keperluan / Kegiatan</span>
              <span class="col-span-2">: {{ selectedReservationForPrint.tujuan_kegiatan }}</span>
            </div>
            <div class="grid grid-cols-3">
              <span class="text-gray-500">Status Validasi</span>
              <span class="col-span-2 font-bold text-emerald-700 uppercase">: {{ selectedReservationForPrint.status }} (TERVERIFIKASI)</span>
            </div>
          </div>

          <!-- Tata Tertib Ruangan -->
          <div class="text-[9px] font-sans text-gray-700 mb-3 bg-gray-50 p-2 rounded border border-gray-200 leading-tight">
            <span class="font-bold">Tata Tertib Penggunaan Fasilitas Ruangan:</span>
            <ol class="list-decimal pl-3 space-y-0.5 mt-0.5">
              <li>Pemakai ruangan wajib menjaga kebersihan ruangan, membuang sampah pada tempatnya, serta mematikan AC, lampu, dan proyektor setelah selesai.</li>
              <li>Dilarang mengubah tata letak barang/mebel permanen tanpa izin staf sarana dan prasarana.</li>
              <li>Pemeriksaan kondisi sebelum dan sesudah kegiatan akan dilakukan oleh petugas piket sarpra.</li>
            </ol>
          </div>

          <!-- Tanda Tangan -->
          <div class="grid grid-cols-2 text-[10.5px] font-sans mt-4 pt-1">
            <div class="text-left">
              <p>Pemohon Izin,</p>
              <div class="h-12"></div>
              <p class="font-bold underline">( {{ selectedReservationForPrint.user?.name }} )</p>
              <p class="text-[9.5px] text-gray-600 capitalize">{{ selectedReservationForPrint.user?.role }}</p>
            </div>
            <div class="text-right">
              <p>Semarang, {{ formatDate(selectedReservationForPrint.tanggal_pinjam) }}</p>
              <p>Petugas / Pengelola Ruang,</p>
              <div class="h-12"></div>
              <p class="font-bold underline">( {{ selectedReservationForPrint.approver?.name || 'Petugas Sarpra' }} )</p>
              <p class="text-[9.5px] text-gray-600">Bagian Sarana & Prasarana</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
