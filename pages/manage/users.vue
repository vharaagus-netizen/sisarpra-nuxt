<script setup>
const { isStaff, user: currentUser } = useAuth()

const searchQuery = ref('')
const selectedRole = ref('')

const { data: pageData, refresh: fetchUsers, pending: loading } = await useFetch('/api/manage/users', {
  query: computed(() => ({
    role: selectedRole.value || undefined,
    search: searchQuery.value || undefined
  })),
  watch: [selectedRole]
})

const users = computed(() => pageData.value?.users || [])
const stats = computed(() => pageData.value?.stats || { total: 0, admin: 0, petugas: 0, guru: 0, siswa: 0 })

let searchTimeout = null
const onSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchUsers()
  }, 300)
}

const showModal = ref(false)
const modalTitle = ref('Tambah Pengguna Baru')
const saving = ref(false)

const form = reactive({
  id: null,
  name: '',
  email: '',
  password: '',
  role: 'siswa',
  nomor_induk: '',
  no_telepon: '',
  kelas_jurusan: ''
})

const openAddModal = () => {
  modalTitle.value = 'Tambah Pengguna Baru'
  form.id = null
  form.name = ''
  form.email = ''
  form.password = 'password'
  form.role = 'siswa'
  form.nomor_induk = ''
  form.no_telepon = ''
  form.kelas_jurusan = ''
  showModal.value = true
}

// ==========================================
// STATE & METHODS FITUR IMPORT USER VIA EXCEL
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
  window.open('/api/manage/users/template', '_blank')
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

    const res = await $fetch('/api/manage/users/parse', {
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
    const res = await $fetch('/api/manage/users/import', {
      method: 'POST',
      body: {
        rows: validRows,
        updateExisting: updateExisting.value
      }
    })

    importResult.value = res
    importStep.value = 'success'
    await fetchUsers()
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal mengimport data pengguna ke sistem.')
  } finally {
    importing.value = false
  }
}

const openEditModal = (u) => {
  modalTitle.value = `Edit Pengguna: ${u.name}`
  form.id = u.id
  form.name = u.name
  form.email = u.email
  form.password = ''
  form.role = u.role
  form.nomor_induk = u.nomor_induk || ''
  form.no_telepon = u.no_telepon || ''
  form.kelas_jurusan = u.kelas_jurusan || ''
  showModal.value = true
}

const saveUser = async () => {
  if (!form.name || !form.email) {
    alert('Nama dan email wajib diisi.')
    return
  }

  saving.value = true
  try {
    await $fetch('/api/manage/users/save', {
      method: 'POST',
      body: { ...form }
    })
    showModal.value = false
    await fetchUsers()
    alert('Data pengguna berhasil disimpan!')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menyimpan pengguna.')
  } finally {
    saving.value = false
  }
}

const deleteUser = async (u) => {
  if (String(u.id) === String(currentUser.value?.id)) {
    alert('Anda tidak dapat menghapus akun Anda sendiri.')
    return
  }

  if (!confirm(`Yakin ingin menghapus pengguna "${u.name}" (${u.email})? Tindakan ini tidak dapat dibatalkan.`)) {
    return
  }

  try {
    await $fetch('/api/manage/users/delete', {
      method: 'POST',
      body: { id: u.id }
    })
    await fetchUsers()
    alert('Pengguna berhasil dihapus.')
  } catch (err) {
    alert(err?.data?.statusMessage || 'Gagal menghapus pengguna.')
  }
}

