<script setup>
const { user, isStaff } = useAuth()
const router = useRouter()

// Tab State: 'catalog' | 'handovers'
const activeTab = ref('catalog')

// Filter State
const search = ref('')
const filterKelas = ref('all')
const filterKurikulum = ref('all')
const filterSumberDana = ref('all')

// Fetch Books Catalog
const { data: booksData, refresh: fetchBooks, pending: loadingBooks } = await useFetch('/api/books', {
  query: computed(() => ({
    search: search.value || undefined,
    kelas: filterKelas.value,
    kurikulum: filterKurikulum.value,
    sumber_dana: filterSumberDana.value
  }))
})

// Fetch BAST Handovers
const { data: handoversData, refresh: fetchHandovers, pending: loadingHandovers } = await useFetch('/api/books/handovers')

const books = computed(() => booksData.value?.books?.data || [])
const stats = computed(() => booksData.value?.stats || {
  total_judul: 0,
  total_eksemplar: 0,
  stok_tersedia: 0,
  stok_dipinjam: 0,
  total_bos: 0
})

const handovers = computed(() => handoversData.value?.handovers?.data || [])

// Modal Book Form State
const showBookModal = ref(false)
const isEditingBook = ref(false)
const bookForm = reactive({
  id: null,
  kode_buku: '',
  judul: '',
  kelas: 'X',
  kurikulum: 'Kurikulum Merdeka',
  mata_pelajaran: '',
  penerbit: 'Erlangga',
  tahun_terbit: 2023,
  tahun_anggaran: 2026,
  sumber_dana: 'BOS',
  total_stok: 45,
  stok_tersedia: 45,
  lokasi_rak: 'Perpustakaan SMA',
  kondisi: 'baik',
  keterangan: '',
  foto: ''
})

// Modal BAST Form State
const showHandoverModal = ref(false)
const handoverForm = reactive({
  judul_acara: 'SERAH TERIMA BUKU AJAR BOS TAHUN ANGGARAN 2026',
  tahun_anggaran: 2026,
  tanggal_serah_terima: new Date().toISOString().split('T')[0],
  pihak_pertama_nama: 'Gloria Putri Ixora, S.Pd.',
  pihak_pertama_jabatan: 'Tim Pengadaan Buku Ajar BOS',
  pihak_kedua_nama: 'Emanuel Suryajaya, S.Kom.',
  pihak_kedua_jabatan: 'Koordinator Sarpra SMA Nusaputera',
  mengetahui_nama: 'Nining Tri Palupi, S.Pd., M.Pd.',
  mengetahui_jabatan: 'Kepala SMA Nusaputera',
  catatan: '',
  file_bast_signed: '',
  auto_sync_inventory: true,
  items: [
    { judul_buku: 'Prakarya dan Kewirausahaan', kelas: 'X', penerbit: 'Erlangga', tahun: 2023, jumlah: 45 },
    { judul_buku: 'Prakarya dan Kewirausahaan', kelas: 'XI', penerbit: 'Erlangga', tahun: 2023, jumlah: 45 },
    { judul_buku: 'Prakarya dan Kewirausahaan', kelas: 'XII', penerbit: 'Erlangga', tahun: 2023, jumlah: 45 }
  ]
})

// Modal Cetak BAST State
const showPrintModal = ref(false)
const selectedHandover = ref(null)

// Modal Lampiran Scan BAST Bertanda Tangan
const showAttachBastModal = ref(false)
const attachTargetHandover = ref(null)
const attachFileUrl = ref('')
const attachingBast = ref(false)

// Modal Preview Foto Sampul Buku
const showBookPhotoModal = ref(false)
const bookPhotoPreview = reactive({ title: '', url: '' })

// Action Handlers: Book
const openAddBook = () => {
  isEditingBook.value = false
  bookForm.id = null
  bookForm.kode_buku = ''
  bookForm.judul = ''
  bookForm.kelas = 'X'
  bookForm.kurikulum = 'Kurikulum Merdeka'
  bookForm.mata_pelajaran = ''
  bookForm.penerbit = 'Erlangga'
  bookForm.tahun_terbit = 2023
  bookForm.tahun_anggaran = 2026
  bookForm.sumber_dana = 'BOS'
  bookForm.total_stok = 1
  bookForm.stok_tersedia = 1
  bookForm.lokasi_rak = 'Perpustakaan SMA'
  bookForm.kondisi = 'baik'
  bookForm.keterangan = ''
  bookForm.foto = ''
  showBookModal.value = true
}

