<script setup>
const { isStaff } = useAuth()

const searchQuery = ref('')
const selectedCategory = ref('')
const selectedCondition = ref('')

const { data: pageData, refresh: fetchData, pending: loading } = await useFetch('/api/items')

const items = computed(() => pageData.value?.items || [])
const categories = computed(() => pageData.value?.categories || [])

const showModal = ref(false)
const modalTitle = ref('Tambah Barang Inventaris Baru')
const saving = ref(false)

const form = reactive({
  id: null,
  category_id: '',
  kode_barang: '',
  nama_barang: '',
  merk: '',
  spesifikasi: '',
  total_stok: 1,
  stok_tersedia: 1,
  kondisi: 'baik',
  lokasi_penyimpanan: ''
})

// ==========================================
// STATE & METHODS FITUR IMPORT BARANG VIA EXCEL
// ==========================================
const showImportModal = ref(false)
const importStep = ref('upload') // 'upload' | 'preview' | 'success'
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

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const downloadTemplate = () => {
  window.open('/api/manage/items/template', '_blank')
}

const onFileChange = async (e) => {
  const file = e.target.files?.[0]
  if (file) {
    await processFile(file)
  }
}

const onDropFile = async (e) => {
  isDragging.value = false
  const file = e.dataTransfer.files?.[0]
  if (file) {
    await processFile(file)
  }
}