const getRoleConfig = (role) => {
  switch (role) {
    case 'admin':
      return { label: 'Administrator', icon: '👑', class: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900' }
    case 'petugas':
      return { label: 'Petugas Sarpra', icon: '🛠️', class: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900' }
    case 'guru':
      return { label: 'Guru / Pendidik', icon: '👨‍🏫', class: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900' }
    default:
      return { label: 'Siswa / Siswi', icon: '🎓', class: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900' }
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-2">
          <span>👥</span>
          Manajemen Hak Akses & Akun
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Master Pengguna (User)
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola data akun administrator, petugas sarpras, dewan guru, dan siswa SMA Nusaputera Semarang.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          @click="openImportModal"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all duration-200 active:scale-95"
        >
          <span>📊</span>
          <span>Import via Excel</span>
        </button>
        <button
          type="button"
          @click="openAddModal"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all duration-200 active:scale-95"
        >
          <span>➕</span>
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>
    </div>

    <!-- Stats Overview Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
      <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Akun</div>
          <div class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ stats.total }}</div>
        </div>
        <span class="text-2xl">👥</span>
      </div>

      <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-rose-200/80 dark:border-rose-900/50 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-rose-500">Super Admin</div>
          <div class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{{ stats.admin }}</div>
        </div>
        <span class="text-2xl">👑</span>
      </div>

      <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80 dark:border-amber-900/50 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-amber-500">Petugas Sarpra</div>
          <div class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{{ stats.petugas }}</div>
        </div>
        <span class="text-2xl">🛠️</span>
      </div>

      <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Guru / Pendidik</div>
          <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{{ stats.guru }}</div>
        </div>
        <span class="text-2xl">👨‍🏫</span>
      </div>

      <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-blue-200/80 dark:border-blue-900/50 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-blue-500">Siswa / OSIS</div>
          <div class="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{{ stats.siswa }}</div>
        </div>
        <span class="text-2xl">🎓</span>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
      <div class="w-full md:w-80">
        <input
          type="text"
          v-model="searchQuery"
          @input="onSearchInput"
          placeholder="Cari nama, email, NIP, NIS, kelas..."
          class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div class="flex items-center gap-2.5 w-full md:w-auto">
        <select
          v-model="selectedRole"
          class="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua Peran (Role)</option>
          <option value="admin">Administrator</option>
          <option value="petugas">Petugas Sarpra</option>
          <option value="guru">Guru / Pendidik</option>
          <option value="siswa">Siswa / Siswi</option>
        </select>
      </div>
    </div>

    <!-- Users Table -->
    <div class="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200/80 dark:border-slate-800/80">
            <tr>
              <th class="py-3 px-4">Nama Pengguna</th>
              <th class="py-3 px-4">Peran (Role)</th>
              <th class="py-3 px-4">Nomor Induk (NIP / NIS)</th>
              <th class="py-3 px-4">Kelas / Jabatan</th>
              <th class="py-3 px-4">Kontak / Telepon</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
            <tr v-if="loading">
              <td colspan="6" class="py-12 text-center text-slate-400">
                Memuat data pengguna...
              </td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td colspan="6" class="py-12 text-center text-slate-400">
                Tidak ada data pengguna yang sesuai dengan pencarian.
              </td>
            </tr>
            <tr
              v-for="u in users"
              :key="u.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                    {{ u.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{{ u.name }}</span>
                      <span v-if="String(u.id) === String(currentUser?.id)" class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold">
                        Anda
                      </span>
                    </div>
                    <div class="text-[11px] text-slate-400 font-mono">{{ u.email }}</div>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4">
                <span :class="['inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border', getRoleConfig(u.role).class]">
                  <span>{{ getRoleConfig(u.role).icon }}</span>
                  <span>{{ getRoleConfig(u.role).label }}</span>
                </span>
              </td>
              <td class="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                {{ u.nomor_induk || '-' }}
              </td>
              <td class="py-3 px-4 text-slate-700 dark:text-slate-300">
                {{ u.kelas_jurusan || '-' }}
              </td>
              <td class="py-3 px-4 text-slate-600 dark:text-slate-400">
                {{ u.no_telepon || '-' }}
              </td>
              <td class="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                <button
                  type="button"
                  @click="openEditModal(u)"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  @click="deleteUser(u)"
                  :disabled="String(u.id) === String(currentUser?.id)"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  Hapus
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form Tambah / Edit Pengguna -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>👥</span> {{ modalTitle }}
          </h2>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
        </div>

        <form @submit.prevent="saveUser" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              v-model="form.name"
              placeholder="Contoh: Dra. Sri Wahyuni, M.Pd"
              required
              class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Email *
              </label>
              <input
                type="email"
                v-model="form.email"
                placeholder="nama@nusaputera.sch.id"
                required
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Peran / Role Pengguna *
              </label>
              <select
                v-model="form.role"
                required
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="admin">Administrator (Super Admin)</option>
                <option value="petugas">Petugas Sarana Prasarana</option>
                <option value="guru">Guru / Pendidik</option>
                <option value="siswa">Siswa / Siswi</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Induk (NIP / NIS)
              </label>
              <input
                type="text"
                v-model="form.nomor_induk"
                placeholder="Contoh: 19850101... atau 20231001"
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kelas / Bidang Mapel
              </label>
              <input
                type="text"
                v-model="form.kelas_jurusan"
                placeholder="Contoh: XI MIPA 1 / Guru Matematika"
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No. Telepon / WhatsApp
              </label>
              <input
                type="text"
                v-model="form.no_telepon"
                placeholder="081234567890"
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {{ form.id ? 'Ganti Password (Opsional)' : 'Kata Sandi Awal *' }}
              </label>
              <input
                type="password"
                v-model="form.password"
                :placeholder="form.id ? 'Kosongkan jika tidak diubah' : 'Default: password'"
                class="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
              class="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 disabled:opacity-60"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Data' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL IMPORT PENGGUNA VIA EXCEL / CSV -->
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
                Import Pengguna via Excel / CSV
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Tambah atau perbarui banyak akun sekaligus dari spreadsheet Excel.
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
          <div class="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-start gap-3">
              <span class="text-2xl mt-0.5">📥</span>
              <div>
                <div class="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Langkah 1: Unduh Format Template Resmi
                </div>
                <div class="text-[11px] text-indigo-700/80 dark:text-indigo-400 mt-0.5 leading-relaxed">
                  Format kolom: Nama, Role, NIP/NIS, No WA, Kelas. Email boleh diisi bebas/sembarangan atau dikosongkan (sistem otomatis membuatkan email unik jika kosong).
                </div>
              </div>
            </div>
            <button
              type="button"
              @click="downloadTemplate"
              class="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
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
                  📁
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
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Baris</div>
              <div class="text-lg font-black text-slate-900 dark:text-white mt-0.5">{{ parsedData?.total || 0 }}</div>
            </div>
            <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60">
              <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Valid Siap Import</div>
              <div class="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{{ parsedData?.validCount || 0 }}</div>
            </div>
            <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60">
              <div class="text-[10px] font-bold uppercase tracking-wider text-rose-600">Perlu Diperbaiki</div>
              <div class="text-lg font-black text-rose-700 dark:text-rose-300 mt-0.5">{{ parsedData?.invalidCount || 0 }}</div>
            </div>
            <div class="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60">
              <div class="text-[10px] font-bold uppercase tracking-wider text-blue-600">File Sumber</div>
              <div class="text-xs font-bold text-blue-800 dark:text-blue-300 mt-1 truncate" :title="parsedData?.filename">
                {{ parsedData?.filename }}
              </div>
            </div>
          </div>

          <!-- Preview Table -->
          <div class="flex-1 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[220px]">
            <div class="overflow-y-auto flex-1 max-h-[360px]">
              <table class="w-full text-left border-collapse text-xs">
                <thead class="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10">
                  <tr>
                    <th class="py-2.5 px-3 w-12 text-center">No</th>
                    <th class="py-2.5 px-3">Nama Lengkap</th>
                    <th class="py-2.5 px-3">Email</th>
                    <th class="py-2.5 px-3">Role</th>
                    <th class="py-2.5 px-3">Nomor Induk</th>
                    <th class="py-2.5 px-3">Kelas / Detail</th>
                    <th class="py-2.5 px-3 text-center">Status Validasi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr
                    v-for="(row, idx) in parsedData?.rows"
                    :key="idx"
                    :class="[
                      'transition-colors',
                      !row.isValid
                        ? 'bg-rose-50/70 dark:bg-rose-950/30'
                        : row.action === 'update'
                          ? 'bg-amber-50/40 dark:bg-amber-950/20'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                    ]"
                  >
                    <td class="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                      {{ row.rowNumber }}
                    </td>
                    <td class="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {{ row.name || '-' }}
                    </td>
                    <td class="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {{ row.email || '-' }}
                    </td>
                    <td class="py-2.5 px-3">
                      <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', getRoleConfig(row.role).class]">
                        {{ getRoleConfig(row.role).icon }} {{ row.role }}
                      </span>
                    </td>
                    <td class="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {{ row.nomor_induk || '-' }}
                    </td>
                    <td class="py-2.5 px-3 text-slate-500 text-[11px]">
                      {{ row.kelas_jurusan || '-' }}
                    </td>
                    <td class="py-2.5 px-3 text-center">
                      <span
                        v-if="!row.isValid"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                        :title="row.errors.join(', ')"
                      >
                        ⚠️ {{ row.errors[0] }}
                      </span>
                      <span
                        v-else-if="row.action === 'update'"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                      >
                        🔄 Update Akun
                      </span>
                      <span
                        v-else
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      >
                        ➕ Akun Baru
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Options & Actions Footer -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                v-model="updateExisting"
                class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span class="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Perbarui data jika email pengguna sudah terdaftar sebelumnya
              </span>
            </label>

            <div class="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                @click="importStep = 'upload'"
                class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ← Ganti File
              </button>
              <button
                type="button"
                @click="submitImport"
                :disabled="importing || !parsedData?.validCount"
                class="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 disabled:opacity-50 flex items-center gap-2"
              >
                <span v-if="importing" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ importing ? 'Mengimport Data...' : `🚀 Mulai Import (${parsedData?.validCount || 0} Pengguna)` }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Body (Step 3: Success Completion) -->
        <div v-else-if="importStep === 'success'" class="py-8 text-center space-y-5">
          <div class="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl shadow-lg shadow-emerald-600/20">
            ✅
          </div>
          <div>
            <h4 class="text-xl font-black text-slate-900 dark:text-white">
              Import Pengguna Selesai!
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Data spreadsheet telah berhasil diproses dan disimpan ke database SISARPRA.
            </p>
          </div>

          <div class="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60">
              <div class="text-[10px] font-bold uppercase text-emerald-600">Akun Baru Dibuat</div>
              <div class="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {{ importResult?.createdCount || 0 }}
              </div>
            </div>
            <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60">
              <div class="text-[10px] font-bold uppercase text-amber-600">Akun Diperbarui</div>
              <div class="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
                {{ importResult?.updatedCount || 0 }}
              </div>
            </div>
            <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <div class="text-[10px] font-bold uppercase text-slate-500">Dilewati / Gagal</div>
              <div class="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
                {{ importResult?.skippedCount || 0 }}
              </div>
            </div>
          </div>

          <div class="pt-4">
            <button
              type="button"
              @click="closeImportModal"
              class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

