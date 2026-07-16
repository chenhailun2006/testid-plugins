/**
 * Vue 2 + Ant Design Vue + Webpack TestId Demo — 入口文件
 *
 * 编译期：webpack-plugin-vue2-auto-testid (enforce:pre loader)
 *   对 /views/** 和 App.vue 注入 data-testid
 *   对 /components/** 注入 data-test-base-key
 *
 * 运行时：antd-testid-runtime (仅在 dev 模式启用)
 *   MutationObserver 监控 DOM 变化，兜底注入 testid
 *   公共组件锚点计数 + 浮层计数
 */

import Vue from 'vue';
import Antd from 'ant-design-vue';
import App from './App.vue';

Vue.use(Antd);

// ── 开发模式下启用运行时兜底打标 ──
if (process.env.NODE_ENV !== 'production') {
  import(/* webpackChunkName: "testid-runtime" */ '@testid/antd-testid-runtime')
    .then(({ initConfig, TestIdObserver, TestIdChecker }) => {
      initConfig({
        globalPrefix: 'demo',
        compilePrefix: 'static_',
        runtimePagePrefix: 'dynamic_',

        // 浮层组件映射：key → CSS selector
        popupPrefixMap: {
          modal: '.ant-modal-root',
          drawer: '.ant-drawer',
          select: '.ant-select-dropdown',
          datePicker: '.ant-calendar-picker-container',
          popconfirm: '.ant-popover',
          dropdown: '.ant-dropdown',
          tooltip: '.ant-tooltip',
        },

        onlyInteractive: false,
        resetInstanceOnRouteChange: true,
        resetPopupCounterOnRouteChange: true,
      });

      const observer = new TestIdObserver();
      observer.start();

      // 等待 Vue Router 完成初始渲染后全量扫描
      requestAnimationFrame(() => {
        setTimeout(() => {
          observer.fullScan();
          const checker = new TestIdChecker();
          checker.check();

          // 暴露到全局，方便在 DevTools 控制台调试
          window.__testIdObserver = observer;
          window.__testIdChecker = checker;
          console.log(
            '[demo] TestId 运行时已启动。可通过以下命令调试：\n' +
            '  __testIdObserver.fullScan()       — 全量重新扫描\n' +
            '  __testIdObserver.getTestIdMap()    — 查看已注入的 testid 映射\n' +
            '  __testIdChecker.check()            — 检查重复 testid\n' +
            '  __demo.openModal()                 — 打开 Modal\n' +
            '  __demo.openDrawer()                — 打开 Drawer'
          );
        }, 100);
      });
    })
    .catch((err) => {
      console.warn('[demo] 运行时 TestId 模块加载失败（可忽略）:', err.message);
    });
}

// ── 启动应用 ──
new Vue({
  render: (h) => h(App),
}).$mount('#app');
