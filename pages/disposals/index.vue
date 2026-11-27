<script setup>
const { user, isStaff, isAdmin } = useAuth()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  if (user.value && !isStaff.value) {
    alert('Akses Ditolak: Halaman Pemusnahan Barang hanya dapat diakses oleh Petugas Sarpra atau Admin.')
    router.push('/dashboard')
  }
})

// Filter State
const search = ref('')
const filterStatus = ref('all')
const filterSumber = ref('all')
const filterMetode = ref('all')
const filterMonth = ref('')

// Fetch Disposals & Reference Catalogs
const { data: pageData, refresh: fetchDisposals, pending: loading } = await useFetch('/api/disposals', {
  query: computed(() => ({
    status: filterStatus.value,
    sumber: filterSumber.value,
    metode: filterMetode.value,
    month: filterMonth.value || undefined,
    search: search.value || undefined
  }))
})

const disposals = computed(() => pageData.value?.disposals?.data || [])
const stats = computed(() => pageData.value?.stats || {
  total_dokumen: 0,
  menunggu_persetujuan: 0,
  disetujui: 0,
  selesai: 0,
  ditolak: 0,
  total_unit_dimusnahkan: 0,
  total_nilai_aset: 0
})

const sarpraItems = computed(() => pageData.value?.references?.sarpraItems || [])
const labItems = computed(() => pageData.value?.references?.labItems || [])
const books = computed(() => pageData.value?.references?.books || [])
const openDamages = computed(() => pageData.value?.references?.openDamages || [])

// Option Mappers
const methodOptions = [
  { value: 'dihancurkan', label: '🔨 Dihancurkan / Dirusak Fisik' },
  { value: 'dibakar', label: '🔥 Dibakar / Insinerasi' },
  { value: 'dibongkar_daur_ulang', label: '♻️ Dibongkar / Daur Ulang' },
  { value: 'limbah_b3', label: '☣️ Diserahkan ke Pengelola Limbah' },
  { value: 'dibuang_tps', label: '🚛 Dibuang ke TPS Resmi' },
  { value: 'lainnya', label: '📝 Metode Lainnya' }
]

const conditionOptions = [
  { value: 'rusak_berat', label: 'Rusak Berat (Tidak Layak Pakai)' },
  { value: 'kadaluarsa', label: 'Kadaluarsa / Kedaluwarsa' },
  { value: 'usang', label: 'Usang / Ketinggalan Zaman' },
  { value: 'hilang_susut', label: 'Susut / Sisa Material' },
  { value: 'lainnya', label: 'Kondisi Lainnya' }
]

const getMethodLabel = (val) => {
  const found = methodOptions.find(m => m.value === val)
  return found ? found.label : val
}

const getMethodPlain = (val) => {
  return getMethodLabel(val).replace(/^[^\p{L}\p{N}]+/u, '').trim()
}

const getConditionLabel = (val) => {
  const found = conditionOptions.find(c => c.value === val)
  return found ? found.label : val
}

