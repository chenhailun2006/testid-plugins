import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3100,
    open: true,
  },
  optimizeDeps: {
    // runtime 模块由 Vite 处理 ESM 导入
    // Vue 2 / Element UI 走 CDN，不进 Vite 的预构建
    exclude: [],
  },
});
