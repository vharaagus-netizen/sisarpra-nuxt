<script setup>
const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<template>
  <VitePwaManifest />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

