import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createTasksApiPlugin } from './tasks-api.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    createTasksApiPlugin(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        profile: fileURLToPath(new URL('./profile.html', import.meta.url)),
        login: fileURLToPath(new URL('./login.html', import.meta.url)),
        logout: fileURLToPath(new URL('./logout.html', import.meta.url)),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
