/**
 * Vue 2 插件桥接 — testIdVue2Plugin.ts
 *
 * 铁三角第二层 (Vue 2 版本)：绕过 UI 库组件 inheritAttrs: false 的限制。
 *
 * 问题背景:
 *   编译期在 <a-menu-item data-test-base-key="..."> 上注入属性，
 *   但 Ant Design Vue 1.x 等 UI 库组件通常设置 inheritAttrs: false，
 *   导致非 prop 属性不会自动传递到渲染后的 DOM 元素上。
 *
 * 解决方案:
 *   通过 Vue.mixin({ mounted() }) 全局混入，在每个组件挂载后，
 *   从 $attrs 中读取插件关注的属性并手动写入 $el。
 *
 *   对于 inheritAttrs: true (默认) 的组件，Vue 已自动应用属性到 $el，
 *   hasAttribute 检查会跳过避免重复写入。
 *
 * 使用方式:
 *   import Vue from 'vue';
 *   import { TestIdVue2Plugin } from '@testid/antd-testid-runtime';
 *   Vue.use(TestIdVue2Plugin);  // 必须在 new Vue() 之前调用
 */

/** 插件关注的属性名列表 */
const WATCHED_ATTRS = ['data-testid', 'data-test-base-key'];

/**
 * Vue 2 插件对象（遵循 Vue.use() 规范）
 */
export const TestIdVue2Plugin = {
  install(_Vue: any): void {
    _Vue.mixin({
      mounted(this: { $el: HTMLElement | null; $attrs?: Record<string, unknown> }) {
        const el = this.$el;
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
