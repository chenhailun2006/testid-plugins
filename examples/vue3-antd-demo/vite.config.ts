import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vitePluginAutoTestId from '@testid/vite-plugin-auto-testid';

export default defineConfig({
  plugins: [
    vue(),
    vitePluginAutoTestId({
      // 全局前缀，如设为 "hall"，则实际 testid 前缀为 hall_static_、hall_dynamic_
      globalPrefix: 'hall',
      // App.vue 是根布局，也视为页面组件
      viewPatterns: ['/views/', 'App.vue'],
      commonPatterns: ['/components/', '/common/'],
      compilePrefix: 'static_',
    }),
  ],
});
