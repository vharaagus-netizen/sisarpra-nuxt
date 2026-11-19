<script setup>
definePageMeta({
  layout: 'guest'
})

const { login } = useAuth()

const form = ref({
  email: '',
  password: '',
})

const loading = ref(false)
const errorMessage = ref('')
const selectedRole = ref(null)

const demoAccounts = [
  {
    role: 'Admin',
    title: 'Super Admin',
    email: 'admin@sisarpra.test',
    password: 'password',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/50',
    activeClass: 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/60 dark:ring-rose-400',
    icon: '👑',
  },
  {
    role: 'Petugas',
    title: 'Petugas Sarpra',
    email: 'petugas@sisarpra.test',
    password: 'password',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/50',
    activeClass: 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/60 dark:ring-amber-400',
    icon: '🛠️',
  },
  {
    role: 'Guru',
    title: 'Budi (Guru)',
    email: 'guru@sisarpra.test',
    password: 'password',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    activeClass: 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 dark:ring-emerald-400',
    icon: '👨‍🏫',
  },
  {
    role: 'Siswa',
    title: 'Ahmad (Siswa)',
    email: 'siswa@sisarpra.test',
    password: 'password',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/50',
    activeClass: 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/60 dark:ring-blue-400',
    icon: '🎓',
  },
]

const pickDemo = (acc) => {
  form.value.email = acc.email
  form.value.password = acc.password
  selectedRole.value = acc.role
}

const handleLogin = async () => {
  try {
    loading.value = true
    errorMessage.value = ''
    await login(form.value.email, form.value.password)
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    } else {
      await navigateTo('/dashboard', { replace: true })
    }
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Login gagal. Periksa kembali email dan password Anda.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <div class="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-slate-800 shadow-2xl rounded-3xl p-6 sm:p-8 transition-all duration-300 glass-card-interactive">
      <!-- Decorative Warm Orange & Terracotta Accent Glow -->
      <div class="absolute -top-1 -right-1 w-24 h-24 bg-gradient-to-br from-orange-500/25 via-terracotta-500/20 to-transparent rounded-tr-3xl pointer-events-none blur-sm"></div>
      <div class="absolute -bottom-1 -left-1 w-20 h-20 bg-gradient-to-tr from-sage-500/20 to-transparent rounded-bl-3xl pointer-events-none blur-sm"></div>

      <div class="mb-5 text-center sm:text-left relative z-10">
        <div class="flex items-center gap-3 mb-3 lg:hidden justify-center sm:justify-start">
          <img src="/images/logo.png" alt="SMA Nusaputera" class="w-10 h-10 object-contain drop-shadow" />
          <div>
            <div class="text-base font-extrabold text-slate-900 dark:text-white leading-tight">SISARPRA</div>
            <div class="text-[9px] font-bold text-orange-600 dark:text-orange-400">SMA NUSAPUTERA</div>
          </div>
        </div>
        <span class="inline-block px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 mb-2">
          Portal Akses
        </span>
        <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Masuk ke Sistem
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Gunakan akun sekolah Anda untuk melanjutkan.
        </p>
      </div>

      <!-- Demo Account Picker -->
      <div class="mb-6 p-3.5 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl relative z-10">
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span class="status-dot-radar status-dot-radar-green w-2 h-2 rounded-full bg-emerald-500"></span>
            Akun Uji Coba (Pilih Cepat)
          </span>
          <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            Pass: password
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="acc in demoAccounts"
            :key="acc.role"
            type="button"
            @click="pickDemo(acc)"
            :class="[
              'flex items-center gap-2 p-2 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-sm',
              acc.badgeClass,
              selectedRole === acc.role ? acc.activeClass : ''
            ]"
          >
            <span class="text-lg shrink-0">{{ acc.icon }}</span>
            <div class="min-w-0">
              <div class="text-xs font-bold leading-tight truncate">
                {{ acc.role }}
              </div>
              <div class="text-[10px] opacity-75 leading-tight truncate">
                {{ acc.email }}
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Error Notification -->
      <div
        v-if="errorMessage"
        class="mb-4 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 p-3 rounded-xl flex items-center gap-2"
      >
        <span>⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Alamat Email / Nomor Induk
          </label>
          <input
            v-model="form.email"
            type="email"
            required
            placeholder="nama@sisarpra.test"
            class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 outline-none transition-all"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Kata Sandi
          </label>
          <input
            v-model="form.password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full mt-2 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-xs font-bold shadow-lg shadow-orange-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 btn-shimmer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>{{ loading ? 'Memverifikasi...' : 'Masuk ke SISARPRA' }}</span>
          <span>→</span>
        </button>
      </form>
    </div>
  </div>
</template>

