import { readFileSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

interface PackageManifest {
  version: string
}

const packageManifest = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as PackageManifest

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageManifest.version),
  },
})
