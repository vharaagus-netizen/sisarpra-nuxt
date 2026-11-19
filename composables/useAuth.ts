export interface UserProfile {
  id: number
  name: string
  email: string
  role: 'admin' | 'petugas' | 'guru' | 'siswa'
  nomor_induk?: string | null
  no_telepon?: string | null
  kelas_jurusan?: string | null
}

export const useAuth = () => {
  const user = useState<UserProfile | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => false)

  const isStaff = computed(() => ['admin', 'petugas'].includes(user.value?.role || ''))
  const isAdmin = computed(() => user.value?.role === 'admin')

  const fetchUser = async () => {
    try {
      loading.value = true
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await $fetch<{ authenticated: boolean; user: UserProfile | null }>('/api/auth/me', {
        headers,
      })
      user.value = data.user
      return data.user
    } catch {
      user.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  const login = async (email: string, password: string) => {
    const data = await $fetch<{ success: boolean; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    user.value = data.user
    return data.user
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      user.value = null
      navigateTo('/login')
    }
  }

  return {
    user,
    loading,
    isStaff,
    isAdmin,
    fetchUser,
    login,
    logout,
  }
}

