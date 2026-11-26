<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  folder: { type: String, default: 'Kerusakan' },
  label: { type: String, default: 'Dokumentasi Foto / File (Google Drive)' },
  allowPdf: { type: Boolean, default: false },
  placeholder: { type: String, default: 'https://drive.google.com/file/d/... (opsional)' },
  hint: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const { isStaff } = useAuth()

// Fetch upload capability status once and share across components
const uploadStatus = useState('gdrive-upload-status', () => null)
onMounted(async () => {
  if (!uploadStatus.value) {
    try {
      uploadStatus.value = await $fetch('/api/upload/status')
    } catch {
      uploadStatus.value = { configured: false, canUploadPdf: isStaff.value, maxRawBytes: 3 * 1024 * 1024 }
    }
  }
})

const canUsePdf = computed(() => Boolean(props.allowPdf && isStaff.value))
const isConfigured = computed(() => Boolean(uploadStatus.value?.configured))

const acceptAttr = computed(() => {
  return canUsePdf.value
    ? 'image/jpeg,image/png,image/webp,application/pdf'
    : 'image/jpeg,image/png,image/webp'
})

const fileInputRef = ref(null)
const uploading = ref(false)
const uploadMessage = ref('')
const uploadError = ref('')

const localUrl = computed({
  get: () => props.modelValue || '',
  set: (val) => emit('update:modelValue', val)
})

const compressImageToJpegBase64 = (file, maxDimension = 1600, quality = 0.82) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height / width) * maxDimension)
            width = maxDimension
          } else {
            width = Math.round((width / height) * maxDimension)
            height = maxDimension
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Browser tidak mendukung kompresi gambar canvas.'))
          return
        }
        // Background putih untuk gambar PNG transparan agar rapi saat dikonversi ke JPEG
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const base64 = dataUrl.split(',')[1] || ''
        resolve({ base64, mimeType: 'image/jpeg', ext: '.jpg' })
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.split(',')[1] || ''
      resolve(base64)
    }
    reader.readAsDataURL(file)
  })
}

const triggerPicker = () => {
  uploadError.value = ''
  uploadMessage.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

const onFileSelected = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  uploadError.value = ''
  uploadMessage.value = ''

  const mime = (file.type || '').toLowerCase()
  const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(mime)
  const isPdf = mime === 'application/pdf'

  if (!isImage && !(isPdf && canUsePdf.value)) {
    uploadError.value = canUsePdf.value
      ? 'Format harus JPG, PNG, WebP, atau PDF.'
      : 'Guru & Siswa hanya dapat mengunggah foto (JPG, PNG, atau WebP).'
    return
  }

  uploading.value = true
  try {
    let payloadMime = mime
    let payloadBase64 = ''
    let payloadFilename = file.name || 'dokumentasi'

    if (isImage) {
      // Kompres otomatis agar cepat diunggah, hemat kuota Drive, dan aman limit Vercel
      const compressed = await compressImageToJpegBase64(file)
      payloadMime = compressed.mimeType
      payloadBase64 = compressed.base64
      payloadFilename = payloadFilename.replace(/\.[a-zA-Z0-9]+$/, '') + compressed.ext
    } else if (isPdf) {
      if (file.size > 3 * 1024 * 1024) {
        throw new Error('Ukuran file PDF maksimal 3 MB. Silakan perkecil ukuran PDF atau tempel link Drive secara manual.')
      }
      payloadBase64 = await readFileAsBase64(file)
    }

    const res = await $fetch('/api/upload/gdrive', {
      method: 'POST',
      body: {
        filename: payloadFilename,
        mimeType: payloadMime,
        base64: payloadBase64,
        folder: props.folder
      }
    })

    if (res?.viewUrl) {
      emit('update:modelValue', res.viewUrl)
      uploadMessage.value = `Berhasil diunggah ke folder Drive "${props.folder}" (akses hanya lihat).`
    }
  } catch (err) {
    uploadError.value = err?.data?.statusMessage || err?.message || 'Gagal mengunggah ke Google Drive.'
  } finally {
    uploading.value = false
  }
}

const clearValue = () => {
  emit('update:modelValue', '')
  uploadMessage.value = ''
  uploadError.value = ''
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <label class="block font-bold text-slate-700 dark:text-slate-300 text-xs">
        {{ label }}
      </label>
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
        {{ canUsePdf ? 'JPG / PNG / WebP / PDF (Maks 3 MB)' : 'Khusus Foto JPG / PNG / WebP' }}
      </span>
    </div>

    <!-- Action Bar: Upload Button + Manual URL Input -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <input
        ref="fileInputRef"
        type="file"
        :accept="acceptAttr"
        class="hidden"
        @change="onFileSelected"
      />

      <button
        type="button"
        @click="triggerPicker"
        :disabled="uploading"
        :class="[
          'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-sm',
          isConfigured
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 disabled:opacity-60'
            : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-60'
        ]"
        :title="isConfigured ? 'Upload langsung ke Google Drive Sekolah (Aman, 0 KB di DB)' : 'Memerlukan setup GDRIVE_WEBHOOK_URL di server (Apps Script)'"
      >
        <span v-if="uploading" class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
        <span v-else>📤</span>
        <span>{{ uploading ? 'Mengunggah...' : 'Upload ke Drive Sekolah' }}</span>
      </button>

      <div class="relative flex-1">
        <input
          type="text"
          v-model="localUrl"
          :placeholder="placeholder"
          class="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        />
        <button
          v-if="localUrl"
          type="button"
          @click="clearValue"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 text-xs px-1"
          title="Hapus link"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Setup Warning or Upload Feedback -->
    <div v-if="uploadStatus && !isConfigured && !uploadError" class="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
      <span>ℹ️</span>
      <span>Tombol upload otomatis menunggu URL Google Apps Script dipasang di server; Anda tetap bisa menempel link Google Drive manual di sebelah tombol.</span>
    </div>

    <div v-if="uploadMessage" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
      <span>✅</span>
      <span>{{ uploadMessage }}</span>
    </div>

    <div v-if="uploadError" class="text-[11px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-2.5 py-1.5 rounded-lg">
      ⚠️ {{ uploadError }}
    </div>

    <p v-if="hint" class="text-[10px] text-slate-400">
      {{ hint }}
    </p>

    <!-- Live Thumbnail Preview -->
    <DrivePreviewCard
      v-if="localUrl"
      :url="localUrl"
      :title="label"
      compact
    />
  </div>
</template>
