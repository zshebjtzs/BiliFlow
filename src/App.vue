<script setup lang="ts">
import { NConfigProvider } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import HomeView from './views/HomeView.vue'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#fb7299',
    primaryColorHover: '#ff8cab',
    primaryColorPressed: '#e45f88',
    fontFamily:
      '"Segoe UI Variable", "Segoe UI", "Microsoft YaHei UI", "PingFang SC", sans-serif',
    borderRadius: '10px',
  },
  Tag: {
    borderRadius: '999px',
  },
}
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <HomeView />
  </NConfigProvider>
</template>