const openEditBook = (b) => {
  isEditingBook.value = true
  bookForm.id = b.id
  bookForm.kode_buku = b.kode_buku
  bookForm.judul = b.judul
  bookForm.kelas = b.kelas
  bookForm.kurikulum = b.kurikulum
  bookForm.mata_pelajaran = b.mata_pelajaran || ''
  bookForm.penerbit = b.penerbit || ''
  bookForm.tahun_terbit = b.tahun_terbit || 2023
  bookForm.tahun_anggaran = b.tahun_anggaran || 2026
  bookForm.sumber_dana = b.sumber_dana || 'BOS'
  bookForm.total_stok = b.total_stok
  bookForm.stok_tersedia = b.stok_tersedia
  bookForm.lokasi_rak = b.lokasi_rak || ''
  bookForm.kondisi = b.kondisi || 'baik'
  bookForm.keterangan = b.keterangan || ''
  bookForm.foto = b.foto || ''
  showBookModal.value = true
}

const submitBook = async () => {
  if (!bookForm.judul || !bookForm.kelas) {
    alert('Judul buku dan jenjang kelas wajib diisi!')
    return
  }
  try {
    const res = await $fetch('/api/books/save', {
      method: 'POST',
      body: bookForm
    })
    showBookModal.value = false
    await fetchBooks()
    alert(res.message || 'Data buku berhasil disimpan.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menyimpan buku.')
  }
}

const deleteBook = async (b) => {
  if (!confirm(`Hapus buku "${b.judul}" Kelas ${b.kelas} dari inventaris?`)) return
  try {
    const res = await $fetch('/api/books/delete', {
      method: 'POST',
      body: { id: b.id }
    })
    await fetchBooks()
    alert(res.message || 'Buku berhasil dihapus.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menghapus buku.')
  }
}

// Action Handlers: BAST Handover
const addHandoverItemRow = () => {
  handoverForm.items.push({
    judul_buku: '',
    kelas: 'X',
    penerbit: 'Erlangga',
    tahun: 2023,
    jumlah: 1
  })
}

const removeHandoverItemRow = (idx) => {
  if (handoverForm.items.length <= 1) {
    alert('Minimal harus ada 1 item buku dalam Berita Acara.')
    return
  }
  handoverForm.items.splice(idx, 1)
}

const submitHandover = async () => {
  if (!handoverForm.tanggal_serah_terima) {
    alert('Tanggal serah terima wajib diisi!')
    return
  }

  const validItems = handoverForm.items.filter(i => i.judul_buku && String(i.judul_buku).trim())
  if (validItems.length === 0) {
    alert('Harap isi minimal 1 judul buku yang diserahterimakan!')
    return
  }

  try {
    const res = await $fetch('/api/books/handovers/create', {
      method: 'POST',
      body: {
        ...handoverForm,
        items: validItems
      }
    })

    showHandoverModal.value = false
    handoverForm.file_bast_signed = ''
    await fetchHandovers()
    await fetchBooks()

    alert(res.message || 'Berita Acara berhasil dibuat!')
    // Langsung buka preview cetak
    if (res.handover) {
      openPrint(res.handover)
    }
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal membuat Berita Acara.')
  }
}

const openAttachBastModal = (h) => {
  attachTargetHandover.value = h
  attachFileUrl.value = h.file_bast_signed || ''
  showAttachBastModal.value = true
}

const submitAttachBast = async () => {
  if (!attachTargetHandover.value) return
  attachingBast.value = true
  try {
    const res = await $fetch('/api/books/handovers/attach', {
      method: 'POST',
      body: {
        id: attachTargetHandover.value.id,
        file_bast_signed: attachFileUrl.value
      }
    })
    showAttachBastModal.value = false
    await fetchHandovers()
    alert(res.message || 'Lampiran BAST berhasil diperbarui.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menyimpan lampiran scan BAST.')
  } finally {
    attachingBast.value = false
  }
}

const openBookPhotoPreview = (b) => {
  bookPhotoPreview.title = `${b.judul} (Kelas ${b.kelas})`
  bookPhotoPreview.url = b.foto
  showBookPhotoModal.value = true
}

const deleteHandover = async (h) => {
  if (!confirm(`Hapus dokumen Berita Acara nomor "${h.nomor_surat}"? (Data buku di katalog tidak akan terhapus).`)) return
  try {
    const res = await $fetch('/api/books/handovers/delete', {
      method: 'POST',
      body: { id: h.id }
    })
    await fetchHandovers()
    alert(res.message || 'Dokumen Berita Acara berhasil dihapus.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menghapus Berita Acara.')
  }
}

const openPrint = (h) => {
  selectedHandover.value = h
  showPrintModal.value = true
}

const triggerPrint = () => {
  window.print()
}

// Formatters
const formalDate = computed(() => {
  if (!selectedHandover.value?.tanggal_serah_terima) {
    return { hari: '..........', tanggal: '......', bulan: '..............', tahun: '.......................', full: 'Semarang, ..................' }
  }
  return formatDateFormalBAST(selectedHandover.value.tanggal_serah_terima)
})
</script>

