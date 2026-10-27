import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Vite 配置：Vue 插件 + @ 别名指向 src 目录
export default defineConfig(({ command }) => ({
  plugins: [vue()],
  // 开发环境 '/'；生产构建为子路径 '/ldxq/'（部署在 https://www.maas.com/ldxq 下）
  // 该值同时决定：① 静态资源引用路径 ② api.js 的接口前缀（import.meta.env.BASE_URL）
  base: command === 'build' ? '/ldxq/' : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['.trycloudflare.com'], // cloudflared 隧道的随机子域名
    // 开发环境把 /api 代理到本地后端，避免跨域
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  // vite preview（临时线上测试）：同样把 /api 代理到本地后端
  preview: {
    port: 4173,
    host: true,
    allowedHosts: ['.trycloudflare.com'], // cloudflared 隧道的随机子域名
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
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
}))
