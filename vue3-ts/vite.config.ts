import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 修复 echarts-gl 与 echarts 6.0 的兼容性问题
      'echarts/lib/echarts': 'echarts'
    },
  },
  optimizeDeps: {
    include: ['echarts-gl'],
  },
  server: {
    port: 5173, // Vue3管理端使用5173端口
    open: true,
    proxy: {
      // 本地将 /api 转发到后端，解决浏览器 CORS 问题
      '/api': {
        target: 'http://localhost:3000', // 后端运行在3000端口
        changeOrigin: true,
        // 保留 /api 前缀，后端如果不需要可去掉 rewrite
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
