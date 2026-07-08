/**
 * main.ts — 应用入口，集成 antd-testid-runtime 运行时打标能力
 *
 * 仅 import.meta.env.DEV 时加载，生产构建自动 tree-shake
 */

import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import Home from './views/Home.vue';
import About from './views/About.vue';

// ── 运行时打标模块静态导入 (生产构建时 tree-shake 移除) ──
import {
  initConfig,
  TestIdObserver,
  resetAllAnchorCounters,
  resetAllPopupCounters,
  TestIdChecker,
} from '@chenhailun2006/antd-testid-runtime';

// ── 初始化配置 (仅 DEV 生效) ──
if (import.meta.env.DEV) {
  initConfig({
    // 全局前缀，与 vite-plugin-auto-testid 的 globalPrefix 保持一致
    globalPrefix: 'hall',
    compilePrefix: 'static_',
    runtimePagePrefix: 'dynamic_',
    popupPrefixMap: {
      modal: 'modal_',
      drawer: 'drawer_',
      select: 'select_',
      datePicker: 'datePicker_',
      popconfirm: 'popconfirm_',
      dropdown: 'dropdown_',
      tooltip: 'tooltip_',
    },
    onlyInteractive: false,
    resetInstanceOnRouteChange: true,
    resetPopupCounterOnRouteChange: true,
  });
}

// ── 创建路由 ──
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/about', name: 'About', component: About },
  ],
});

// ── 创建应用 ──
const app = createApp(App);
app.use(router);
app.mount('#app');

// ── 运行时打标初始化 (仅 DEV) ──
// ⚠️ 以下代码在 vite build 时会被整体 tree-shake 移除
if (import.meta.env.DEV) {
  const observer = new TestIdObserver();

  // 启动 Observer
  observer.start();

  // 首次渲染后全量扫描 + 重复检测
  requestAnimationFrame(() => {
    observer.fullScan();
    setTimeout(() => {
      TestIdChecker.check();
    }, 500);
  });

  // 路由守卫
  router.beforeEach((to) => {
    observer.setRoute(String(to.name || to.path));
  });

  router.afterEach(() => {
    resetAllAnchorCounters();
    resetAllPopupCounters();
    observer.resetPopupChildCounter();

    setTimeout(() => {
      TestIdChecker.check();
    }, 300);
  });

  // 挂载到 window 方便开发调试
  (window as any).__testIdObserver = observer;
  (window as any).__testIdChecker = TestIdChecker;

  console.log(
    '%c[antd-testid-runtime] %c运行时打标模块已启动 %c(仅 DEV 环境)',
    'color: #4ecdc4; font-weight: bold;',
    'color: #666;',
    'color: #999;'
  );
  console.log(
    '%c  💡 console commands: %c__testIdObserver.fullScan() %c| %c__testIdChecker.check()',
    'color: #999;',
    'color: #4ecdc4;',
    'color: #999;',
    'color: #4ecdc4;'
  );
}
