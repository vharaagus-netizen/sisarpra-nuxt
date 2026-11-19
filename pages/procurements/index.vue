<script setup>
const { user, isStaff } = useAuth()

const { data: pageData, refresh: fetchProcurements, pending: loading } = await useFetch('/api/procurements')
const procurements = computed(() => pageData.value?.procurements?.data || [])

const showModal = ref(false)
const showReviewModal = ref(false)
const selectedProcurement = ref(null)

const form = reactive({
  nama_barang: '',
  kategori: 'Elektronik & IT',
  jumlah: 1,
  estimasi_biaya: '',
  urgensi: 'sedang',
  alasan_kebutuhan: '',
  lokasi_penempatan: ''
})

const reviewForm = reactive({
  status: 'disetujui',
  catatan_admin: ''
})

const categories = [
  'Elektronik & IT',
  'Meubeler & Ruangan',
  'Laboratorium IPA / Komputer',
  'Sarana Olahraga & Seni',
  'Audio & Visual',
  'Kebersihan & Sanitasi',
  'Perlengkapan Umum'
]

const submitProcurement = async () => {
  if (!form.nama_barang || !form.alasan_kebutuhan) {
    alert('Nama barang dan alasan kebutuhan wajib diisi!')
    return
  }

  try {
    await $fetch('/api/procurements/store', {
      method: 'POST',
      body: {
        nama_barang: form.nama_barang,
        kategori: form.kategori,
        jumlah: form.jumlah,
        estimasi_biaya: form.estimasi_biaya ? Number(form.estimasi_biaya) : null,
        urgensi: form.urgensi,
        alasan_kebutuhan: form.alasan_kebutuhan,
        lokasi_penempatan: form.lokasi_penempatan
      }
    })

    showModal.value = false
    // Reset form
    form.nama_barang = ''
    form.kategori = 'Elektronik & IT'
    form.jumlah = 1
    form.estimasi_biaya = ''
    form.urgensi = 'sedang'
    form.alasan_kebutuhan = ''
    form.lokasi_penempatan = ''

    await fetchProcurements()
    alert('Usulan pengadaan sarana berhasil diajukan ke Bagian Sarpras!')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal mengajukan usulan.')
  }
}

const openReview = (p) => {
  selectedProcurement.value = p
  reviewForm.status = p.status
  reviewForm.catatan_admin = p.catatan_admin || ''
  showReviewModal.value = true
}

const submitReview = async () => {
  if (!selectedProcurement.value) return
  try {
    await $fetch('/api/procurements/review', {
      method: 'POST',
      body: {
        id: selectedProcurement.value.id,
        status: reviewForm.status,
        catatan_admin: reviewForm.catatan_admin
      }
    })

    showReviewModal.value = false
    await fetchProcurements()
    alert('Status usulan berhasil diperbarui!')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal memperbarui status usulan.')
  }
}

