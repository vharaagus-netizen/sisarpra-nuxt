<script setup>
const props = defineProps({
  url: { type: String, default: '' },
  title: { type: String, default: 'Dokumentasi Google Drive' },
  compact: { type: Boolean, default: false }
})

const cleanUrl = computed(() => (props.url ? String(props.url).trim() : ''))
const fileId = computed(() => extractGoogleDriveFileId(cleanUrl.value))
const isFolder = computed(() => isGoogleDriveFolderUrl(cleanUrl.value))
const isDrive = computed(() => isGoogleDriveUrl(cleanUrl.value))
const previewIframeUrl = computed(() => getGoogleDrivePreviewUrl(cleanUrl.value))

// Multi-stage image fallback: thumbnail?id -> lh3.googleusercontent -> fallback document card
const imageStage = ref(0)
watch(() => props.url, () => {
  imageStage.value = 0
})

const currentImgSrc = computed(() => {
  if (!cleanUrl.value) return ''
  if (fileId.value) {
    if (imageStage.value === 0) return getGoogleDriveThumbnailUrl(cleanUrl.value, 900)
    if (imageStage.value === 1) return getGoogleDriveFallbackImageUrl(cleanUrl.value, 900)
    return ''
  }
  if (isDirectImageUrl(cleanUrl.value) && imageStage.value === 0) {
    return cleanUrl.value
  }
  return ''
})

const onImgError = () => {
  if (fileId.value && imageStage.value < 2) {
    imageStage.value += 1
  } else {
    imageStage.value = 99
  }
}

const showLightbox = ref(false)
</script>

<template>
  <div v-if="cleanUrl" class="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/50 overflow-hidden">
    <!-- Thumbnail Image if available -->
    <div v-if="currentImgSrc" class="relative group bg-slate-100 dark:bg-slate-900/70 flex items-center justify-center overflow-hidden" :class="compact ? 'h-32' : 'h-44 sm:h-52'">
      <img
        :src="currentImgSrc"
        :alt="title"
        loading="lazy"
        @error="onImgError"
        @click="showLightbox = true"
        class="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <div class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-950/75 via-slate-950/30 to-transparent flex items-center justify-between gap-2">
        <span class="text-[10px] font-bold text-white truncate drop-shadow">{{ title }}</span>
        <div class="flex items-center gap-1 shrink-0">
          <button
            v-if="previewIframeUrl || currentImgSrc"
            type="button"
            @click="showLightbox = true"
            class="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[10px] font-bold transition-colors"
          >
            🔍 Pratinjau
          </button>
          <a
            :href="cleanUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="px-2 py-1 rounded-lg bg-orange-600/90 hover:bg-orange-500 text-white text-[10px] font-bold transition-colors"
          >
            ↗ Buka
          </a>
        </div>
      </div>
    </div>

    <!-- Fallback Card for Folder, Non-Image PDF, or External URL -->
    <div v-else class="p-3 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-base shrink-0">
          {{ isFolder ? '📁' : isDrive ? '📄' : '🔗' }}
        </div>
        <div class="min-w-0">
          <div class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {{ title }}
          </div>
          <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
            {{ isFolder ? 'Folder Google Drive' : isDrive ? 'File Google Drive (Foto / PDF)' : cleanUrl }}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <button
          v-if="previewIframeUrl"
          type="button"
          @click="showLightbox = true"
          class="px-2.5 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-[11px] font-bold transition-colors"
        >
          👁️ Lihat
        </button>
        <a
          :href="cleanUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold shadow-sm transition-colors"
        >
          ↗ Buka
        </a>
      </div>
    </div>

    <!-- Modal Lightbox Preview -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="showLightbox"
          class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in print:hidden"
          @click.self="showLightbox = false"
        >
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-4 sm:p-5 shadow-2xl flex flex-col max-h-[92vh]">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div class="font-bold text-sm text-slate-900 dark:text-white truncate pr-4">
                📎 {{ title }}
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <a
                  :href="cleanUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1"
                >
                  <span>↗</span>
                  <span>Buka di Google Drive</span>
                </a>
                <button
                  type="button"
                  @click="showLightbox = false"
                  class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div class="flex-1 min-h-[380px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
              <iframe
                v-if="previewIframeUrl"
                :src="previewIframeUrl"
                class="w-full h-[70vh] border-0"
                allow="autoplay"
              ></iframe>
              <img
                v-else-if="currentImgSrc"
                :src="currentImgSrc"
                :alt="title"
                class="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>
