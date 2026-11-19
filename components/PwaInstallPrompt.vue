<script setup>
const isStandalone = ref(false)
const showBanner = ref(false)
const showGuideModal = ref(false)
const deferredPrompt = ref(null)
const isIOS = ref(false)
const activeTab = ref('desktop') // 'desktop' | 'android' | 'ios'

onMounted(() => {
  if (typeof window === 'undefined') return

  // Deteksi standalone
  isStandalone.value =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')

  if (isStandalone.value) {
    return
  }

  // Deteksi OS
  const ua = window.navigator.userAgent.toLowerCase()
  isIOS.value = /iphone|ipad|ipod/.test(ua)
  const isAndroid = /android/.test(ua)

  if (isIOS.value) {
    activeTab.value = 'ios'
  } else if (isAndroid) {
    activeTab.value = 'android'
  } else {
    activeTab.value = 'desktop'
  }

  // Tangkap event browser jika didukung
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    showBanner.value = true
  })

  // Tampilkan banner selamat datang PWA setelah 1.5 detik jika bukan standalone
  setTimeout(() => {
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed')
    if (!dismissed) {
      showBanner.value = true
    }
  }, 1500)

  // Listen custom event dari tombol sidebar atau header
  window.addEventListener('open-pwa-install', () => {
    handleInstallClick()
  })
})

const handleInstallClick = async () => {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      showBanner.value = false
      showGuideModal.value = false
    }
    deferredPrompt.value = null
  } else {
    // Jika browser tidak langsung trigger prompt (misal Chrome Desktop / iOS), buka panduan visual interaktif
    showGuideModal.value = true
  }
}

const dismissBanner = () => {
  showBanner.value = false
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('pwa_banner_dismissed', 'true')
  }
}
</script>

<template>
  <ClientOnly>
    <!-- 1. Floating Banner di Pojok Layar (Jika Belum Standalone) -->
    <div
      v-if="showBanner && !isStandalone"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-subtle"
    >
      <div class="p-4 rounded-3xl bg-slate-900/95 text-white border border-orange-500/40 shadow-2xl backdrop-blur-xl flex flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-orange-600/20 border border-orange-500/30 p-1 flex items-center justify-center shrink-0">
              <img src="/pwa-192x192.png" alt="Logo SISARPRA" class="w-9 h-9 object-contain" />
            </div>
            <div>
              <div class="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                <span>SISARPRA Mobile & Desktop App</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] bg-orange-600 text-white font-bold uppercase">PWA</span>
              </div>
              <p class="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Pasang di Laptop / HP untuk akses cepat langsung tanpa repot ketik URL di browser.
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="dismissBanner"
            class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs"
            title="Tutup sementara"
          >
            ✕
          </button>
        </div>

        <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            @click="dismissBanner"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Nanti Saja
          </button>
          <button
            type="button"
            @click="handleInstallClick"
            class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-extrabold shadow-md shadow-orange-600/30 flex items-center gap-1.5 transition-all duration-200 active:scale-95"
          >
            <span>📲</span>
            <span>Pasang Aplikasi</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 2. Modal Panduan Visual Cara Pasang (Jika browser butuh langkah manual) -->
    <div
      v-if="showGuideModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          type="button"
          @click="showGuideModal = false"
          class="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
        >
          ✕
        </button>

        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 p-1.5 flex items-center justify-center">
            <img src="/pwa-192x192.png" alt="SISARPRA" class="w-9 h-9 object-contain" />
          </div>
          <div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">
              Cara Pasang Aplikasi SISARPRA
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Pilih perangkat yang sedang Anda gunakan:
            </p>
          </div>
        </div>

        <!-- Tab Navigasi Perangkat -->
        <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-4 text-xs font-bold">
          <button
            type="button"
            @click="activeTab = 'desktop'"
            :class="[
              'flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5',
              activeTab === 'desktop'
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            ]"
          >
            <span>💻</span>
            <span>Laptop / PC</span>
          </button>
          <button
            type="button"
            @click="activeTab = 'android'"
            :class="[
              'flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5',
              activeTab === 'android'
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            ]"
          >
            <span>📱</span>
            <span>HP Android</span>
          </button>
          <button
            type="button"
            @click="activeTab = 'ios'"
            :class="[
              'flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5',
              activeTab === 'ios'
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            ]"
          >
            <span>🍎</span>
            <span>iPhone / iPad</span>
          </button>
        </div>

        <!-- Isi Panduan Tab: Laptop / PC -->
        <div v-if="activeTab === 'desktop'" class="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div class="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40">
            <div class="font-bold text-orange-800 dark:text-orange-300 mb-1 flex items-center gap-1.5">
              <span>🎯</span>
              <span>Metode 1 (Paling Cepat): Address Bar Chrome / Edge</span>
            </div>
            <p class="leading-relaxed text-[11px] text-slate-600 dark:text-slate-300">
              Lihat di ujung kanan baris alamat URL browser Anda (sebelah ikon bintang bookmark atau kaca pembesar zoom). Klik ikon <strong>Komputer / Panah Bawah 📥 ("Install SISARPRA")</strong>, lalu klik <strong>Install</strong>.
            </p>
          </div>

          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div class="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <span>⚙️</span>
              <span>Metode 2: Lewat Menu Browser</span>
            </div>
            <ol class="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <li>Klik menu <strong>Titik Tiga (⋮)</strong> di pojok kanan atas browser Google Chrome.</li>
              <li>Pilih menu <strong>"Simpan dan bagikan"</strong> (atau <strong>"Cast, save, and share"</strong>).</li>
              <li>Klik <strong>"Pasang halaman sebagai aplikasi..."</strong> atau <strong>"Pasang SISARPRA"</strong>.</li>
            </ol>
          </div>
        </div>

        <!-- Isi Panduan Tab: HP Android -->
        <div v-if="activeTab === 'android'" class="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
            <div class="font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1.5">
              <span>🤖</span>
              <span>Langkah di Google Chrome Android:</span>
            </div>
            <ol class="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 mt-2">
              <li>Buka alamat web di Google Chrome HP Anda.</li>
              <li>Tekan tombol menu <strong>Titik Tiga (⋮)</strong> di pojok kanan atas layar.</li>
              <li>Pilih opsi <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Pasang Aplikasi"</strong>.</li>
              <li>Ikon SISARPRA akan muncul di menu aplikasi HP seperti aplikasi Play Store!</li>
            </ol>
          </div>
        </div>

        <!-- Isi Panduan Tab: iPhone / iPad -->
        <div v-if="activeTab === 'ios'" class="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div class="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40">
            <div class="font-bold text-indigo-800 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
              <span>🍏</span>
              <span>Langkah di Safari iOS:</span>
            </div>
            <ol class="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 mt-2">
              <li>Buka website menggunakan browser bawaan <strong>Safari</strong>.</li>
              <li>Tekan ikon <strong>Bagikan / Share (kotak dengan panah ke atas ⎋)</strong> di bilah bawah.</li>
              <li>Gulir ke bawah dan ketuk opsi <strong>"Tambah ke Layar Utama" (+)</strong>.</li>
              <li>Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas. Selesai!</li>
            </ol>
          </div>
        </div>

        <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            @click="showGuideModal = false"
            class="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>