const getSourceBadge = (sumber) => {
  switch (sumber) {
    case 'sarpra':
      return { label: 'Inventaris Sarpra', class: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' }
    case 'lab':
      return { label: 'Inventaris Lab', class: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' }
    case 'buku':
      return { label: 'Buku Perpustakaan', class: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' }
    default:
      return { label: 'Non-Katalog / Manual', class: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
  }
}

const getStatusBadge = (status) => {
  switch (status) {
    case 'selesai':
      return { label: 'Selesai Dimusnahkan', class: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
    case 'disetujui':
      return { label: 'Disetujui (Siap Musnah)', class: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' }
    case 'ditolak':
      return { label: 'Ditolak', class: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' }
    default:
      return { label: 'Menunggu Persetujuan', class: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
  }
}

// ==================================================
// MODAL 1: CREATE / AJUKAN PEMUSNAHAN MULTI-ITEM
// ==================================================
const showCreateModal = ref(false)
const submittingCreate = ref(false)
const selectedDamagePresetId = ref('')

const createEmptyRow = () => ({
  sumber_barang: 'sarpra',
  item_id: '',
  lab_item_id: '',
  book_id: '',
  damage_report_id: '',
  kode_barang: '',
  nama_barang: '',
  kategori_sumber: '',
  jumlah: 1,
  satuan: 'unit',
  kondisi_akhir: 'rusak_berat',
  nilai_perkiraan: '',
  alasan_item: ''
})

const createForm = reactive({
  judul_acara: 'BERITA ACARA PEMUSNAHAN BARANG / ASET SEKOLAH',
  tanggal_pemusnahan: new Date().toISOString().split('T')[0],
  lokasi_pemusnahan: 'Area Gudang / Halaman Belakang SMA Nusaputera',
  metode_pemusnahan: 'dihancurkan',
  alasan_umum: '',
  penanggung_jawab_nama: 'Emanuel Suryajaya, S.Kom.',
  penanggung_jawab_jabatan: 'Koordinator Sarpra SMA Nusaputera',
  saksi_nama: '',
  saksi_jabatan: 'Petugas / Wakil Sarpra',
  mengetahui_nama: 'Nining Tri Palupi, S.Pd., M.Pd.',
  mengetahui_jabatan: 'Kepala SMA Nusaputera',
  foto_sebelum: '',
  foto_pemusnahan: '',
  file_bast_signed: '',
  catatan_admin: '',
  execute_now: false,
  items: [createEmptyRow()]
})

const resetCreateForm = () => {
  selectedDamagePresetId.value = ''
  createForm.judul_acara = 'BERITA ACARA PEMUSNAHAN BARANG / ASET SEKOLAH'
  createForm.tanggal_pemusnahan = new Date().toISOString().split('T')[0]
  createForm.lokasi_pemusnahan = 'Area Gudang / Halaman Belakang SMA Nusaputera'
  createForm.metode_pemusnahan = 'dihancurkan'
  createForm.alasan_umum = ''
  createForm.penanggung_jawab_nama = 'Emanuel Suryajaya, S.Kom.'
  createForm.penanggung_jawab_jabatan = 'Koordinator Sarpra SMA Nusaputera'
  createForm.saksi_nama = user.value?.name || ''
  createForm.saksi_jabatan = 'Petugas Sarana & Prasarana'
  createForm.mengetahui_nama = 'Nining Tri Palupi, S.Pd., M.Pd.'
  createForm.mengetahui_jabatan = 'Kepala SMA Nusaputera'
  createForm.foto_sebelum = ''
  createForm.foto_pemusnahan = ''
  createForm.file_bast_signed = ''
  createForm.catatan_admin = ''
  createForm.execute_now = false
  createForm.items = [createEmptyRow()]
}

const openCreateModal = () => {
  resetCreateForm()
  showCreateModal.value = true
}

const addRow = () => {
  createForm.items.push(createEmptyRow())
}

const removeRow = (idx) => {
  if (createForm.items.length > 1) {
    createForm.items.splice(idx, 1)
  }
}

const onSourceChange = (row) => {
  row.item_id = ''
  row.lab_item_id = ''
  row.book_id = ''
  row.kode_barang = ''
  row.nama_barang = ''
  row.kategori_sumber = ''
  row.satuan = row.sumber_barang === 'buku' ? 'eks' : 'unit'
  row.jumlah = 1
}

const onCatalogItemSelect = (row) => {
  if (row.sumber_barang === 'sarpra' && row.item_id) {
    const itm = sarpraItems.value.find(x => String(x.id) === String(row.item_id))
    if (itm) {
      row.kode_barang = itm.kode_barang
      row.nama_barang = itm.nama_barang
      row.kategori_sumber = itm.category?.nama_kategori || 'Inventaris Sarpra'
      row.satuan = 'unit'
    }
  } else if (row.sumber_barang === 'lab' && row.lab_item_id) {
    const lab = labItems.value.find(x => String(x.id) === String(row.lab_item_id))
    if (lab) {
      row.kode_barang = lab.kode_item
      row.nama_barang = lab.nama_item
      row.kategori_sumber = `Lab ${lab.lab_type.toUpperCase()}`
      row.satuan = lab.satuan || 'unit'
      if (lab.kondisi === 'habis') row.kondisi_akhir = 'kadaluarsa'
    }
  } else if (row.sumber_barang === 'buku' && row.book_id) {
    const bk = books.value.find(x => String(x.id) === String(row.book_id))
    if (bk) {
      row.kode_barang = bk.kode_buku
      row.nama_barang = `${bk.judul} (Kelas ${bk.kelas})`
      row.kategori_sumber = bk.penerbit || 'Buku Ajar'
      row.satuan = 'eks'
    }
  }
}

const getSelectedRowStockLimit = (row) => {
  if (row.sumber_barang === 'sarpra' && row.item_id) {
    return sarpraItems.value.find(x => String(x.id) === String(row.item_id))?.stok_tersedia ?? null
  }
  if (row.sumber_barang === 'lab' && row.lab_item_id) {
    return labItems.value.find(x => String(x.id) === String(row.lab_item_id))?.stok_tersedia ?? null
  }
  if (row.sumber_barang === 'buku' && row.book_id) {
    return books.value.find(x => String(x.id) === String(row.book_id))?.stok_tersedia ?? null
  }
  return null
}

const applyDamagePreset = (damageId) => {
  if (!damageId) return
  const dmg = openDamages.value.find(d => String(d.id) === String(damageId))
  if (!dmg) return

  if (!createForm.alasan_umum) {
    createForm.alasan_umum = `Tindak lanjut laporan kerusakan ${dmg.nomor_laporan}: ${dmg.judul_kerusakan} (tidak ekonomis / tidak dapat diperbaiki).`
  }
  if (!createForm.foto_sebelum && dmg.foto_sebelum) {
    createForm.foto_sebelum = dmg.foto_sebelum
  }
  if (dmg.room?.nama_ruang || dmg.lokasi_keterangan) {
    createForm.lokasi_pemusnahan = `Area Sarpras (Asal: ${dmg.room?.nama_ruang || dmg.lokasi_keterangan})`
  }

  const newRow = createEmptyRow()
  newRow.damage_report_id = String(dmg.id)
  newRow.kondisi_akhir = 'rusak_berat'
  newRow.alasan_item = `Dari tiket ${dmg.nomor_laporan}: ${dmg.judul_kerusakan}`

  if (dmg.item_id && dmg.item) {
    newRow.sumber_barang = 'sarpra'
    newRow.item_id = String(dmg.item_id)
    onCatalogItemSelect(newRow)
  } else {
    newRow.sumber_barang = 'manual'
    newRow.nama_barang = dmg.judul_kerusakan
    newRow.kategori_sumber = 'Temuan Laporan Kerusakan'
  }

  const first = createForm.items[0]
  const isFirstBlank = first && !first.item_id && !first.lab_item_id && !first.book_id && !first.nama_barang
  if (isFirstBlank) {
    createForm.items[0] = newRow
  } else {
    createForm.items.push(newRow)
  }
}

watch(
  () => [route.query.fromDamage, openDamages.value.length],
  ([fromDmgId]) => {
    if (fromDmgId && openDamages.value.length > 0 && !showCreateModal.value) {
      resetCreateForm()
      selectedDamagePresetId.value = String(fromDmgId)
      applyDamagePreset(String(fromDmgId))
      showCreateModal.value = true
    }
  },
  { immediate: true }
)

const submitCreate = async () => {
  if (!createForm.tanggal_pemusnahan || !createForm.alasan_umum.trim()) {
    alert('Tanggal pemusnahan dan alasan umum wajib diisi!')
    return
  }

  submittingCreate.value = true
  try {
    const res = await $fetch('/api/disposals/create', {
      method: 'POST',
      body: {
        ...createForm,
        execute_now: isAdmin.value ? Boolean(createForm.execute_now) : false
      }
    })
    showCreateModal.value = false
    if (route.query.fromDamage) {
      router.replace({ path: '/disposals' })
    }
    await fetchDisposals()
    alert(res.message || 'Data pemusnahan barang berhasil disimpan!')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menyimpan dokumen pemusnahan barang.')
  } finally {
    submittingCreate.value = false
  }
}

// ==================================================
// MODAL 2: DETAIL & FOTO DOKUMENTASI
// ==================================================
const showDetailModal = ref(false)
const activeDetail = ref(null)

const openDetailModal = (rec) => {
  activeDetail.value = rec
  showDetailModal.value = true
}

// ==================================================
// MODAL 3: APPROVAL / EKSEKUSI ADMIN
// ==================================================
const showActionModal = ref(false)
const submittingAction = ref(false)
const actionTarget = ref(null)
const actionForm = reactive({
  status: 'selesai',
  catatan_admin: '',
  foto_sebelum: '',
  foto_pemusnahan: '',
  file_bast_signed: ''
})

const openActionModal = (rec) => {
  actionTarget.value = rec
  actionForm.status = rec.status === 'disetujui' ? 'selesai' : 'selesai'
  actionForm.catatan_admin = rec.catatan_admin || ''
  actionForm.foto_sebelum = rec.foto_sebelum || ''
  actionForm.foto_pemusnahan = rec.foto_pemusnahan || ''
  actionForm.file_bast_signed = rec.file_bast_signed || ''
  showActionModal.value = true
}

const submitAction = async () => {
  if (!actionTarget.value) return
  submittingAction.value = true
  try {
    const res = await $fetch('/api/disposals/action', {
      method: 'POST',
      body: {
        id: actionTarget.value.id,
        ...actionForm
      }
    })
    showActionModal.value = false
    await fetchDisposals()
    alert(res.message || 'Status pemusnahan berhasil diperbarui.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal memperbarui status pemusnahan.')
  } finally {
    submittingAction.value = false
  }
}

// ==================================================
// MODAL 4: LAMPIRKAN / UPDATE FOTO & SCAN BAST (STAF)
// ==================================================
const showAttachModal = ref(false)
const submittingAttach = ref(false)
const attachTarget = ref(null)
const attachForm = reactive({
  foto_sebelum: '',
  foto_pemusnahan: '',
  file_bast_signed: ''
})

const openAttachModal = (rec) => {
  attachTarget.value = rec
  attachForm.foto_sebelum = rec.foto_sebelum || ''
  attachForm.foto_pemusnahan = rec.foto_pemusnahan || ''
  attachForm.file_bast_signed = rec.file_bast_signed || ''
  showAttachModal.value = true
}

const submitAttach = async () => {
  if (!attachTarget.value) return
  submittingAttach.value = true
  try {
    const res = await $fetch('/api/disposals/attach', {
      method: 'POST',
      body: {
        id: attachTarget.value.id,
        ...attachForm
      }
    })
    showAttachModal.value = false
    await fetchDisposals()
    alert(res.message || 'Lampiran dokumentasi berhasil disimpan.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menyimpan lampiran dokumentasi.')
  } finally {
    submittingAttach.value = false
  }
}

// ==================================================
// DELETE DOCUMENT
// ==================================================
const deleteDisposal = async (rec) => {
  let restoreStock = true
  if (rec.stok_terpotong) {
    const ok = confirm(
      `PERHATIAN: Dokumen ${rec.nomor_surat} sudah memotong stok inventaris.\n\n` +
      `Klik OK untuk menghapus dokumen DAN mengembalikan stok ke inventaris.`
    )
    if (!ok) return
    restoreStock = true
  } else {
    if (!confirm(`Hapus dokumen pemusnahan ${rec.nomor_surat}?`)) return
    restoreStock = false
  }

  try {
    const res = await $fetch('/api/disposals/delete', {
      method: 'POST',
      body: { id: rec.id, restore_stock: restoreStock }
    })
    await fetchDisposals()
    alert(res.message || 'Dokumen pemusnahan berhasil dihapus.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menghapus dokumen.')
  }
}

// ==================================================
// PRINT PORTALS (INDIVIDUAL BAST & REKAPITULASI)
// ==================================================
const showPrintModal = ref(false)
const activePrintRecord = ref(null)
const showPrintRekapModal = ref(false)

const openPrintModal = (rec) => {
  activePrintRecord.value = rec
  showPrintModal.value = true
}

const formalDisposalDate = computed(() => {
  return formatDateFormalBAST(activePrintRecord.value?.tanggal_pemusnahan)
})

const triggerPrint = () => {
  window.print()
}

const exportExcelUrl = computed(() => {
  const params = new URLSearchParams()
  if (filterStatus.value && filterStatus.value !== 'all') params.set('status', filterStatus.value)
  if (filterSumber.value && filterSumber.value !== 'all') params.set('sumber', filterSumber.value)
  if (filterMetode.value && filterMetode.value !== 'all') params.set('metode', filterMetode.value)
  if (filterMonth.value) params.set('month', filterMonth.value)
  if (search.value) params.set('search', search.value)
  const qs = params.toString()
  return qs ? `/api/disposals/export?${qs}` : '/api/disposals/export'
})

const resetFilters = () => {
  search.value = ''
  filterStatus.value = 'all'
  filterSumber.value = 'all'
  filterMetode.value = 'all'
  filterMonth.value = ''
}

const sumUnits = (rec) => {
  return (rec?.items || []).reduce((acc, it) => acc + Number(it.jumlah || 0), 0)
}

const sumValue = (rec) => {
  return (rec?.items || []).reduce((acc, it) => acc + (it.nilai_perkiraan ? Number(it.nilai_perkiraan) : 0), 0)
}
</script>

<template>
  <div>
    <!-- SCREEN VIEW -->
    <div class="space-y-6 animate-entrance print:hidden">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-2">
            <span>🔥</span>
            <span>Penghapusan &amp; Pemusnahan Aset</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Pemusnahan Barang &amp; Dokumentasi
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Pencatatan resmi barang inventaris Sarpra, alat/bahan Lab, buku, dan aset non-katalog yang dimusnahkan beserta Berita Acara A4 &amp; arsip foto Google Drive.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <a
            :href="exportExcelUrl"
            class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <span>📥</span>
            <span>Export Excel</span>
          </a>

          <button
            type="button"
            @click="showPrintRekapModal = true"
            class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <span>🖨️</span>
            <span>Cetak Rekap</span>
          </button>

          <button
            type="button"
            @click="openCreateModal"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition-all active:scale-95"
          >
            <span>➕</span>
            <span>Catat / Ajukan Pemusnahan</span>
          </button>
        </div>
      </div>

      <!-- Summary Stat Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Berita Acara</div>
          <div class="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">{{ stats.total_dokumen }}</div>
        </div>

        <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-sm">
          <div class="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">⏳ Menunggu</div>
          <div class="text-xl font-black text-amber-700 dark:text-amber-400 mt-1 font-mono">{{ stats.menunggu_persetujuan }}</div>
        </div>

        <div class="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-sm">
          <div class="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">☑️ Disetujui</div>
          <div class="text-xl font-black text-blue-700 dark:text-blue-400 mt-1 font-mono">{{ stats.disetujui }}</div>
        </div>

        <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
          <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">🔥 Dimusnahkan</div>
          <div class="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">{{ stats.selesai }}</div>
        </div>

        <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-sm">
          <div class="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">📦 Total Unit</div>
          <div class="text-xl font-black text-rose-700 dark:text-rose-400 mt-1 font-mono">{{ stats.total_unit_dimusnahkan }}</div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 shadow-sm">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Nilai Aset</div>
          <div class="text-sm sm:text-base font-black text-white mt-1 font-mono truncate">{{ formatRupiah(stats.total_nilai_aset) }}</div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-center">
        <div class="lg:col-span-2">
          <input
            v-model="search"
            type="text"
            placeholder="Cari no. surat, nama barang, kode, alasan..."
            class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <select
          v-model="filterStatus"
          class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-semibold"
        >
          <option value="all">Semua Status</option>
          <option value="menunggu_persetujuan">Menunggu Persetujuan</option>
          <option value="disetujui">Disetujui (Siap Musnah)</option>
          <option value="selesai">Selesai Dimusnahkan</option>
          <option value="ditolak">Ditolak</option>
        </select>

        <select
          v-model="filterSumber"
          class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-semibold"
        >
          <option value="all">Semua Sumber Barang</option>
          <option value="sarpra">📦 Inventaris Sarpra</option>
          <option value="lab">🔬 Alat / Bahan Lab</option>
          <option value="buku">📚 Buku Perpustakaan</option>
          <option value="manual">📝 Non-Katalog / Manual</option>
        </select>

        <input
          v-model="filterMonth"
          type="month"
          class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
        />

        <button
          type="button"
          @click="resetFilters"
          class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
        >
          Reset Filter
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="h-48 rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-pulse"></div>
      </div>

      <!-- List Cards -->
      <div v-else-if="disposals.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          v-for="rec in disposals"
          :key="rec.id"
          class="glass-card-interactive p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4"
        >
          <div class="space-y-3">
            <!-- Header Row -->
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono text-xs font-black text-rose-600 dark:text-rose-400">
                    {{ rec.nomor_surat }}
                  </span>
                  <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    • {{ formatDate(rec.tanggal_pemusnahan) }}
                  </span>
                </div>
                <h3 class="text-sm font-extrabold text-slate-900 dark:text-white mt-1 leading-snug">
                  {{ rec.judul_acara }}
                </h3>
              </div>

              <div class="flex flex-col items-end gap-1 shrink-0">
                <span :class="['px-2.5 py-0.5 rounded-full text-[10px] font-bold border', getStatusBadge(rec.status).class]">
                  {{ getStatusBadge(rec.status).label }}
                </span>
                <span
                  v-if="rec.stok_terpotong"
                  class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                >
                  ✓ Stok Terpotong
                </span>
              </div>
            </div>

            <!-- Meta Info -->
            <div class="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-[11px]">
              <div>
                <span class="text-slate-400 block">Metode:</span>
                <span class="font-bold text-slate-800 dark:text-slate-200">{{ getMethodLabel(rec.metode_pemusnahan) }}</span>
              </div>
              <div>
                <span class="text-slate-400 block">Total Barang / Nilai:</span>
                <span class="font-bold text-slate-800 dark:text-slate-200">
                  {{ rec.items?.length || 0 }} jenis ({{ sumUnits(rec) }} unit)
                  <span v-if="sumValue(rec) > 0" class="text-rose-600 dark:text-rose-400 font-mono">
                    • {{ formatRupiah(sumValue(rec)) }}
                  </span>
                </span>
              </div>
              <div v-if="rec.lokasi_pemusnahan" class="col-span-2">
                <span class="text-slate-400">Lokasi: </span>
                <span class="font-semibold text-slate-700 dark:text-slate-300">{{ rec.lokasi_pemusnahan }}</span>
              </div>
            </div>

            <!-- Item List Preview -->
            <div class="space-y-1.5">
              <div
                v-for="(itm, idx) in (rec.items || []).slice(0, 4)"
                :key="itm.id || idx"
                class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span :class="['px-1.5 py-0.5 rounded text-[9px] font-bold border', getSourceBadge(itm.sumber_barang).class]">
                      {{ getSourceBadge(itm.sumber_barang).label }}
                    </span>
                    <span v-if="itm.kode_barang" class="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {{ itm.kode_barang }}
                    </span>
                    <span v-if="itm.damage_report" class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      Tiket {{ itm.damage_report.nomor_laporan }}
                    </span>
                  </div>
                  <div class="font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    {{ itm.nama_barang }}
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <div class="font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                    {{ itm.jumlah }} {{ itm.satuan }}
                  </div>
                  <div class="text-[10px] text-slate-400">{{ getConditionLabel(itm.kondisi_akhir) }}</div>
                </div>
              </div>
              <div v-if="(rec.items || []).length > 4" class="text-[11px] font-semibold text-slate-500 pl-2">
                + {{ rec.items.length - 4 }} barang lainnya...
              </div>
            </div>

            <!-- Reason -->
            <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              <strong class="text-slate-800 dark:text-slate-200">Alasan:</strong> {{ rec.alasan_umum }}
            </p>

            <!-- Media Chips -->
            <div class="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
              <span v-if="rec.foto_sebelum" class="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                📷 Foto Sebelum
              </span>
              <span v-if="rec.foto_pemusnahan" class="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                🔥 Foto Eksekusi
              </span>
              <span v-if="rec.file_bast_signed" class="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                📎 Scan BAST Sah
              </span>
              <span class="text-slate-400 ml-auto">
                Pengaju: <strong class="text-slate-600 dark:text-slate-300">{{ rec.creator?.name }}</strong>
              </span>
            </div>
          </div>

          <!-- Action Footer -->
          <div class="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                @click="openDetailModal(rec)"
                class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                👁️ Detail
              </button>

              <button
                type="button"
                @click="openPrintModal(rec)"
                class="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/50 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-xs font-bold"
              >
                🖨️ Berita Acara
              </button>

              <button
                type="button"
                @click="openAttachModal(rec)"
                class="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold"
              >
                📎 Dokumentasi
              </button>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                v-if="isAdmin && rec.status !== 'selesai'"
                type="button"
                @click="openActionModal(rec)"
                class="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm shadow-rose-600/20"
              >
                🛡️ Tinjau / Musnahkan
              </button>

              <button
                v-if="isAdmin || (rec.status === 'menunggu_persetujuan' && String(rec.created_by) === String(user?.id))"
                type="button"
                @click="deleteDisposal(rec)"
                class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-xs"
                title="Hapus Dokumen Pemusnahan"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="p-12 text-center rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
        <div class="text-4xl mb-2">🔥</div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white">Belum ada catatan pemusnahan barang</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Catat atau ajukan pemusnahan barang rusak berat, barang kadaluarsa, atau aset usang untuk dokumentasi resmi sekolah.
        </p>
        <button
          type="button"
          @click="openCreateModal"
          class="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25"
        >
          <span>➕</span>
          <span>Buat Berita Acara Pemusnahan</span>
        </button>
      </div>
    </div>

    <!-- ================================================== -->
    <!-- MODAL 1: FORM CREATE / AJUKAN PEMUSNAHAN           -->
    <!-- ================================================== -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🔥</span>
              <span>Catat / Ajukan Pemusnahan Barang</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Satu Berita Acara dapat mencatat beberapa barang sekaligus dari Inventaris Sarpra, Lab, Buku, maupun Non-Katalog.
            </p>
          </div>
          <button type="button" @click="showCreateModal = false" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <form @submit.prevent="submitCreate" class="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
          <!-- Optional Import from Open Damage Report -->
          <div v-if="openDamages.length > 0" class="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
            <label class="block font-bold text-rose-800 dark:text-rose-300 mb-1.5">
              🛠️ Impor Cepat dari Tiket Laporan Kerusakan Aktif (Opsional)
            </label>
            <div class="flex flex-col sm:flex-row gap-2">
              <select
                v-model="selectedDamagePresetId"
                class="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-slate-900 dark:text-white"
              >
                <option value="">-- Pilih tiket kerusakan untuk ditambahkan ke daftar --</option>
                <option v-for="dmg in openDamages" :key="dmg.id" :value="String(dmg.id)">
                  [{{ dmg.nomor_laporan }}] {{ dmg.judul_kerusakan }} {{ dmg.item ? `— ${dmg.item.nama_barang} (Stok: ${dmg.item.stok_tersedia})` : '' }}
                </option>
              </select>
              <button
                type="button"
                @click="applyDamagePreset(selectedDamagePresetId)"
                :disabled="!selectedDamagePresetId"
                class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold shrink-0"
              >
                + Masukkan Barang
              </button>
            </div>
          </div>

          <!-- Header Metadata -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2">
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Judul Berita Acara *</label>
              <input
                v-model="createForm.judul_acara"
                type="text"
                required
                class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Pemusnahan *</label>
              <input
                v-model="createForm.tanggal_pemusnahan"
                type="date"
                required
                class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Metode Pemusnahan *</label>
              <select
                v-model="createForm.metode_pemusnahan"
                class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
              >
                <option v-for="m in methodOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lokasi Pelaksanaan</label>
              <input
                v-model="createForm.lokasi_pemusnahan"
                type="text"
                placeholder="Contoh: Halaman Belakang / TPS Sekolah"
                class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Alasan &amp; Dasar Pertimbangan Pemusnahan *</label>
            <textarea
              v-model="createForm.alasan_umum"
              rows="2"
              required
              placeholder="Contoh: Barang mengalami kerusakan berat, biaya perbaikan melebihi nilai guna, atau bahan/buku sudah kadaluarsa."
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            ></textarea>
          </div>

          <!-- Multi-Item Builder -->
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Daftar Barang yang Dimusnahkan ({{ createForm.items.length }})
              </div>
              <button
                type="button"
                @click="addRow"
                class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-sm"
              >
                + Tambah Baris Barang
              </button>
            </div>

            <div
              v-for="(row, idx) in createForm.items"
              :key="idx"
              class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-700 dark:text-slate-200">
                  Barang #{{ idx + 1 }}
                  <span v-if="row.damage_report_id" class="ml-1.5 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px]">
                    Terhubung Tiket Kerusakan #{{ row.damage_report_id }}
                  </span>
                </span>
                <button
                  v-if="createForm.items.length > 1"
                  type="button"
                  @click="removeRow(idx)"
                  class="text-rose-600 hover:underline font-bold text-[11px]"
                >
                  Hapus Baris
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 mb-1">Sumber Data *</label>
                  <select
                    v-model="row.sumber_barang"
                    @change="onSourceChange(row)"
                    class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="sarpra">📦 Inventaris Sarpra</option>
                    <option value="lab">🔬 Alat / Bahan Lab</option>
                    <option value="buku">📚 Buku Perpustakaan</option>
                    <option value="manual">📝 Non-Katalog / Manual</option>
                  </select>
                </div>

                <!-- Picker based on sumber_barang -->
                <div class="sm:col-span-3" v-if="row.sumber_barang === 'sarpra'">
                  <label class="block text-[10px] font-bold text-slate-500 mb-1">Pilih Barang Sarpra *</label>
                  <select
                    v-model="row.item_id"
                    @change="onCatalogItemSelect(row)"
                    required
                    class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Pilih barang inventaris --</option>
                    <option
                      v-for="it in sarpraItems"
                      :key="it.id"
                      :value="String(it.id)"
                      :disabled="it.stok_tersedia <= 0"
                    >
                      [{{ it.kode_barang }}] {{ it.nama_barang }} — Stok Tersedia: {{ it.stok_tersedia }} ({{ it.kondisi }})
                    </option>
                  </select>
                </div>

                <div class="sm:col-span-3" v-else-if="row.sumber_barang === 'lab'">
                  <label class="block text-[10px] font-bold text-slate-500 mb-1">Pilih Alat / Bahan Lab *</label>
                  <select
                    v-model="row.lab_item_id"
                    @change="onCatalogItemSelect(row)"
                    required
                    class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Pilih item laboratorium --</option>
                    <option
                      v-for="lb in labItems"
                      :key="lb.id"
                      :value="String(lb.id)"
                      :disabled="lb.stok_tersedia <= 0"
                    >
                      [{{ lb.kode_item }}] {{ lb.nama_item }} (Lab {{ lb.lab_type.toUpperCase() }}) — Stok: {{ lb.stok_tersedia }} {{ lb.satuan }}
                    </option>
                  </select>
                </div>

                <div class="sm:col-span-3" v-else-if="row.sumber_barang === 'buku'">
                  <label class="block text-[10px] font-bold text-slate-500 mb-1">Pilih Buku Perpustakaan *</label>
                  <select
                    v-model="row.book_id"
                    @change="onCatalogItemSelect(row)"
                    required
                    class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Pilih judul buku --</option>
                    <option
                      v-for="bk in books"
                      :key="bk.id"
                      :value="String(bk.id)"
                      :disabled="bk.stok_tersedia <= 0"
                    >
                      [{{ bk.kode_buku }}] {{ bk.judul }} (Kls {{ bk.kelas }}) — Stok: {{ bk.stok_tersedia }} eks
                    </option>
                  </select>
                </div>

                <div class="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2" v-else>
                  <div class="sm:col-span-2">
                    <label class="block text-[10px] font-bold text-slate-500 mb-1">Nama Barang Manual *</label>
                    <input
                      v-model="row.nama_barang"
                      type="text"
                      required
                      placeholder="Contoh: Kursi kayu lama tidak bernomor seri"
                      class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 mb-1">Kode (Opsional)</label>
                    <input
                      v-model="row.kode_barang"
                      type="text"
                      placeholder="NON-INV-01"
                      class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 mb-1">
                    Jumlah *
                    <span v-if="getSelectedRowStockLimit(row) !== null" class="text-rose-600">(Maks {{ getSelectedRowStockLimit(row) }})</span>
                  </label>
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    min="1"
                    :max="getSelectedRowStockLimit(row) || undefined"
                    required
                    class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-500 mb-1">Satuan</label>
                  <input
                    v-model="row.satuan"
                    type="text"
                    placeholder="unit / eks / pcs"
                    class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-500 mb-1">Kondisi Akhir</label>
                  <select
                    v-model="row.kondisi_akhir"
                    class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option v-for="c in conditionOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-500 mb-1">Est. Nilai (Rp)</label>
                  <input
                    v-model="row.nilai_perkiraan"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label class="block text-[10px] font-bold text-slate-500 mb-1">Catatan Item</label>
                  <input
                    v-model="row.alasan_item"
                    type="text"
                    placeholder="Keterangan singkat"
                    class="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Signatories for Berita Acara -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div class="font-bold text-slate-700 dark:text-slate-200 text-xs">
              ✍️ Penandatangan Berita Acara Resmi
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="space-y-1.5">
                <input v-model="createForm.penanggung_jawab_nama" type="text" placeholder="Nama Penanggung Jawab" class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold" />
                <input v-model="createForm.penanggung_jawab_jabatan" type="text" placeholder="Jabatan" class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]" />
              </div>
              <div class="space-y-1.5">
                <input v-model="createForm.saksi_nama" type="text" placeholder="Nama Saksi (Opsional)" class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold" />
                <input v-model="createForm.saksi_jabatan" type="text" placeholder="Jabatan Saksi" class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]" />
              </div>
              <div class="space-y-1.5">
                <input v-model="createForm.mengetahui_nama" type="text" placeholder="Nama Kepala Sekolah" class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold" />
                <input v-model="createForm.mengetahui_jabatan" type="text" placeholder="Jabatan Kepala Sekolah" class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]" />
              </div>
            </div>
          </div>

          <!-- Documentation Uploads -->
          <div class="grid grid-cols-1 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <DriveUploadField
              v-model="createForm.foto_sebelum"
              folder="Pemusnahan"
              :allow-pdf="true"
              label="📷 Foto Kondisi Barang Sebelum Pemusnahan (Opsional)"
            />
            <DriveUploadField
              v-model="createForm.foto_pemusnahan"
              folder="Pemusnahan"
              :allow-pdf="true"
              label="🔥 Foto Dokumentasi Proses / Hasil Pemusnahan (Opsional)"
            />
            <DriveUploadField
              v-model="createForm.file_bast_signed"
              folder="Pemusnahan"
              :allow-pdf="true"
              label="📎 Scan PDF / Foto Berita Acara Bertanda Tangan (Opsional — bisa diunggah belakangan)"
            />
          </div>

          <!-- Admin Direct Execution Toggle OR Petugas Info -->
          <div v-if="isAdmin" class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <label class="flex items-start gap-2.5 cursor-pointer">
              <input
                v-model="createForm.execute_now"
                type="checkbox"
                class="mt-0.5 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div class="font-extrabold text-emerald-800 dark:text-emerald-300">
                  Langsung Setujui &amp; Eksekusi Pemusnahan Sekarang (Potong Stok Otomatis)
                </div>
                <div class="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Centang opsi ini untuk pencatatan langsung. Jika dibiarkan tidak tercentang, dokumen masuk antrean "Menunggu Persetujuan" sebelum stok dikurangi.
                </div>
              </div>
            </label>
            <input
              v-if="createForm.execute_now"
              v-model="createForm.catatan_admin"
              type="text"
              placeholder="Catatan pengesahan admin (opsional)..."
              class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800"
            />
          </div>
          <div v-else class="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px]">
            ⏳ Pengajuan dari Petugas akan berstatus <strong>Menunggu Persetujuan</strong>. Stok barang di inventaris baru akan berkurang setelah disetujui &amp; dieksekusi oleh Super Admin.
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button type="button" @click="showCreateModal = false" class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white">
              Batal
            </button>
            <button
              type="submit"
              :disabled="submittingCreate"
              class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/30 disabled:opacity-50"
            >
              {{ submittingCreate ? 'Menyimpan...' : (createForm.execute_now && isAdmin ? 'Simpan & Musnahkan Sekarang' : 'Simpan Pengajuan Pemusnahan') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================================================== -->
    <!-- MODAL 2: DETAIL & FOTO DOKUMENTASI                 -->
    <!-- ================================================== -->
    <div
      v-if="showDetailModal && activeDetail"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <div class="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">{{ activeDetail.nomor_surat }}</div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{{ activeDetail.judul_acara }}</h3>
          </div>
          <button type="button" @click="showDetailModal = false" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span :class="['px-2.5 py-0.5 rounded-full font-bold border', getStatusBadge(activeDetail.status).class]">
              {{ getStatusBadge(activeDetail.status).label }}
            </span>
            <span class="font-semibold text-slate-600 dark:text-slate-300">
              Tanggal: {{ formatDate(activeDetail.tanggal_pemusnahan) }} • {{ getMethodLabel(activeDetail.metode_pemusnahan) }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div>
              <span class="text-slate-400 block">Lokasi:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ activeDetail.lokasi_pemusnahan || '-' }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Status Stok Inventaris:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">
                {{ activeDetail.stok_terpotong ? '✅ Sudah Dipotong Otomatis' : '⏳ Belum Memotong Stok' }}
              </span>
            </div>
            <div>
              <span class="text-slate-400 block">Dicatat Oleh:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ activeDetail.creator?.name }}</span>
            </div>
            <div>
              <span class="text-slate-400 block">Disetujui / Dieksekusi Oleh:</span>
              <span class="font-bold text-slate-800 dark:text-slate-200">{{ activeDetail.approver?.name || 'Belum diproses' }}</span>
            </div>
          </div>

          <div>
            <div class="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">Alasan Pemusnahan</div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {{ activeDetail.alasan_umum }}
            </div>
          </div>

          <div v-if="activeDetail.catatan_admin">
            <div class="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1">Catatan Admin</div>
            <div class="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200">
              {{ activeDetail.catatan_admin }}
            </div>
          </div>

          <div>
            <div class="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] mb-1.5">
              Rincian Barang ({{ activeDetail.items?.length || 0 }})
            </div>
            <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table class="w-full text-left border-collapse text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th class="p-2.5">Barang</th>
                    <th class="p-2.5">Sumber</th>
                    <th class="p-2.5 text-center">Jml</th>
                    <th class="p-2.5">Kondisi</th>
                    <th class="p-2.5 text-right">Est. Nilai</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                  <tr v-for="itm in activeDetail.items || []" :key="itm.id">
                    <td class="p-2.5">
                      <div class="font-bold text-slate-900 dark:text-white">{{ itm.nama_barang }}</div>
                      <div v-if="itm.kode_barang" class="text-[10px] font-mono text-slate-400">{{ itm.kode_barang }}</div>
                      <div v-if="itm.alasan_item" class="text-[10px] text-slate-500 mt-0.5">{{ itm.alasan_item }}</div>
                    </td>
                    <td class="p-2.5">
                      <span :class="['px-1.5 py-0.5 rounded text-[9px] font-bold border', getSourceBadge(itm.sumber_barang).class]">
                        {{ getSourceBadge(itm.sumber_barang).label }}
                      </span>
                    </td>
                    <td class="p-2.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                      {{ itm.jumlah }} {{ itm.satuan }}
                    </td>
                    <td class="p-2.5">{{ getConditionLabel(itm.kondisi_akhir) }}</td>
                    <td class="p-2.5 text-right font-mono">{{ formatRupiah(itm.nilai_perkiraan) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Uploaded Evidence Previews -->
          <div v-if="activeDetail.foto_sebelum || activeDetail.foto_pemusnahan || activeDetail.file_bast_signed" class="space-y-2.5">
            <div class="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px]">Dokumentasi Google Drive</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DrivePreviewCard v-if="activeDetail.foto_sebelum" :url="activeDetail.foto_sebelum" title="Foto Kondisi Sebelum" />
              <DrivePreviewCard v-if="activeDetail.foto_pemusnahan" :url="activeDetail.foto_pemusnahan" title="Foto Dokumentasi Pemusnahan" />
              <DrivePreviewCard v-if="activeDetail.file_bast_signed" :url="activeDetail.file_bast_signed" title="Scan Berita Acara Bertanda Tangan" />
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            @click="showDetailModal = false; openPrintModal(activeDetail)"
            class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs"
          >
            🖨️ Cetak Berita Acara
          </button>
          <button type="button" @click="showDetailModal = false" class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-semibold">
            Tutup
          </button>
        </div>
      </div>
    </div>

    <!-- ================================================== -->
    <!-- MODAL 3: APPROVAL / EKSEKUSI ADMIN                 -->
    <!-- ================================================== -->
    <div
      v-if="showActionModal && actionTarget"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <div class="font-mono text-xs font-bold text-rose-600">{{ actionTarget.nomor_surat }}</div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">Tinjau &amp; Eksekusi Pemusnahan</h3>
          </div>
          <button type="button" @click="showActionModal = false" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form @submit.prevent="submitAction" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Keputusan Admin *</label>
            <select
              v-model="actionForm.status"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
            >
              <option value="selesai">🔥 Setujui &amp; Eksekusi Selesai (Otomatis Potong Stok)</option>
              <option v-if="!actionTarget.stok_terpotong" value="disetujui">☑️ Setujui Dulu (Siap Musnah, Stok Belum Dipotong)</option>
              <option v-if="!actionTarget.stok_terpotong" value="ditolak">❌ Tolak Pengajuan Pemusnahan</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Persetujuan / Eksekusi</label>
            <textarea
              v-model="actionForm.catatan_admin"
              rows="2"
              placeholder="Catatan tambahan pemeriksaan fisik atau arahan admin..."
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            ></textarea>
          </div>

          <DriveUploadField
            v-model="actionForm.foto_pemusnahan"
            folder="Pemusnahan"
            :allow-pdf="true"
            label="🔥 Foto Bukti Pemusnahan (Opsional)"
          />

          <DriveUploadField
            v-model="actionForm.file_bast_signed"
            folder="Pemusnahan"
            :allow-pdf="true"
            label="📎 Scan Berita Acara Bertanda Tangan (Opsional)"
          />

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button type="button" @click="showActionModal = false" class="px-4 py-2 rounded-xl text-slate-500">Batal</button>
            <button
              type="submit"
              :disabled="submittingAction"
              class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/30 disabled:opacity-50"
            >
              {{ submittingAction ? 'Memproses...' : 'Simpan Keputusan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================================================== -->
    <!-- MODAL 4: LAMPIRAN FOTO / SCAN BAST                 -->
    <!-- ================================================== -->
    <div
      v-if="showAttachModal && attachTarget"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">📎 Dokumentasi Foto &amp; Scan Berita Acara</h3>
            <p class="text-xs font-mono text-rose-600 dark:text-rose-400 mt-0.5">{{ attachTarget.nomor_surat }}</p>
          </div>
          <button type="button" @click="showAttachModal = false" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form @submit.prevent="submitAttach" class="space-y-4 text-xs">
          <DriveUploadField
            v-model="attachForm.foto_sebelum"
            folder="Pemusnahan"
            :allow-pdf="true"
            label="📷 Foto Sebelum Pemusnahan"
          />
          <DriveUploadField
            v-model="attachForm.foto_pemusnahan"
            folder="Pemusnahan"
            :allow-pdf="true"
            label="🔥 Foto Saat / Sesudah Pemusnahan"
          />
          <DriveUploadField
            v-model="attachForm.file_bast_signed"
            folder="Pemusnahan"
            :allow-pdf="true"
            label="📎 Scan PDF / Foto Berita Acara Bertanda Tangan"
          />

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button type="button" @click="showAttachModal = false" class="px-4 py-2 rounded-xl text-slate-500">Batal</button>
            <button
              type="submit"
              :disabled="submittingAttach"
              class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/25 disabled:opacity-50"
            >
              {{ submittingAttach ? 'Menyimpan...' : 'Simpan Dokumentasi' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ================================================== -->
    <!-- PORTAL 1: CETAK BERITA ACARA PEMUSNAHAN A4         -->
    <!-- ================================================== -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="showPrintModal && activePrintRecord"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print-portal-root"
        >
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto print-portal-card">
            <!-- Bar Aksi Modal (Disembunyikan saat cetak) -->
            <div class="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800 no-print">
              <div class="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span>📜</span>
                <span>Pratinjau Berita Acara Pemusnahan Barang</span>
              </div>
              <div class="flex items-center gap-2">
                <a
                  v-if="activePrintRecord.file_bast_signed"
                  :href="activePrintRecord.file_bast_signed"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs"
                >
                  📎 Scan BAST Sah
                </a>
                <button
                  type="button"
                  @click="triggerPrint"
                  class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>Cetak Berita Acara (A4)</span>
                </button>
                <button
                  type="button"
                  @click="showPrintModal = false"
                  class="p-2 rounded-xl text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- KERTAS PUTIH RESMI -->
            <div class="print-paper-sheet bg-white text-black p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm text-xs leading-normal">
              <!-- KOP SURAT SMA NUSAPUTERA -->
              <div class="text-center pb-3 border-b-2 border-black flex items-center justify-between gap-4">
                <div class="w-16 h-16 shrink-0 flex items-center justify-center">
                  <img src="/images/logo.png" alt="Logo SMA Nusaputera" class="w-14 h-14 object-contain" />
                </div>
                <div class="flex-1 text-center">
                  <div class="text-[11px] font-bold tracking-wider uppercase text-gray-700">
                    YAYASAN PENDIDIKAN NUSAPUTERA
                  </div>
                  <div class="text-base font-black uppercase tracking-tight text-black">
                    SMA NUSAPUTERA SEMARANG
                  </div>
                  <div class="text-[10px] text-gray-700">
                    Jl. Ki Mangunsarkoro No.59 Semarang Tengah, Telp (024) 3542444
                  </div>
                  <div class="text-[9px] text-gray-600">
                    Email: sma_nusaputera@yahoo.id / info@smanusaputera.sch.id • SISARPRA
                  </div>
                </div>
                <div class="w-16 h-16 shrink-0 flex items-center justify-center border border-gray-400 text-[8px] font-semibold text-gray-600 uppercase text-center p-1 leading-tight">
                  BERITA<br />ACARA
                </div>
              </div>

              <!-- Judul Dokumen -->
              <div class="text-center my-4">
                <h2 class="text-sm font-black uppercase tracking-wide underline underline-offset-4 text-black">
                  {{ activePrintRecord.judul_acara }}
                </h2>
                <div class="text-[11px] font-mono font-semibold mt-1 text-black">
                  Nomor: {{ activePrintRecord.nomor_surat }}
                </div>
              </div>

              <!-- Paragraf Pembuka Resmi -->
              <p class="text-justify indent-8 mb-3 text-black">
                Pada hari ini <span class="font-bold">{{ formalDisposalDate.hari }}</span> tanggal
                <span class="font-bold">{{ formalDisposalDate.tanggal }}</span> bulan
                <span class="font-bold">{{ formalDisposalDate.bulan }}</span> tahun
                <span class="font-bold">{{ formalDisposalDate.tahun }}</span>, bertempat di
                <span class="font-bold">{{ activePrintRecord.lokasi_pemusnahan || 'SMA Nusaputera Semarang' }}</span>, telah dilaksanakan pemusnahan / penghapusan barang sarana prasarana sekolah dengan metode
                <span class="font-bold">{{ getMethodPlain(activePrintRecord.metode_pemusnahan) }}</span> berdasarkan alasan: {{ activePrintRecord.alasan_umum }}
              </p>

              <!-- Tabel Barang yang Dimusnahkan -->
              <table class="w-full text-left border-collapse border border-black text-[10.5px] text-black mb-4">
                <thead>
                  <tr class="bg-gray-100 font-bold text-black">
                    <th class="border border-black p-1.5 text-center w-8">No</th>
                    <th class="border border-black p-1.5">Kode</th>
                    <th class="border border-black p-1.5">Nama Barang &amp; Sumber</th>
                    <th class="border border-black p-1.5 text-center">Jumlah</th>
                    <th class="border border-black p-1.5">Kondisi Akhir</th>
                    <th class="border border-black p-1.5 text-right">Est. Nilai</th>
                    <th class="border border-black p-1.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(itm, idx) in activePrintRecord.items || []" :key="itm.id || idx">
                    <td class="border border-black p-1.5 text-center">{{ idx + 1 }}</td>
                    <td class="border border-black p-1.5 font-mono">{{ itm.kode_barang || '-' }}</td>
                    <td class="border border-black p-1.5">
                      <div class="font-bold">{{ itm.nama_barang }}</div>
                      <div class="text-[9px] text-gray-700">{{ getSourceBadge(itm.sumber_barang).label }} • {{ itm.kategori_sumber || '-' }}</div>
                    </td>
                    <td class="border border-black p-1.5 text-center font-bold">{{ itm.jumlah }} {{ itm.satuan }}</td>
                    <td class="border border-black p-1.5">{{ getConditionLabel(itm.kondisi_akhir) }}</td>
                    <td class="border border-black p-1.5 text-right font-mono">{{ itm.nilai_perkiraan ? formatRupiah(itm.nilai_perkiraan) : '-' }}</td>
                    <td class="border border-black p-1.5">{{ itm.alasan_item || '-' }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="bg-gray-100 font-bold text-black">
                    <td colspan="3" class="border border-black p-1.5 text-right uppercase">Total</td>
                    <td class="border border-black p-1.5 text-center">{{ sumUnits(activePrintRecord) }} unit/eks</td>
                    <td class="border border-black p-1.5"></td>
                    <td class="border border-black p-1.5 text-right font-mono">{{ sumValue(activePrintRecord) > 0 ? formatRupiah(sumValue(activePrintRecord)) : '-' }}</td>
                    <td class="border border-black p-1.5"></td>
                  </tr>
                </tfoot>
              </table>

              <p class="text-justify mb-4 text-black">
                Barang-barang sebagaimana tercantum dalam daftar di atas telah dimusnahkan sehingga tidak dapat dipergunakan kembali dan dikeluarkan dari daftar inventaris aktif sekolah. Demikian Berita Acara Pemusnahan Barang ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.
              </p>

              <!-- 3 Kolom Tanda Tangan -->
              <div class="pt-3 border-t border-gray-300 print-box-clean">
                <div class="text-right text-[11px] mb-3 text-black">
                  Semarang, {{ formalDisposalDate.tanggal }} {{ formalDisposalDate.bulan }} {{ formalDisposalDate.tahun }}
                </div>
                <div class="grid grid-cols-3 gap-3 text-center text-[11px]">
                  <div>
                    <div class="font-semibold text-gray-800">Penanggung Jawab / Pelaksana</div>
                    <div class="h-16 flex items-center justify-center italic text-gray-400 text-[10px]">(Tanda Tangan)</div>
                    <div class="font-bold underline text-black">{{ activePrintRecord.penanggung_jawab_nama }}</div>
                    <div class="text-[9px] text-gray-700">{{ activePrintRecord.penanggung_jawab_jabatan }}</div>
                  </div>
                  <div>
                    <div class="font-semibold text-gray-800">Saksi Pelaksanaan</div>
                    <div class="h-16 flex items-center justify-center italic text-gray-400 text-[10px]">(Tanda Tangan)</div>
                    <div class="font-bold underline text-black">{{ activePrintRecord.saksi_nama || '______________________' }}</div>
                    <div class="text-[9px] text-gray-700">{{ activePrintRecord.saksi_jabatan || 'Saksi Sarpra / Guru' }}</div>
                  </div>
                  <div>
                    <div class="font-semibold text-gray-800">Mengetahui,</div>
                    <div class="h-16 flex items-center justify-center italic text-gray-400 text-[10px]">(Tanda Tangan &amp; Cap)</div>
                    <div class="font-bold underline text-black">{{ activePrintRecord.mengetahui_nama }}</div>
                    <div class="text-[9px] text-gray-700">{{ activePrintRecord.mengetahui_jabatan }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- ================================================== -->
    <!-- PORTAL 2: CETAK REKAPITULASI PEMUSNAHAN A4         -->
    <!-- ================================================== -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="showPrintRekapModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print-portal-root"
        >
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto print-portal-card">
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 no-print">
              <div class="font-bold text-slate-900 dark:text-white text-sm">🖨️ Rekapitulasi Laporan Pemusnahan Barang</div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="triggerPrint"
                  class="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30"
                >
                  🖨️ Cetak Laporan (A4)
                </button>
                <button type="button" @click="showPrintRekapModal = false" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 text-sm">✕</button>
              </div>
            </div>

            <div class="print-paper-sheet bg-white text-black p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm text-xs">
              <!-- Kop Surat -->
              <div class="text-center pb-3 border-b-2 border-black flex items-center justify-between gap-4">
                <div class="w-16 h-16 shrink-0 flex items-center justify-center">
                  <img src="/images/logo.png" alt="Logo SMA Nusaputera" class="w-14 h-14 object-contain" />
                </div>
                <div class="flex-1 text-center">
                  <div class="text-[11px] font-bold tracking-wider uppercase text-gray-700">YAYASAN PENDIDIKAN NUSAPUTERA</div>
                  <div class="text-base font-black uppercase tracking-tight text-black">SMA NUSAPUTERA SEMARANG</div>
                  <div class="text-[10px] text-gray-700">Jl. Ki Mangunsarkoro No.59 Semarang Tengah, Telp (024) 3542444</div>
                  <div class="text-[9px] font-bold text-gray-800 uppercase mt-0.5">LAPORAN REKAPITULASI PEMUSNAHAN &amp; PENGHAPUSAN BARANG INVENTARIS</div>
                </div>
                <div class="w-16 h-16 shrink-0 flex items-center justify-center border border-gray-400 text-[8px] font-semibold text-gray-600 uppercase text-center p-1 leading-tight">
                  REKAP<br />MUSNAH
                </div>
              </div>

              <div class="my-3 flex flex-wrap items-center justify-between text-[11px] text-black">
                <div><strong>Periode:</strong> {{ filterMonth || 'Semua Periode' }}</div>
                <div><strong>Sumber Filter:</strong> {{ filterSumber === 'all' ? 'Semua Sumber' : getSourceBadge(filterSumber).label }}</div>
                <div><strong>Total Dokumen:</strong> {{ disposals.length }} Berita Acara</div>
              </div>

              <table class="w-full text-left border-collapse border border-black text-[10px] text-black mb-5">
                <thead>
                  <tr class="bg-gray-100 font-bold text-black">
                    <th class="border border-black p-1.5 text-center w-8">No</th>
                    <th class="border border-black p-1.5">No. Berita Acara &amp; Tanggal</th>
                    <th class="border border-black p-1.5">Rincian Barang Dimusnahkan</th>
                    <th class="border border-black p-1.5">Metode</th>
                    <th class="border border-black p-1.5 text-center">Jml Unit</th>
                    <th class="border border-black p-1.5 text-right">Est. Nilai</th>
                    <th class="border border-black p-1.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(rec, idx) in disposals" :key="rec.id">
                    <td class="border border-black p-1.5 text-center">{{ idx + 1 }}</td>
                    <td class="border border-black p-1.5">
                      <div class="font-mono font-bold">{{ rec.nomor_surat }}</div>
                      <div>{{ formatDate(rec.tanggal_pemusnahan) }}</div>
                    </td>
                    <td class="border border-black p-1.5">
                      <div v-for="(it, i2) in rec.items || []" :key="it.id || i2">
                        • <strong>{{ it.nama_barang }}</strong> ({{ it.jumlah }} {{ it.satuan }})
                      </div>
                    </td>
                    <td class="border border-black p-1.5">{{ getMethodPlain(rec.metode_pemusnahan) }}</td>
                    <td class="border border-black p-1.5 text-center font-bold">{{ sumUnits(rec) }}</td>
                    <td class="border border-black p-1.5 text-right font-mono">{{ sumValue(rec) > 0 ? formatRupiah(sumValue(rec)) : '-' }}</td>
                    <td class="border border-black p-1.5 text-center uppercase font-bold">{{ getStatusBadge(rec.status).label }}</td>
                  </tr>
                  <tr v-if="disposals.length === 0">
                    <td colspan="7" class="border border-black p-3 text-center italic text-gray-600">
                      Tidak ada data pemusnahan pada filter ini.
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="pt-3 grid grid-cols-2 gap-6 text-center text-[11px] text-black">
                <div>
                  <div>Koordinator Sarana &amp; Prasarana</div>
                  <div class="h-14 flex items-center justify-center italic text-gray-400 text-[10px]">(Tanda Tangan)</div>
                  <div class="font-bold underline">Emanuel Suryajaya, S.Kom.</div>
                </div>
                <div>
                  <div>Mengetahui, Kepala SMA Nusaputera</div>
                  <div class="h-14 flex items-center justify-center italic text-gray-400 text-[10px]">(Tanda Tangan &amp; Cap)</div>
                  <div class="font-bold underline">Nining Tri Palupi, S.Pd., M.Pd.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>