const processFile = async (file) => {
  try {
    parsingFile.value = true
    const formData = new FormData()
    formData.append('file', file)

    const res = await $fetch('/api/manage/items/parse', {
      method: 'POST',
      body: formData
    })

    parsedData.value = res
    importStep.value = 'preview'
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal membaca atau memproses file Excel.')
  } finally {
    parsingFile.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const submitImport = async () => {
  if (!parsedData.value || !parsedData.value.rows || parsedData.value.validCount === 0) {
    alert('Tidak ada baris data valid untuk diimport.')
    return
  }

  try {
    importing.value = true
    const validRows = parsedData.value.rows.filter(r => r.isValid)
    const res = await $fetch('/api/manage/items/import', {
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
    alert(err?.data?.statusMessage || err?.message || 'Gagal mengimport data inventaris barang ke sistem.')
  } finally {
    importing.value = false
  }
}

const filteredItems = computed(() => {
  return items.value.filter(item => {
    const matchesCat = !selectedCategory.value || String(item.category_id) === String(selectedCategory.value)
    const matchesCond = !selectedCondition.value || item.kondisi === selectedCondition.value
    const q = searchQuery.value.toLowerCase()
    const matchesQ = !q ||
      item.nama_barang.toLowerCase().includes(q) ||
      item.kode_barang.toLowerCase().includes(q) ||
      (item.merk && item.merk.toLowerCase().includes(q)) ||
      (item.lokasi_penyimpanan && item.lokasi_penyimpanan.toLowerCase().includes(q))

    return matchesCat && matchesCond && matchesQ
  })
})

const openAddModal = () => {
  modalTitle.value = 'Tambah Barang Inventaris Baru'
  form.id = null
  form.category_id = categories.value[0]?.id || ''
  form.kode_barang = `BRG-${Date.now().toString().slice(-4)}`
  form.nama_barang = ''
  form.merk = ''
  form.spesifikasi = ''
  form.total_stok = 1
  form.stok_tersedia = 1
  form.kondisi = 'baik'
  form.lokasi_penyimpanan = 'Gudang Sarpras'
  showModal.value = true
}

const openEditModal = (item) => {
  modalTitle.value = 'Edit Data Barang Inventaris'
  form.id = item.id
  form.category_id = item.category_id
  form.kode_barang = item.kode_barang
  form.nama_barang = item.nama_barang
  form.merk = item.merk || ''
  form.spesifikasi = item.spesifikasi || ''
  form.total_stok = item.total_stok
  form.stok_tersedia = item.stok_tersedia
  form.kondisi = item.kondisi || 'baik'
  form.lokasi_penyimpanan = item.lokasi_penyimpanan || ''
  showModal.value = true
}

const saveItem = async () => {
  if (!form.nama_barang || !form.kode_barang || !form.category_id) {
    alert('Nama barang, kode barang, dan kategori wajib diisi.')
    return
  }

  saving.value = true
  try {
    await $fetch('/api/manage/items/save', {
      method: 'POST',
      body: { ...form }
    })
    showModal.value = false
    await fetchData()
    alert('Data inventaris berhasil disimpan.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menyimpan barang.')
  } finally {
    saving.value = false
  }
}

const deleteItem = async (item) => {
  if (!confirm(`Yakin ingin menghapus ${item.nama_barang} (${item.kode_barang}) dari inventaris?`)) {
    return
  }

  try {
    await $fetch('/api/manage/items/delete', {
      method: 'POST',
      body: { id: item.id }
    })
    await fetchData()
    alert('Barang berhasil dihapus.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menghapus barang.')
  }
}

const getConditionBadge = (c) => {
  switch (c) {
    case 'baik':
      return { label: 'Baik', class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' }
    case 'rusak_ringan':
      return { label: 'Rusak Ringan', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' }
    case 'rusak_berat':
      return { label: 'Rusak Berat', class: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' }
    default:
      return { label: c, class: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' }
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-2">
          <span>🏷️</span>
          Master Data Sarpras
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Inventarisir Barang & Sarana
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola aset sekolah, ketersediaan unit, kondisi fisik, dan lokasi penyimpanan barang.
        </p>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          @click="openImportModal"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25 transition-all duration-200 active:scale-95"
        >
          <span>📊</span>
          <span>Import Excel</span>
        </button>

        <button
          type="button"
          @click="openAddModal"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-terracotta-500 hover:from-orange-500 hover:to-terracotta-600 text-white font-semibold text-xs shadow-md shadow-orange-600/25 transition-all duration-200 active:scale-95"
        >
          <span>➕</span>
          <span>Tambah Barang Baru</span>
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
      <div class="w-full md:w-72">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Cari nama, kode, merk, lokasi..."
          class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="flex items-center gap-2.5 w-full md:w-auto">
        <select
          v-model="selectedCategory"
          class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Kategori</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.nama_kategori }}
          </option>
        </select>

        <select
          v-model="selectedCondition"
          class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Kondisi</option>
          <option value="baik">Kondisi Baik</option>
          <option value="rusak_ringan">Rusak Ringan</option>
          <option value="rusak_berat">Rusak Berat</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200/80 dark:border-slate-800/80">
            <tr>
              <th class="py-3 px-4">Kode & Nama Barang</th>
              <th class="py-3 px-4">Kategori</th>
              <th class="py-3 px-4">Merk & Spesifikasi</th>
              <th class="py-3 px-4 text-center">Total Stok</th>
              <th class="py-3 px-4 text-center">Tersedia</th>
              <th class="py-3 px-4">Kondisi Fisik</th>
              <th class="py-3 px-4">Lokasi Rak/Ruang</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
            <tr v-if="loading">
              <td colspan="8" class="py-12 text-center text-slate-400">
                Memuat data inventaris...
              </td>
            </tr>
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="8" class="py-12 text-center text-slate-400">
                Tidak ada data inventaris yang cocok dengan kriteria pencarian.
              </td>
            </tr>
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <td class="py-3 px-4">
                <div class="font-extrabold text-slate-900 dark:text-white">{{ item.nama_barang }}</div>
                <div class="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{{ item.kode_barang }}</div>
              </td>
              <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {{ item.category?.nama_kategori || '-' }}
                </span>
              </td>
              <td class="py-3 px-4 max-w-xs">
                <div class="font-medium text-slate-800 dark:text-slate-200">{{ item.merk || '-' }}</div>
                <div class="text-[10px] text-slate-400 truncate">{{ item.spesifikasi || '-' }}</div>
              </td>
              <td class="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                {{ item.total_stok }}
              </td>
              <td class="py-3 px-4 text-center">
                <span :class="['px-2.5 py-0.5 rounded-full text-[11px] font-extrabold', item.stok_tersedia > 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400']">
                  {{ item.stok_tersedia }} Unit
                </span>
              </td>
              <td class="py-3 px-4">
                <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold border', getConditionBadge(item.kondisi).class]">
                  {{ getConditionBadge(item.kondisi).label }}
                </span>
              </td>
              <td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                📍 {{ item.lokasi_penyimpanan || '-' }}
              </td>
              <td class="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                <button
                  type="button"
                  @click="openEditModal(item)"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  @click="deleteItem(item)"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
                >
                  Hapus
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form Tambah / Edit Barang -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>🏷️</span> {{ modalTitle }}
          </h2>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
        </div>

        <form @submit.prevent="saveItem" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kode Barang *
              </label>
              <input
                type="text"
                v-model="form.kode_barang"
                required
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Sarana *
              </label>
              <select
                v-model="form.category_id"
                required
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.nama_kategori }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Barang / Fasilitas *
            </label>
            <input
              type="text"
              v-model="form.nama_barang"
              placeholder="Contoh: Proyektor Epson EB-E500"
              required
              class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Merk / Brand
              </label>
              <input
                type="text"
                v-model="form.merk"
                placeholder="Contoh: Epson / Sony / Mikrotik"
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lokasi Rak / Lemari / Lab
              </label>
              <input
                type="text"
                v-model="form.lokasi_penyimpanan"
                placeholder="Contoh: Lemari A - Ruang Sarpras"
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Stok Fisik *
              </label>
              <input
                type="number"
                min="0"
                v-model="form.total_stok"
                required
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Stok Tersedia *
              </label>
              <input
                type="number"
                min="0"
                v-model="form.stok_tersedia"
                required
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kondisi Fisik
              </label>
              <select
                v-model="form.kondisi"
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="baik">Baik</option>
                <option value="rusak_ringan">Rusak Ringan</option>
                <option value="rusak_berat">Rusak Berat</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Spesifikasi / Keterangan Teknis
            </label>
            <textarea
              v-model="form.spesifikasi"
              rows="2"
              placeholder="Contoh: 3300 Lumens, Port HDMI & VGA, Termasuk Kabel & Tas"
              class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              :disabled="saving"
              class="px-5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/25 disabled:opacity-60"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Data' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL IMPORT BARANG INVENTARIS VIA EXCEL / CSV -->
    <div
      v-if="showImportModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-sm">
              📊
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                Import Data Inventaris Barang via Excel / CSV
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Tambah atau perbarui banyak aset & barang sarpras sekaligus dari file spreadsheet.
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="closeImportModal"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- Modal Body (Step 1: Upload) -->
        <div v-if="importStep === 'upload'" class="space-y-5 overflow-y-auto pr-1">
          <!-- Step 1 Info: Download Template -->
          <div class="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-start gap-3">
              <span class="text-2xl mt-0.5">📥</span>
              <div>
                <div class="text-xs font-bold text-orange-950 dark:text-orange-200">
                  Langkah 1: Unduh Format Template Resmi
                </div>
                <div class="text-[11px] text-orange-800/80 dark:text-orange-300 mt-0.5 leading-relaxed">
                  Format kolom: Kode Barang, Nama Barang, Kategori, Merk, Spesifikasi, Total Stok, Stok Tersedia, Kondisi, dan Lokasi. Kategori baru akan otomatis dibuat jika belum ada.
                </div>
              </div>
            </div>
            <button
              type="button"
              @click="downloadTemplate"
              class="shrink-0 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <span>📄</span>
              <span>Unduh Template (.xlsx)</span>
            </button>
          </div>

          <!-- Step 2: Upload Area Drag & Drop -->
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-700 dark:text-slate-300">
              Langkah 2: Unggah File Excel / CSV yang Telah Diisi
            </div>

            <div
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="onDropFile"
              @click="triggerFileInput"
              :class="[
                'border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center',
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
              ]"
            >
              <input
                ref="fileInputRef"
                type="file"
                accept=".xlsx, .xls, .csv"
                @change="onFileChange"
                class="hidden"
              />

              <div v-if="parsingFile" class="flex flex-col items-center gap-3">
                <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <div class="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Membaca dan memverifikasi baris data Excel...
                </div>
                <div class="text-[10px] text-slate-400">Mohon tunggu sebentar</div>
              </div>

              <div v-else class="flex flex-col items-center gap-3">
                <div class="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl shadow-sm">
                  📦
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Tarik & Lepas File ke Sini, atau <span class="text-emerald-600 dark:text-emerald-400 underline">Pilih File</span>
                  </div>
                  <div class="text-xs text-slate-400 mt-1">
                    Format didukung: <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong> (Maks. 5 MB)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Body (Step 2: Interactive Preview) -->
        <div v-else-if="importStep === 'preview'" class="flex-1 flex flex-col min-h-0 space-y-4">
          <!-- Summary Metrics -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Baris</div>
              <div class="text-lg font-black text-slate-900 dark:text-white font-mono">{{ parsedData?.total || 0 }}</div>
            </div>
            <div class="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
              <div class="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Barang Siap Import</div>
              <div class="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">{{ parsedData?.validCount || 0 }}</div>
            </div>
            <div class="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60">
              <div class="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Barang Baru</div>
              <div class="text-lg font-black text-blue-700 dark:text-blue-300 font-mono">
                {{ parsedData?.rows?.filter(r => r.isValid && r.action === 'create').length || 0 }}
              </div>
            </div>
            <div class="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60">
              <div class="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Update Stok/Data</div>
              <div class="text-lg font-black text-amber-700 dark:text-amber-300 font-mono">
                {{ parsedData?.rows?.filter(r => r.isValid && r.action === 'update').length || 0 }}
              </div>
            </div>
          </div>

          <!-- Option Checkbox -->
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                v-model="updateExisting"
                class="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
              />
              <span>Perbarui stok & data jika Kode Barang sudah terdaftar</span>
            </label>
            <span class="text-[11px] text-slate-400">File: {{ parsedData?.filename }}</span>
          </div>

          <!-- Preview Table -->
          <div class="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold sticky top-0">
                <tr>
                  <th class="p-3 w-12 text-center">No</th>
                  <th class="p-3">Kode Barang</th>
                  <th class="p-3">Nama Barang</th>
                  <th class="p-3">Kategori</th>
                  <th class="p-3">Merk</th>
                  <th class="p-3 text-center">Total Stok</th>
                  <th class="p-3">Kondisi</th>
                  <th class="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                <tr
                  v-for="(r, idx) in parsedData?.rows || []"
                  :key="idx"
                  :class="[
                    !r.isValid ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  ]"
                >
                  <td class="p-3 text-center font-mono text-slate-400">{{ r.rowNumber }}</td>
                  <td class="p-3 font-mono font-bold text-orange-600 dark:text-orange-400">{{ r.kode_barang }}</td>
                  <td class="p-3 font-medium text-slate-900 dark:text-white">{{ r.nama_barang }}</td>
                  <td class="p-3">
                    <span class="inline-flex items-center gap-1">
                      <span>{{ r.kategori }}</span>
                      <span v-if="r.isNewCategory" class="px-1.5 py-0.2 rounded text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">Baru</span>
                    </span>
                  </td>
                  <td class="p-3 text-slate-500">{{ r.merk || '-' }}</td>
                  <td class="p-3 text-center font-bold font-mono">{{ r.total_stok }} unit</td>
                  <td class="p-3">
                    <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold', getConditionBadge(r.kondisi).class]">
                      {{ getConditionBadge(r.kondisi).label }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <span
                      v-if="!r.isValid"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      :title="r.errors.join(', ')"
                    >
                      Error
                    </span>
                    <span
                      v-else-if="r.action === 'update'"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    >
                      Update Stok
                    </span>
                    <span
                      v-else
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      Barang Baru
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-between pt-2">
            <button
              type="button"
              @click="importStep = 'upload'"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ← Pilih File Lain
            </button>
            <button
              type="button"
              @click="submitImport"
              :disabled="importing || !parsedData?.validCount"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              <span>{{ importing ? 'Memproses Import...' : `Konfirmasi & Import (${parsedData?.validCount} Barang)` }}</span>
            </button>
          </div>
        </div>

        <!-- Modal Body (Step 3: Success) -->
        <div v-else-if="importStep === 'success'" class="space-y-6 text-center py-6">
          <div class="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl shadow-sm animate-scale-in">
            ✓
          </div>
          <div>
            <h4 class="text-lg font-extrabold text-slate-900 dark:text-white">
              Import Data Inventaris Selesai!
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Data barang dan aset sarana prasarana telah berhasil disimpan ke database sekolah.
            </p>
          </div>

          <div class="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div class="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60">
              <div class="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Dibuat Baru</div>
              <div class="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">{{ importResult?.createdCount || 0 }}</div>
            </div>
            <div class="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60">
              <div class="text-[10px] font-bold text-amber-700 dark:text-amber-300">Diperbarui</div>
              <div class="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">{{ importResult?.updatedCount || 0 }}</div>
            </div>
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60">
              <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400">Dilewati</div>
              <div class="text-xl font-black text-slate-700 dark:text-slate-300 font-mono">{{ importResult?.skippedCount || 0 }}</div>
            </div>
          </div>

          <button
            type="button"
            @click="closeImportModal"
            class="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/25"
          >
            Selesai & Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

