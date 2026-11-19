/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'sans-serif'],
      },
      colors: {
        // 1. Palet Oranye Spesifik Sesuai Request User
        brand: {
          // Light Mode
          lightBg: '#FFF7EE',       // Background Utama Light (Krem/Putih hangat)
          lightWarm: '#FFF0DD',     // Krem hangat alternatif
          lightCard: '#FFFFFF',     // Background Card/Container (Putih bersih)
          lightText: '#1E1E1E',     // Teks Utama (Abu-abu sangat gelap)
          lightSec: '#633A00',      // Teks Sekunder (Kecoklatan)
          lightMuted: '#5A5A5A',    // Teks Sekunder (Abu-abu netral)
          orange: '#FF6F00',        // Primary Accent Light (Oranye terang bertenaga)
          terracotta: '#E76F51',    // Oranye terracotta
          cream: '#FDFBD4',         // Pendukung (Krem lembut)
          sage: '#98A869',          // Pendukung (Hijau sage)

          // Dark Mode
          darkBg: '#0A0A0A',        // Background Utama Dark (Hitam pekat)
          darkAlt: '#121212',       // Background Utama Dark (Abu-abu gelap)
          darkCard: '#1E1E1E',      // Background Card/Container Dark
          darkCardAlt: '#262626',   // Background Card Alt
          darkText: '#FFF7EE',      // Teks Utama Dark (Putih gading/krem lembut)
          darkSec: '#B39D83',       // Teks Sekunder Dark (Abu kecoklatan hangat)
          darkOrange: '#FFA53F',    // Primary Accent Dark (Neon/Soft Orange)
          darkAccent: '#FE8D01',    // Dark Orange saturasi pas latar gelap
          burnt: '#C5620B',         // Pendukung (Burnt orange untuk border/elemen pasif)
        },

        // 2. Oranye Accent Hierarchy
        orange: {
          50: '#FFF7EE',
          100: '#FFF0DD',
          200: '#FDFBD4',
          300: '#FED7AA',
          400: '#FFA53F', // Neon/Soft Orange untuk Dark Mode
          500: '#FE8D01', // Dark Orange saturasi pas
          600: '#FF6F00', // Primary Accent Light Mode
          700: '#E76F51', // Terracotta
          800: '#C5620B', // Burnt orange
          900: '#633A00', // Teks sekunder kecoklatan
          950: '#3D1C00',
        },

        // 3. Warna Pendukung Khusus
        sage: {
          50: '#f6f7f2',
          100: '#ebeedf',
          200: '#d7dfbf',
          500: '#98A869',
          600: '#829154',
          700: '#687443',
        },
        terracotta: {
          400: '#f08a71',
          500: '#E76F51',
          600: '#d55a3c',
          700: '#b84427',
        },

        // 4. Transformasi Slate & Indigo agar seluruh halaman yang sudah ada
        // otomatis mengadopsi palet Oranye, Krem (#FFF7EE), dan Hitam (#0A0A0A)
        indigo: {
          50: '#FFF7EE',
          100: '#FFF0DD',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FFA53F', // Dark mode accent
          500: '#FE8D01', // Dark mode hover/accent
          600: '#FF6F00', // Primary accent
          700: '#E76F51', // Terracotta
          800: '#C5620B', // Burnt orange
          900: '#633A00',
          950: '#381A00',
        },
        slate: {
          50: '#FFFDF9',
          100: '#FFF7EE', // Background Utama Light (#FFF7EE)
          200: '#F0E6D8', // Border Halus Light Mode
          300: '#D9C8B4',
          400: '#8C7A6B',
          500: '#5A5A5A', // Teks Sekunder Netral
          600: '#633A00', // Teks Sekunder Kecoklatan (#633A00)
          700: '#3D312A',
          800: '#262626', // Card Alt Dark Mode (#262626)
          900: '#1E1E1E', // Card Container Dark Mode (#1E1E1E)
          950: '#0A0A0A', // Background Utama Dark (#0A0A0A)
        },
      },
    },
  },
  plugins: [],
}