const formatCurrency = (val) => {
  if (!val) return 'Tidak dicantumkan'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val)
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const getStatusBadge = (status) => {
  switch (status) {
    case 'menunggu_review':
      return { label: 'Menunggu Review', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' }
    case 'disetujui':
      return { label: 'Disetujui', class: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' }
    case 'dianggarkan':
      return { label: 'Dianggarkan (RAPBS)', class: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' }
    case 'terealisasi':
      return { label: 'Terealisasi', class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' }
    case 'ditolak':
      return { label: 'Ditolak', class: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' }
    default:
      return { label: status, class: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' }
  }
}

const getUrgencyBadge = (urgency) => {
  switch (urgency) {
    case 'mendesak':
      return { label: 'Mendesak 🔥', class: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900' }
    case 'tinggi':
      return { label: 'Tinggi ⚡', class: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900' }
    case 'sedang':
      return { label: 'Sedang', class: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900' }
    default:
      return { label: 'Rendah', class: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' }
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-2">
          <span>📝</span>
          Partisipasi Sarana Sekolah
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Usulan Sarana & Prasarana
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ajukan permohonan pengadaan atau peremajaan fasilitas pembelajaran di SMA Nusaputera.
        </p>
      </div>

      <div>
        <button
          type="button"
          @click="showModal = true"
          class="btn-shimmer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/25 transition-all duration-200 active:scale-95"
        >
          <span>➕</span>
          <span>Ajukan Usulan Baru</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <div class="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="procurements.length === 0" class="glass-card-interactive p-12 text-center rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80">
      <span class="text-5xl block mb-3">📦</span>
      <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">Belum Ada Usulan</h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
        Anda belum memiliki usulan sarana yang diajukan. Butuh proyektor baru, perbaikan meja, atau alat lab? Silakan ajukan di sini.
      </p>
      <button
        type="button"
        @click="showModal = true"
        class="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500 shadow-md shadow-amber-600/20"
      >
        Ajukan Sekarang
      </button>
    </div>

    <!-- Procurements Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div
        v-for="p in procurements"
        :key="p.id"
        class="glass-card-interactive p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-amber-500/50 transition-all duration-200"
      >
        <div>
          <!-- Top Row: Category & Status -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {{ p.kategori }}
            </span>
            <span :class="['text-[10px] font-bold px-2.5 py-0.5 rounded-full border', getStatusBadge(p.status).class]">
              {{ getStatusBadge(p.status).label }}
            </span>
          </div>

          <!-- Title & Quantity -->
          <h3 class="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
            {{ p.nama_barang }}
          </h3>
          <div class="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
            Jumlah: {{ p.jumlah }} Unit / Paket
          </div>

          <!-- Urgency & Placement -->
          <div class="flex items-center gap-2 mt-3 text-xs">
            <span :class="['px-2 py-0.5 rounded-md font-semibold border text-[11px]', getUrgencyBadge(p.urgensi).class]">
              {{ getUrgencyBadge(p.urgensi).label }}
            </span>
            <span v-if="p.lokasi_penempatan" class="text-slate-500 dark:text-slate-400 truncate text-[11px]">
              📍 {{ p.lokasi_penempatan }}
            </span>
          </div>

          <!-- Reason -->
          <div class="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 italic line-clamp-3">
            "{{ p.alasan_kebutuhan }}"
          </div>

          <!-- Estimasi Biaya -->
          <div class="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span class="text-slate-400">Estimasi Biaya:</span>
            <span class="font-bold text-slate-700 dark:text-slate-200">{{ formatCurrency(p.estimasi_biaya) }}</span>
          </div>

          <!-- Admin Note if any -->
          <div v-if="p.catatan_admin" class="mt-3 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300">
            <div class="font-bold text-[10px] uppercase text-blue-700 dark:text-blue-400">Catatan Tim Sarpras:</div>
            <div>{{ p.catatan_admin }}</div>
          </div>
        </div>

        <!-- Footer Info & Actions -->
        <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div>
            Diajukan oleh: <span class="font-semibold text-slate-700 dark:text-slate-300">{{ p.user?.name }}</span>
            <div class="text-[10px]">{{ formatDate(p.created_at) }}</div>
          </div>

          <div v-if="isStaff">
            <button
              type="button"
              @click="openReview(p)"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
            >
              Review Status
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form Usulan Baru -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>✨</span> Formulir Usulan Sarpras Baru
          </h2>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
        </div>

        <form @submit.prevent="submitProcurement" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Fasilitas / Sarana Yang Diusulkan *
            </label>
            <input
              type="text"
              v-model="form.nama_barang"
              placeholder="Contoh: Kabel HDMI 15 Meter / Proyektor Epson"
              required
              class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Fasilitas
              </label>
              <select
                v-model="form.kategori"
                class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Kebutuhan
              </label>
              <input
                type="number"
                min="1"
                v-model="form.jumlah"
                required
                class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tingkat Urgensi
              </label>
              <select
                v-model="form.urgensi"
                class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="rendah">Rendah (Dapat ditunda)</option>
                <option value="sedang">Sedang (Bulan ini)</option>
                <option value="tinggi">Tinggi (Penting)</option>
                <option value="mendesak">Mendesak 🔥 (Segera/Rusak)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estimasi Biaya (Rp, Opsional)
              </label>
              <input
                type="number"
                v-model="form.estimasi_biaya"
                placeholder="Contoh: 350000"
                class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rencana Lokasi Penempatan
            </label>
            <input
              type="text"
              v-model="form.lokasi_penempatan"
              placeholder="Contoh: Lab Komputer 1 / Ruang Kelas XII MIPA 2"
              class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alasan Kebutuhan / Uraian Masalah *
            </label>
            <textarea
              v-model="form.alasan_kebutuhan"
              rows="3"
              required
              placeholder="Jelaskan mengapa barang ini dibutuhkan dan bagaimana dampaknya terhadap kegiatan belajar mengajar..."
              class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/25"
            >
              Kirimkan Usulan
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Review Khusus Staff / Admin -->
    <div
      v-if="showReviewModal && selectedProcurement"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">
            🛠️ Review Usulan Sarpras
          </h2>
          <button @click="showReviewModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
        </div>

        <form @submit.prevent="submitReview" class="p-6 space-y-4">
          <div>
            <div class="text-xs text-slate-400">Usulan Barang:</div>
            <div class="font-bold text-sm text-slate-900 dark:text-white">{{ selectedProcurement.nama_barang }}</div>
            <div class="text-xs text-slate-500 mt-0.5">Pemohon: {{ selectedProcurement.user?.name }}</div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Perbarui Status Pengadaan
            </label>
            <select
              v-model="reviewForm.status"
              class="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="menunggu_review">Menunggu Review</option>
              <option value="disetujui">Disetujui Tim Sarpras</option>
              <option value="dianggarkan">Dianggarkan ke RAPBS / BOS</option>
              <option value="terealisasi">Terealisasi (Barang Siap)</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Tindak Lanjut Admin
            </label>
            <textarea
              v-model="reviewForm.catatan_admin"
              rows="3"
              placeholder="Contoh: Disetujui masuk belanja anggaran BOS Triwulan 2..."
              class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              @click="showReviewModal = false"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

