export const useTheme = () => {
  const isDark = useState<boolean>('theme-dark', () => false)

  const initTheme = () => {
    if (import.meta.client) {
      const saved = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDark.value = saved === 'dark' || (!saved && prefersDark)
      applyTheme()
    }
  }

  const applyTheme = () => {
    if (import.meta.client) {
      if (isDark.value) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    }
  }

  const toggleTheme = () => {
    isDark.value = !isDark.value
    applyTheme()
  }

  return {
    isDark,
    initTheme,
    toggleTheme,
  }
}

