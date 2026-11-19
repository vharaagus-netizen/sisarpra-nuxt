<script setup>
const { user, isStaff, logout } = useAuth()
const { isDark, toggleTheme } = useTheme()
const route = useRoute()

const showingSidebar = ref(false)
const showQRScanner = ref(false)

const roleConfig = computed(() => {
  switch (user.value?.role) {
    case 'admin':
      return { label: 'Super Admin', icon: '👑', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900' }
    case 'petugas':
      return { label: 'Petugas Sarpra', icon: '🛠️', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900' }
    case 'guru':
      return { label: 'Guru / Pendidik', icon: '👨‍🏫', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900' }
    default:
      return { label: 'Siswa / Siswi', icon: '🎓', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900' }
  }
})

const isActive = (path) => route.path === path || route.path.startsWith(`${path}/`)

const triggerPwaInstall = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-pwa-install'))
  }
}
</script>

<template>
  <div class="min-h-screen relative flex bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
    <!-- Background Grid Pattern -->
    <div class="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20 z-0 print:hidden">
      <svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <defs>
          <pattern id="auth-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="0.7" class="text-slate-300 dark:text-slate-700" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-grid-pattern)" />
      </svg>
    </div>

    <!-- Ambient Glow Orbs with Warm Orange & Terracotta Aurora Effect -->
    <div class="fixed -top-40 -left-40 w-[28rem] h-[28rem] bg-orange-500/20 dark:bg-orange-500/10 rounded-full blur-3xl pointer-events-none animate-aurora-1 print:hidden"></div>
    <div class="fixed bottom-0 right-0 w-[30rem] h-[30rem] bg-terracotta-500/15 dark:bg-orange-800/20 rounded-full blur-3xl pointer-events-none animate-aurora-2 print:hidden"></div>
    <div class="fixed top-1/2 left-1/3 w-80 h-80 bg-sage-500/15 dark:bg-orange-950/25 rounded-full blur-3xl pointer-events-none animate-aurora-3 print:hidden"></div>

    <!-- Mobile Sidebar Backdrop -->
    <div
      v-if="showingSidebar"
      @click="showingSidebar = false"
      class="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden print:hidden"
    ></div>

    <!-- Sidebar -->
    <aside
      id="app-sidebar"
      :class="[
        'fixed inset-y-0 left-0 z-50 w-72 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 print:hidden',
        'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80 shadow-xl lg:shadow-none',
        showingSidebar ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="flex flex-col h-full">
        <!-- Sidebar Brand Header -->
        <div class="px-6 py-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80">
          <NuxtLink to="/dashboard" class="flex items-center gap-3 group">
            <div class="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-md shadow-orange-500/10 p-1 flex items-center justify-center group-hover:scale-105 transition-all duration-200">
              <img src="/images/logo.png" alt="Logo SMA Nusaputera" class="w-full h-full object-contain" />
            </div>
            <div>
              <span class="text-xl font-extrabold tracking-tight bg-gradient-to-r from-orange-600 via-orange-500 to-terracotta-500 dark:from-white dark:via-orange-300 dark:to-orange-400 bg-clip-text text-transparent">
                SISARPRA
              </span>
              <span class="text-[9px] block font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider -mt-0.5">
                SMA NUSAPUTERA
              </span>
            </div>
          </NuxtLink>

          <button
            type="button"
            @click="showingSidebar = false"
            class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
          >
            ✕
          </button>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
          <!-- Main Menu -->
          <div>
            <div class="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Menu Utama
            </div>
            <div class="space-y-1">
              <NuxtLink
                to="/dashboard"
                :class="[
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                  isActive('/dashboard')
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                <span>📊</span>
                <span>Dashboard</span>
              </NuxtLink>

              <NuxtLink
                to="/rooms"
                :class="[
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                  isActive('/rooms')
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                <span>🏢</span>
                <span>Peminjaman Ruang</span>
              </NuxtLink>

              <NuxtLink
                to="/items"
                :class="[
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                  isActive('/items')
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                <span>📦</span>
                <span>Peminjaman Barang</span>
              </NuxtLink>

              <NuxtLink
                to="/lab"
                :class="[
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                  isActive('/lab')
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                <span>🔬</span>
                <span>Inventaris Lab (4 Lab)</span>
              </NuxtLink>

              <NuxtLink
                to="/lockers"
                :class="[
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                  isActive('/lockers')
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                <span>🗄️</span>
                <span>Lemari Loker (24)</span>
              </NuxtLink>

              <NuxtLink
                to="/damages"
                :class="[
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                  isActive('/damages')
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                <span>🛠️</span>
                <span>Laporan Kerusakan</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Staff Only Menu -->
          <div v-if="isStaff" class="space-y-5">
            <!-- Operasional -->
            <div>
              <div class="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Operasional Sarpra
              </div>
              <div class="space-y-1">
                <NuxtLink
                  to="/approvals"
                  :class="[
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                    isActive('/approvals')
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  ]"
                >
                  <span>🛡️</span>
                  <span>Persetujuan / Approval</span>
                </NuxtLink>

                <NuxtLink
                  to="/reports"
                  :class="[
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                    isActive('/reports')
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  ]"
                >
                  <span>📈</span>
                  <span>Laporan & Rekapitulasi</span>
                </NuxtLink>

                <NuxtLink
                  to="/procurements"
                  :class="[
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                    isActive('/procurements')
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  ]"
                >
                  <span>📋</span>
                  <span>Pengadaan Barang (Sarpra & Lab)</span>
                </NuxtLink>
              </div>
            </div>

            <!-- Master Data Section -->
            <div>
              <div class="px-3 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center justify-between">
                <span>Master Data</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 font-mono">Admin</span>
              </div>
              <div class="space-y-1">
                <NuxtLink
                  to="/manage/users"
                  :class="[
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                    isActive('/manage/users')
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  ]"
                >
                  <span>👥</span>
                  <span>Master Pengguna (User)</span>
                </NuxtLink>

                <NuxtLink
                  to="/manage/rooms"
                  :class="[
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                    isActive('/manage/rooms')
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  ]"
                >
                  <span>🏢</span>
                  <span>Master Ruangan</span>
                </NuxtLink>

                <NuxtLink
                  to="/manage/items"
                  :class="[
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                    isActive('/manage/items')
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  ]"
                >
                  <span>📦</span>
                  <span>Master Barang & Aset</span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </nav>

        <!-- Sidebar Footer & Logout -->
        <div class="p-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <button
            type="button"
            @click="triggerPwaInstall"
            class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
          >
            <span>📲</span>
            <span>Pasang Aplikasi (PWA)</span>
          </button>

          <button
            type="button"
            @click="logout"
            class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <span>🚪</span>
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Body Area -->
    <div class="flex-1 flex flex-col min-w-0 relative z-10 print:m-0 print:p-0">
      <!-- Top App Header Bar -->
      <header id="app-header" class="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between print:hidden">
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="showingSidebar = true"
            class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            ☰
          </button>
          <div>
            <slot name="header">
              <h1 class="text-lg font-bold text-slate-900 dark:text-white">SMA NUSAPUTERA</h1>
            </slot>
          </div>
        </div>

        <!-- Right Header Controls -->
        <div class="flex items-center gap-2.5">
          <!-- Install App Quick Button -->
          <button
            type="button"
            @click="triggerPwaInstall"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800/60 transition-all shadow-sm"
            title="Pasang SISARPRA sebagai aplikasi"
          >
            <span>📲</span>
            <span class="hidden sm:inline">Install App</span>
          </button>

          <!-- Quick Theme Switch -->
          <button
            type="button"
            @click="toggleTheme"
            class="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60 shadow-sm transition-colors"
            title="Ganti Mode Tampilan (Dark/Light)"
          >
            <span v-if="isDark" class="text-orange-400 text-sm">☀️</span>
            <span v-else class="text-orange-600 text-sm">🌙</span>
          </button>

          <!-- User Pill Badge -->
          <div class="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-terracotta-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {{ user?.name?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div class="hidden sm:block text-left">
              <div class="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {{ user?.name }}
              </div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {{ roleConfig.label }}
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Main Content Slot -->
      <main class="flex-1 p-4 sm:p-6 lg:p-8 print:p-0 print:m-0">
        <slot />
      </main>
    </div>

    <!-- PWA Install Prompt Banner -->
    <PwaInstallPrompt />
  </div>
</template>
