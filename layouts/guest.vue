<script setup>
const { isDark, toggleTheme } = useTheme()

const triggerPwaInstall = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-pwa-install'))
  }
}
</script>

<template>
  <div class="min-h-screen relative overflow-hidden transition-colors duration-300 bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-between">
    <!-- Background Grid Pattern -->
    <div class="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
      <svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <defs>
          <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="0.7" class="text-slate-300 dark:text-slate-700" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>
    </div>

    <!-- Glowing Decorative Ambient Orbs with Warm Orange & Terracotta Aurora Effect -->
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-orange-500/25 dark:bg-orange-500/15 rounded-full blur-3xl pointer-events-none animate-aurora-1"></div>
    <div class="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-terracotta-500/20 dark:bg-orange-800/20 rounded-full blur-3xl pointer-events-none animate-aurora-2"></div>
    <div class="absolute -bottom-32 left-1/4 w-[26rem] h-[26rem] bg-sage-500/15 dark:bg-orange-950/25 rounded-full blur-3xl pointer-events-none animate-aurora-3"></div>

    <!-- Top Navigation Bar -->
    <header class="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between animate-entrance">
      <NuxtLink to="/login" class="flex items-center gap-3 group">
        <div class="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-orange-500/10 p-1 flex items-center justify-center group-hover:scale-105 transition-all duration-200">
          <img src="/images/logo.png" alt="Logo SMA Nusaputera" class="w-full h-full object-contain" />
        </div>
        <div>
          <span class="text-xl font-extrabold tracking-tight bg-gradient-to-r from-orange-600 via-orange-500 to-terracotta-500 dark:from-white dark:via-orange-300 dark:to-orange-400 bg-clip-text text-transparent">
            SISARPRA
          </span>
          <span class="text-[10px] block font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider -mt-0.5">
            SMA NUSAPUTERA
          </span>
        </div>
      </NuxtLink>

      <div class="flex items-center gap-2">
        <!-- Install App Button -->
        <button
          type="button"
          @click="triggerPwaInstall"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-orange-600 dark:text-orange-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow transition-all duration-200"
          title="Pasang SISARPRA sebagai aplikasi"
        >
          <span>📲</span>
          <span class="hidden sm:inline">Install App</span>
        </button>

        <!-- Theme Toggle Button -->
        <button
          type="button"
          @click="toggleTheme"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow transition-all duration-200"
          title="Ganti Mode Tampilan (Dark/Light)"
        >
          <span v-if="isDark" class="text-orange-400 text-sm">☀️</span>
          <span v-else class="text-orange-600 text-sm">🌙</span>
          <span>{{ isDark ? 'Mode Terang' : 'Mode Gelap' }}</span>
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex items-center justify-center">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center sm:flex sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400">
      <div>
        &copy; {{ new Date().getFullYear() }} SISARPRA • SMA NUSAPUTERA SEMARANG
      </div>
      <div class="mt-2 sm:mt-0 flex justify-center items-center gap-4">
        <span>Full-Stack Nuxt 3</span>
        <span>•</span>
        <span>TiDB Cloud Serverless</span>
      </div>
    </footer>

    <!-- PWA Install Prompt Banner -->
    <PwaInstallPrompt />
  </div>
</template>

