import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Vite 配置：Vue 插件 + @ 别名指向 src 目录
export default defineConfig({
  plugins: [vue()],
  // 相对路径 base，便于静态部署到任意子目录
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // three.js 单独成 chunk，便于长期缓存
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
})
