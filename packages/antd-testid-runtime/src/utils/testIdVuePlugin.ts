/**
 * Vue 3 插件桥接 — testIdVuePlugin.ts
 *
 * 铁三角第二层：绕过 UI 库组件 inheritAttrs: false 的限制。
 *
 * 问题背景:
 *   编译期在 <a-menu-item data-test-base-key="..."> 上注入属性，
 *   但 Ant Design Vue 等 UI 库组件通常设置 inheritAttrs: false，
 *   导致非 prop 属性不会自动传递到渲染后的 DOM 元素上。
 *
 * 解决方案:
 *   通过 app.mixin({ mounted() }) 全局混入，在每个组件挂载后，
 *   从 Vue 内部的 $attrs 中读取插件关注的属性并手动写入 $el。
 *
 *   对于 inheritAttrs: true (默认) 的组件，Vue 已自动应用属性到 $el，
 *   hasAttribute 检查会跳过避免重复写入。
 *
 * 使用方式:
 *   import { TestIdVuePlugin } from '@testid/antd-testid-runtime';
 *   app.use(TestIdVuePlugin);  // 必须在 app.mount() 之前调用
 */

import type { App } from 'vue';

/** 插件关注的属性名列表 */
const WATCHED_ATTRS = ['data-testid', 'data-test-base-key'];

export const TestIdVuePlugin = {
  install(app: App): void {
    app.mixin({
      mounted(this: { $el: unknown; $attrs?: Record<string, unknown> }) {
        const el = this.$el as HTMLElement | null;
        if (!el) return;

        const attrs = this.$attrs || {};
        if (!attrs || typeof attrs !== 'object') return;

        for (const attr of WATCHED_ATTRS) {
          const value = attrs[attr];
          if (value != null && !el.hasAttribute(attr)) {
            el.setAttribute(attr, String(value));
          }
        }
      },
    });
  },
};