<template>
  <div>
    <!-- Screen View UI -->
    <div class="space-y-6 print:hidden">
    <!-- Header Area Screen View -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            Aset & Bahan Ajar Sekolah
          </span>
          <span class="text-xs text-slate-400">• Standar Dana BOS</span>
        </div>
        <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Inventaris Buku & Berita Acara (BAST)
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Pencatatan inventaris buku ajar paket BOS/Mandiri SMA Nusaputera dan generator cetak Berita Acara Serah Terima resmi.
        </p>
      </div>

      <!-- Header Action Buttons -->
      <div class="flex items-center gap-2.5">
        <button
          v-if="isStaff"
          type="button"
          @click="showHandoverModal = true"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all"
        >
          <span>📜</span>
          <span>+ Buat Berita Acara (BAST)</span>
        </button>

        <button
          v-if="isStaff"
          type="button"
          @click="openAddBook"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-md shadow-orange-600/25 transition-all"
        >
          <span>📚</span>
          <span>+ Tambah Buku Manual</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl print:hidden">
      <button
        type="button"
        @click="activeTab = 'catalog'"
        :class="[
          'flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all',
          activeTab === 'catalog'
            ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <span class="text-base">📚</span>
        <span>Katalog & Stok Buku Pelajaran</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300">
          {{ stats.total_judul }} Judul
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'handovers'"
        :class="[
          'flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all',
          activeTab === 'handovers'
            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <span class="text-base">📜</span>
        <span>Berita Acara Serah Terima (BAST)</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
          {{ handovers.length }} Dokumen
        </span>
      </button>
    </div>

    <!-- Metric Stats Widgets (Katalog View) -->
    <div v-if="activeTab === 'catalog'" class="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Total Judul Buku
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-white mt-1">
          {{ stats.total_judul }} <span class="text-xs font-normal text-slate-400">judul</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-1">
          Buku paket & pegangan ajar
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div class="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
          Total Fisik Eksemplar
        </div>
        <div class="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
          {{ stats.total_eksemplar }} <span class="text-xs font-normal text-slate-400">eks</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-1">
          Tersedia: {{ stats.stok_tersedia }} eks
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Sumber Dana BOS
        </div>
        <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
          {{ stats.total_bos }} <span class="text-xs font-normal text-slate-400">judul</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-1">
          BOS Reguler & Kinerja
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          Dipinjamkan ke Siswa
        </div>
        <div class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
          {{ stats.stok_dipinjam }} <span class="text-xs font-normal text-slate-400">eks</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-1">
          Distribusi paket semester
        </div>
      </div>
    </div>

    <!-- TAB 1: KATALOG BUKU -->
    <div v-if="activeTab === 'catalog'" class="space-y-4 print:hidden">
      <!-- Search & Filter Bar -->
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div class="flex-1 w-full relative">
          <input
            v-model="search"
            type="text"
            placeholder="Cari judul buku, kode, penerbit, atau mapel..."
            class="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <span class="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
        </div>

        <!-- Filter Kelas -->
        <select
          v-model="filterKelas"
          class="w-full md:w-36 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
        >
          <option value="all">Semua Kelas</option>
          <option value="X">Kelas X</option>
          <option value="XI">Kelas XI</option>
          <option value="XII">Kelas XII</option>
        </select>

        <!-- Filter Kurikulum -->
        <select
          v-model="filterKurikulum"
          class="w-full md:w-44 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
        >
          <option value="all">Semua Kurikulum</option>
          <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
          <option value="K13">Kurikulum 2013 (K13)</option>
        </select>

        <!-- Filter Sumber Dana -->
        <select
          v-model="filterSumberDana"
          class="w-full md:w-40 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
        >
          <option value="all">Semua Sumber</option>
          <option value="BOS">Dana BOS</option>
          <option value="Mandiri">Mandiri / Yayasan</option>
        </select>

        <button
          type="button"
          @click="fetchBooks"
          class="w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
        >
          🔄 Segarkan
        </button>
      </div>

      <!-- Tabel Katalog Buku -->
      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="py-3.5 px-4">Kode & Judul Buku</th>
                <th class="py-3.5 px-4 text-center">Kelas</th>
                <th class="py-3.5 px-4">Penerbit & Thn</th>
                <th class="py-3.5 px-4">Kurikulum & Sumber</th>
                <th class="py-3.5 px-4 text-center">Total Stok</th>
                <th class="py-3.5 px-4 text-center">Tersedia</th>
                <th class="py-3.5 px-4">Lokasi Rak</th>
                <th v-if="isStaff" class="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              <tr v-if="loadingBooks" class="animate-pulse">
                <td colspan="8" class="py-8 text-center text-slate-400">
                  Memuat data inventaris buku...
                </td>
              </tr>

              <tr v-else-if="books.length === 0">
                <td colspan="8" class="py-12 text-center text-slate-400">
                  <div class="text-3xl mb-2">📚</div>
                  <div class="font-bold text-slate-600 dark:text-slate-300">
                    Belum ada data buku di inventaris
                  </div>
                  <div class="text-[11px] text-slate-400 mt-1">
                    Buat Berita Acara (BAST) atau klik "+ Tambah Buku Manual" untuk menginput data buku.
                  </div>
                </td>
              </tr>

              <tr
                v-else
                v-for="b in books"
                :key="b.id"
                class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <!-- Kode & Judul -->
                <td class="py-3 px-4">
                  <div class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 flex-wrap">
                    <span>{{ b.judul }}</span>
                    <button
                      v-if="b.foto"
                      type="button"
                      @click="openBookPhotoPreview(b)"
                      class="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                      title="Lihat Foto Sampul Buku"
                    >
                      📷 Foto
                    </button>
                  </div>
                  <div class="text-[10px] font-mono text-slate-400 mt-0.5">
                    {{ b.kode_buku }} • {{ b.mata_pelajaran || 'Mata Pelajaran Wajib' }}
                  </div>
                </td>

                <!-- Kelas -->
                <td class="py-3 px-4 text-center">
                  <span class="px-2 py-0.5 rounded-lg text-xs font-black bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                    {{ b.kelas }}
                  </span>
                </td>

                <!-- Penerbit & Tahun -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <div class="font-semibold text-slate-800 dark:text-slate-200">
                    {{ b.penerbit || '-' }}
                  </div>
                  <div class="text-[10px] text-slate-400">
                    Tahun Terbit: {{ b.tahun_terbit || '-' }}
                  </div>
                </td>

                <!-- Kurikulum & Sumber -->
                <td class="py-3 px-4 whitespace-nowrap">
                  <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {{ b.kurikulum }}
                  </div>
                  <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    Dana: {{ b.sumber_dana }} {{ b.tahun_anggaran ? `(${b.tahun_anggaran})` : '' }}
                  </div>
                </td>

                <!-- Total Stok -->
                <td class="py-3 px-4 text-center whitespace-nowrap font-bold text-slate-900 dark:text-white">
                  {{ b.total_stok }} <span class="text-[10px] font-normal text-slate-400">eks</span>
                </td>

                <!-- Stok Tersedia -->
                <td class="py-3 px-4 text-center whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                  {{ b.stok_tersedia }} <span class="text-[10px] font-normal text-slate-400">eks</span>
                </td>

                <!-- Lokasi Rak -->
                <td class="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {{ b.lokasi_rak || 'Perpustakaan' }}
                </td>

                <!-- Aksi -->
                <td v-if="isStaff" class="py-3 px-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      @click="openEditBook(b)"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Data Buku"
                    >
                      ✏️
                    </button>
                    <button
                      v-if="user?.role === 'admin'"
                      type="button"
                      @click="deleteBook(b)"
                      class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Hapus Buku"
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
    </div>

    <!-- TAB 2: BERITA ACARA SERAH TERIMA (BAST) -->
    <div v-else class="space-y-4 print:hidden">
      <div class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
              Arsip Dokumen Berita Acara Serah Terima (BAST)
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daftar surat serah terima buku ajar dari Tim Pengadaan BOS kepada Koordinator Sarpra.
            </p>
          </div>
          <button
            v-if="isStaff"
            type="button"
            @click="showHandoverModal = true"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/30 flex items-center gap-1.5 transition-all"
          >
            <span>➕</span>
            <span>Buat BAST Baru</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="py-3.5 px-4">No. Surat & Judul</th>
                <th class="py-3.5 px-4">Tgl Serah Terima</th>
                <th class="py-3.5 px-4">Pihak Pertama (Pengadaan)</th>
                <th class="py-3.5 px-4">Pihak Kedua (Sarpra)</th>
                <th class="py-3.5 px-4">Daftar Buku (Rincian)</th>
                <th class="py-3.5 px-4 text-center">Total Eks</th>
                <th class="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              <tr v-if="loadingHandovers" class="animate-pulse">
                <td colspan="7" class="py-8 text-center text-slate-400">
                  Memuat arsip berita acara...
                </td>
              </tr>

              <tr v-else-if="handovers.length === 0">
                <td colspan="7" class="py-12 text-center text-slate-400">
                  <div class="text-3xl mb-2">📜</div>
                  <div class="font-bold text-slate-600 dark:text-slate-300">
                    Belum ada dokumen Berita Acara yang dibuat
                  </div>
                  <div class="text-[11px] text-slate-400 mt-1">
                    Klik tombol "Buat BAST Baru" untuk mencatat serah terima buku dan mencetak surat resminya.
                  </div>
                </td>
              </tr>

              <tr
                v-else
                v-for="h in handovers"
                :key="h.id"
                class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <!-- No Surat & Judul -->
                <td class="py-3.5 px-4">
                  <div class="font-mono font-bold text-slate-900 dark:text-white">
                    {{ h.nomor_surat }}
                  </div>
                  <div class="text-[10px] text-slate-500 font-medium mt-0.5 max-w-xs truncate" :title="h.judul_acara">
                    {{ h.judul_acara }}
                  </div>
                  <div v-if="h.file_bast_signed" class="mt-1">
                    <a
                      :href="h.file_bast_signed"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:underline"
                    >
                      ✅ Arsip Scan Bertanda Tangan ↗
                    </a>
                  </div>
                </td>

                <!-- Tgl Serah Terima -->
                <td class="py-3.5 px-4 whitespace-nowrap">
                  <div class="font-bold text-slate-800 dark:text-slate-200">
                    {{ formatDate(h.tanggal_serah_terima) }}
                  </div>
                  <div class="text-[10px] text-slate-400">
                    TA: {{ h.tahun_anggaran }}
                  </div>
                </td>

                <!-- Pihak I -->
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-800 dark:text-slate-200">
                    {{ h.pihak_pertama_nama }}
                  </div>
                  <div class="text-[10px] text-slate-400">
                    {{ h.pihak_pertama_jabatan }}
                  </div>
                </td>

                <!-- Pihak II -->
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-800 dark:text-slate-200">
                    {{ h.pihak_kedua_nama }}
                  </div>
                  <div class="text-[10px] text-slate-400">
                    {{ h.pihak_kedua_jabatan }}
                  </div>
                </td>

                <!-- Daftar Buku Rincian -->
                <td class="py-3.5 px-4 max-w-sm">
                  <ul class="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <li v-for="(itm, idx) in h.items" :key="idx" class="truncate" :title="`${itm.judul_buku} kelas ${itm.kelas}, Penerbit ${itm.penerbit} (${itm.jumlah} eks)`">
                      {{ itm.judul_buku }} kelas {{ itm.kelas }} ({{ itm.jumlah }} eks)
                    </li>
                  </ul>
                </td>

                <!-- Total Eks -->
                <td class="py-3.5 px-4 text-center whitespace-nowrap font-bold text-orange-600 dark:text-orange-400">
                  {{ h.items?.reduce((s, i) => s + (Number(i.jumlah) || 0), 0) }} <span class="text-[10px] font-normal text-slate-400">eks</span>
                </td>

                <!-- Aksi -->
                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      @click="openAttachBastModal(h)"
                      :class="[
                        'px-2.5 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1',
                        h.file_bast_signed
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      ]"
                      title="Upload / Lihat Scan PDF atau Foto BAST Bertanda Tangan Basah"
                    >
                      <span>📎</span>
                      <span>{{ h.file_bast_signed ? 'Arsip' : 'Upload Scan' }}</span>
                    </button>

                    <button
                      type="button"
                      @click="openPrint(h)"
                      class="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                      title="Lihat & Cetak Berita Acara Resmi (A4)"
                    >
                      <span>🖨️</span>
                      <span>Cetak BAST</span>
                    </button>

                    <button
                      v-if="user?.role === 'admin'"
                      type="button"
                      @click="deleteHandover(h)"
                      class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Hapus Dokumen BAST"
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
    </div>

    <!-- MODAL 1: FORM BUAT BERITA ACARA (BAST) BARU -->
    <div
      v-if="showHandoverModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📜</span>
              <span>Buat Berita Acara Serah Terima Buku Ajar BOS</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Format resmi serah terima buku dari Tim Pengadaan BOS kepada Koordinator Sarpra.
            </p>
          </div>
          <button
            type="button"
            @click="showHandoverModal = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="submitHandover" class="space-y-4 mt-4 text-xs">
          <!-- Judul Acara & Tanggal -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Judul Berita Acara
              </label>
              <input
                v-model="handoverForm.judul_acara"
                type="text"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tahun Anggaran
              </label>
              <input
                v-model.number="handoverForm.tahun_anggaran"
                type="number"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Serah Terima <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="handoverForm.tanggal_serah_terima"
                type="date"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                v-model="handoverForm.catatan"
                type="text"
                placeholder="Misal: Paket semester genap tahun ajaran 2026/2027"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <!-- Bagian Pihak Pertama & Kedua -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div class="font-bold text-slate-800 dark:text-white text-[11px] uppercase tracking-wide flex items-center gap-1.5">
              <span>✍️</span>
              <span>Pihak yang Terlibat dalam Berita Acara</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-600 dark:text-slate-400 mb-0.5 text-[10px]">
                  Pihak PERTAMA (Nama):
                </label>
                <input
                  v-model="handoverForm.pihak_pertama_nama"
                  type="text"
                  required
                  class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <input
                  v-model="handoverForm.pihak_pertama_jabatan"
                  type="text"
                  placeholder="Jabatan"
                  class="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                />
              </div>

              <div>
                <label class="block font-semibold text-slate-600 dark:text-slate-400 mb-0.5 text-[10px]">
                  Pihak KEDUA (Nama):
                </label>
                <input
                  v-model="handoverForm.pihak_kedua_nama"
                  type="text"
                  required
                  class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <input
                  v-model="handoverForm.pihak_kedua_jabatan"
                  type="text"
                  placeholder="Jabatan"
                  class="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                />
              </div>
            </div>

            <div>
              <label class="block font-semibold text-slate-600 dark:text-slate-400 mb-0.5 text-[10px]">
                Mengetahui (Kepala Sekolah):
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  v-model="handoverForm.mengetahui_nama"
                  type="text"
                  required
                  class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <input
                  v-model="handoverForm.mengetahui_jabatan"
                  type="text"
                  class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                />
              </div>
            </div>
          </div>

          <!-- Rincian Buku Paket yang Diserahterimakan -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <span>📚</span>
                <span>Rincian Buku Paket yang Diserahterimakan (Butir-Butir Buku):</span>
              </label>
              <button
                type="button"
                @click="addHandoverItemRow"
                class="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 font-bold text-[10px] hover:bg-orange-100 transition-colors"
              >
                + Tambah Baris Buku
              </button>
            </div>

            <!-- List Dynamic Rows -->
            <div class="space-y-2">
              <div
                v-for="(itm, idx) in handoverForm.items"
                :key="idx"
                class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs"
              >
                <div class="font-bold text-slate-400 w-5 text-center shrink-0">
                  {{ idx + 1 }}.
                </div>

                <div class="flex-1 w-full">
                  <input
                    v-model="itm.judul_buku"
                    type="text"
                    required
                    placeholder="Judul Buku (Contoh: Prakarya dan Kewirausahaan)"
                    class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div class="w-24 shrink-0">
                  <select
                    v-model="itm.kelas"
                    class="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>

                <div class="w-32 shrink-0">
                  <input
                    v-model="itm.penerbit"
                    type="text"
                    placeholder="Penerbit (Erlangga)"
                    class="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div class="w-20 shrink-0">
                  <input
                    v-model.number="itm.tahun"
                    type="number"
                    placeholder="Thn (2023)"
                    class="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center font-mono"
                  />
                </div>

                <div class="w-24 shrink-0 flex items-center gap-1">
                  <input
                    v-model.number="itm.jumlah"
                    type="number"
                    min="1"
                    required
                    placeholder="Jml"
                    class="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center font-bold"
                  />
                  <span class="text-slate-400 text-[10px]">eks</span>
                </div>

                <button
                  type="button"
                  @click="removeHandoverItemRow(idx)"
                  class="p-1.5 text-rose-500 hover:text-rose-700 shrink-0"
                  title="Hapus baris"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <DriveUploadField
            v-model="handoverForm.file_bast_signed"
            folder="BAST"
            :allow-pdf="true"
            label="Lampiran Scan PDF / Foto BAST Bertanda Tangan atau Nota (Opsional)"
            hint="Boleh dikosongkan dulu saat membuat BAST, lalu dilampirkan lewat tombol Upload Scan setelah ditandatangani & dicap."
          />

          <!-- Checkbox Auto-Sync to Inventory -->
          <div class="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 flex items-start gap-2.5">
            <input
              v-model="handoverForm.auto_sync_inventory"
              type="checkbox"
              id="auto-sync"
              class="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
            />
            <label for="auto-sync" class="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <strong>Otomatis Jadikan Inventarisasi SMA Nusaputera</strong>: Buku-buku di atas akan otomatis tercatat ke tabel katalog inventaris buku sekolah (atau menambah stok jika judul buku sudah ada).
            </label>
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showHandoverModal = false"
              class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold shadow-md shadow-orange-600/30"
            >
              Simpan & Cetak Berita Acara
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: FORM TAMBAH / EDIT BUKU MANUAL -->
    <div
      v-if="showBookModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">
              {{ isEditingBook ? 'Edit Data Buku Inventaris' : 'Tambah Buku ke Inventaris' }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Buku paket pelajaran SMA Nusaputera Semarang.
            </p>
          </div>
          <button
            type="button"
            @click="showBookModal = false"
            class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="submitBook" class="space-y-3.5 mt-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Judul Buku <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="bookForm.judul"
              type="text"
              required
              placeholder="Contoh: Prakarya dan Kewirausahaan, Matematika Tingkat Lanjut..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jenjang Kelas <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="bookForm.kelas"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              >
                <option value="X">Kelas X</option>
                <option value="XI">Kelas XI</option>
                <option value="XII">Kelas XII</option>
                <option value="Semua">Semua Kelas</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kurikulum
              </label>
              <select
                v-model="bookForm.kurikulum"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
                <option value="K13">Kurikulum 2013 (K13)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Penerbit
              </label>
              <input
                v-model="bookForm.penerbit"
                type="text"
                placeholder="Erlangga / Kemendikbud"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tahun Terbit
              </label>
              <input
                v-model.number="bookForm.tahun_terbit"
                type="number"
                placeholder="2023"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-center font-mono"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sumber Dana Anggaran
              </label>
              <select
                v-model="bookForm.sumber_dana"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
              >
                <option value="BOS">BOS Reguler</option>
                <option value="BOS Kinerja">BOS Kinerja</option>
                <option value="Mandiri">Mandiri / Yayasan</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Total Jumlah Eksemplar
              </label>
              <input
                v-model.number="bookForm.total_stok"
                type="number"
                min="1"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lokasi Rak / Penyimpanan
              </label>
              <input
                v-model="bookForm.lokasi_rak"
                type="text"
                placeholder="Perpustakaan - Rak B3"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kondisi Fisik Buku
              </label>
              <select
                v-model="bookForm.kondisi"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="baik">Baik (Sangat Layak)</option>
                <option value="rusak_ringan">Rusak Ringan</option>
                <option value="rusak_berat">Rusak Berat</option>
              </select>
            </div>
          </div>

          <DriveUploadField
            v-model="bookForm.foto"
            folder="Buku"
            :allow-pdf="true"
            label="Foto Sampul / Rak Buku atau Dokumen (Opsional)"
            hint="Disimpan ke Google Drive Sekolah (0 KB di database)."
          />

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showBookModal = false"
              class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-600/30"
            >
              {{ isEditingBook ? 'Simpan Perubahan' : 'Tambahkan Buku' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
    <!-- END Screen View UI -->

    <!-- MODAL 3: CETAK BERITA ACARA RESMI (100% IDENTIK FORMAT FISIK) -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="showPrintModal && selectedHandover"
          id="bast-print-modal-root"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print-portal-root"
        >
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto print-portal-card bast-modal-card">
            <!-- Close & Print Bar (Hidden on print) -->
            <div class="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800 no-print">
              <div class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span>📜</span>
                <span>Pratinjau Berita Acara Serah Terima Buku Ajar BOS</span>
              </div>
              <div class="flex items-center gap-2">
                <a
                  v-if="selectedHandover.file_bast_signed"
                  :href="selectedHandover.file_bast_signed"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                >
                  <span>📎</span>
                  <span>Lihat Scan Arsip</span>
                </a>
                <button
                  type="button"
                  @click="triggerPrint"
                  class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs shadow-md shadow-orange-600/30 flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>Cetak Berita Acara</span>
                </button>
                <button
                  type="button"
                  @click="showPrintModal = false"
                  class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- PRINTABLE DOCUMENT (100% SESUAI DOKUMEN FISIK REFERENSI, KERTAS PUTIH KONTRAS TINGGI) -->
            <div class="print-paper-sheet print-bast-sheet bg-white text-black p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-xs leading-relaxed font-serif sm:text-sm">
              <!-- Header Center -->
              <div class="text-center font-bold uppercase space-y-1 mb-6">
                <div class="text-base tracking-wide">BERITA ACARA</div>
                <div class="text-sm tracking-wide">
                  {{ selectedHandover.judul_acara || `SERAH TERIMA BUKU AJAR BOS TAHUN ANGGARAN ${selectedHandover.tahun_anggaran || 2026}` }}
                </div>
              </div>

              <!-- Paragraf Pembuka -->
              <div class="text-justify indent-8 mb-4">
                Pada hari ini <span class="font-semibold">{{ formalDate.hari }}</span> tanggal <span class="font-semibold">{{ formalDate.tanggal }}</span> bulan <span class="font-semibold">{{ formalDate.bulan }}</span> tahun <span class="font-semibold">{{ formalDate.tahun }}</span>, terjadi serah terima Buku paket yang dibeli dari anggaran BOS Tahun {{ selectedHandover.tahun_anggaran || 2026 }} sebagaimana tersebut di bawah ini :
              </div>

              <!-- Daftar Rincian Buku (Numbered List Berbutir) -->
              <div class="pl-6 mb-5 space-y-1">
                <div
                  v-for="(itm, idx) in selectedHandover.items"
                  :key="idx"
                  class="flex items-start gap-2"
                >
                  <span class="w-4 shrink-0">{{ idx + 1 }}.</span>
                  <span>
                    {{ itm.judul_buku }} kelas {{ itm.kelas }}, Penerbit {{ itm.penerbit }} tahun {{ itm.tahun }}, jumlah {{ itm.jumlah }} eks
                  </span>
                </div>
              </div>

              <!-- Pihak Pertama -->
              <div class="mb-3">
                <div class="font-bold">Dari pihak PERTAMA</div>
                <table class="border-collapse mt-0.5 ml-1">
                  <tbody>
                    <tr>
                      <td class="w-24">Nama</td>
                      <td class="w-4">:</td>
                      <td class="font-bold">{{ selectedHandover.pihak_pertama_nama }}</td>
                    </tr>
                    <tr>
                      <td>Jabatan</td>
                      <td>:</td>
                      <td>{{ selectedHandover.pihak_pertama_jabatan }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pihak Kedua -->
              <div class="mb-5">
                <div class="font-bold">Kepada pihak KEDUA</div>
                <table class="border-collapse mt-0.5 ml-1">
                  <tbody>
                    <tr>
                      <td class="w-24">Nama</td>
                      <td class="w-4">:</td>
                      <td class="font-bold">{{ selectedHandover.pihak_kedua_nama }}</td>
                    </tr>
                    <tr>
                      <td>Jabatan</td>
                      <td>:</td>
                      <td>{{ selectedHandover.pihak_kedua_jabatan }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pernyataan Klausul -->
              <div class="mb-3 text-justify">
                Selanjutnya buku tersebut menjadi inventarisasi SMA Nusaputera
              </div>

              <!-- Penutup -->
              <div class="mb-6 text-justify">
                Demikian berita acara ini dibuat untuk menjadi periksa
              </div>

              <!-- Tanda Tangan -->
              <div class="space-y-4">
                <div class="text-right pr-6">
                  Semarang, {{ formalDate.tanggal }} {{ formalDate.bulan }} {{ formalDate.tahun }}
                </div>

                <!-- Kolom Pihak I & Pihak II -->
                <div class="grid grid-cols-2 gap-8 text-center">
                  <div>
                    <div class="font-bold">Pihak PERTAMA</div>
                    <div class="h-16 flex items-center justify-center italic text-black/30 text-xs">
                      ( Tanda Tangan )
                    </div>
                    <div class="font-bold">{{ selectedHandover.pihak_pertama_nama }}</div>
                  </div>

                  <div>
                    <div class="font-bold">Pihak KEDUA</div>
                    <div class="h-16 flex items-center justify-center italic text-black/30 text-xs">
                      ( Tanda Tangan )
                    </div>
                    <div class="font-bold">{{ selectedHandover.pihak_kedua_nama }}</div>
                  </div>
                </div>

                <!-- Kolom Mengetahui Kepala Sekolah -->
                <div class="text-center pt-2">
                  <div class="font-bold">Mengetahui,</div>
                  <div class="font-bold">Kepala Sekolah</div>
                  <div class="h-16 flex items-center justify-center italic text-black/30 text-xs">
                    ( Tanda Tangan & Cap Sekolah )
                  </div>
                  <div class="font-bold">{{ selectedHandover.mengetahui_nama }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- MODAL 4: UPLOAD / LIHAT ARSIP SCAN BAST BERTANDA TANGAN -->
    <div
      v-if="showAttachBastModal && attachTargetHandover"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 class="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📎</span>
              <span>Arsip Scan Berita Acara (Bertanda Tangan)</span>
            </h3>
            <p class="text-xs font-mono text-orange-600 dark:text-orange-400 mt-0.5">
              {{ attachTargetHandover.nomor_surat }}
            </p>
          </div>
          <button
            type="button"
            @click="showAttachBastModal = false"
            class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="submitAttachBast" class="space-y-4 text-xs">
          <DriveUploadField
            v-model="attachFileUrl"
            folder="BAST"
            :allow-pdf="true"
            label="File Scan PDF / Foto BAST Bertanda Tangan & Cap Sekolah"
            hint="Staf/Petugas dapat mengunggah PDF scan maupun foto hasil tanda tangan basah ke Google Drive Sekolah."
          />

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showAttachBastModal = false"
              class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="attachingBast"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-600/30 disabled:opacity-50"
            >
              {{ attachingBast ? 'Menyimpan...' : 'Simpan Tautan Arsip' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 5: PREVIEW FOTO SAMPUL BUKU -->
    <div
      v-if="showBookPhotoModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
      @click.self="showBookPhotoModal = false"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div class="font-bold text-sm text-slate-900 dark:text-white truncate pr-3">
            📚 {{ bookPhotoPreview.title }}
          </div>
          <button
            type="button"
            @click="showBookPhotoModal = false"
            class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
        <DrivePreviewCard :url="bookPhotoPreview.url" :title="bookPhotoPreview.title" />
      </div>
    </div>
  </div>
</template>
