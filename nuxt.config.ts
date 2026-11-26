import fs from 'node:fs'
import path from 'node:path'

// Auto-sync logo into public/images before Vite/Nuxt boots
try {
  const destDir = path.resolve(process.cwd(), 'public/images')
  const destFile = path.resolve(destDir, 'logo.png')
  const src1 = 'd:/xampp/htdocs/sisarpra/public/images/logo.png'
  const src2 = 'C:/Users/WINDOWS/.gemini/antigravity/brain/a558ada9-33ae-4f46-8fe5-a5900043f76b/.user_uploaded/media_1793060471534_bbedbdbd.png'

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  if (!fs.existsSync(destFile)) {
    if (fs.existsSync(src1)) {
      fs.copyFileSync(src1, destFile)
    } else if (fs.existsSync(src2)) {
      fs.copyFileSync(src2, destFile)
    }
  }
} catch (e) {
  // Ignore fallback
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  devServer: {
    host: '0.0.0.0',
    port: 3000
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt'
  ],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'SISARPRA - SMA Nusaputera Semarang',
      short_name: 'SISARPRA',
      description: 'Sistem Informasi Sarana dan Prasarana SMA Nusaputera Semarang',
      theme_color: '#ea580c',
      background_color: '#0f172a',
      display: 'standalone',
      orientation: 'portrait-primary',
      start_url: '/',
      scope: '/',
      lang: 'id',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/pwa-maskable-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: '/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    generateSW: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      type: 'module'
    }
  },

  css: [
    '~/assets/css/main.css'
  ],

  app: {
    head: {
      title: 'SISARPRA - SMA NUSAPUTERA',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Sistem Informasi Sarana dan Prasarana SMA Nusaputera Semarang' },
        { name: 'theme-color', content: '#ea580c' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'SISARPRA' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/images/logo.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.bunny.net' },
        { rel: 'stylesheet', href: 'https://fonts.bunny.net/css?family=figtree:400,500,600,700,800,900&display=swap' }
      ]
    }
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'sisarpra_default_secret_key_2026',
    gdriveWebhookUrl: process.env.GDRIVE_WEBHOOK_URL || '',
    gdriveUploadSecret: process.env.GDRIVE_UPLOAD_SECRET || '',
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'SISARPRA SMA NUSAPUTERA',
      schoolName: process.env.NUXT_PUBLIC_SCHOOL_NAME || 'SMA NUSAPUTERA SEMARANG'
    }
  }
})
