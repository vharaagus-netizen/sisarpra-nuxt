export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser, isStaff } = useAuth()

  // Selalu pastikan user sudah dimuat
  if (!user.value) {
    await fetchUser()
  }

  // Jika belum login dan bukan di halaman login
  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }

  // Jika sudah login dan mencoba membuka halaman login
  if (user.value && to.path === '/login') {
    return navigateTo('/dashboard')
  }

  // Proteksi halaman khusus Petugas / Admin
  const staffOnlyRoutes = ['/manage', '/approvals', '/reports', '/procurements', '/books', '/disposals']
  if (staffOnlyRoutes.some(prefix => to.path.startsWith(prefix))) {
    if (!isStaff.value) {
      return navigateTo('/dashboard')
    }
  }

  // Jika ke root path '/'
  if (to.path === '/') {
    return navigateTo(user.value ? '/dashboard' : '/login')
  }
})
