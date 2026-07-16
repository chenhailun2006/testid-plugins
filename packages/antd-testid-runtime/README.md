# @testid/antd-testid-runtime

运行时兜底打标模块 — MutationObserver + 锚点计数器 + 浮层计数器 + ID 重复检测。

用于 Vue 2 / Vue 3 + Ant Design Vue / Element Plus 项目的 E2E 测试，为编译期无法覆盖的动态节点和浮层节点自动注入 `data-testid` 属性。

## 特性

- **MutationObserver 自动打标** — 监听 DOM 变化，对动态插入的节点自动注入 `data-testid`
- **公共组件锚点定位** — 基于父模板结构定位，解决公共组件多实例 ID 重复问题
- **浮层独立计数器** — Modal / Drawer / Select / DatePicker 等浮层类型各自维护独立计数器
- **UI 库适配器** — 可插拔的适配器架构，内置 Ant Design Vue 和 Element Plus 适配器
- **ID 重复检测** — 按前缀分组检测重复 `data-testid`，控制台格式化告警
- **Vue 插件桥接** — 绕过 UI 库组件 `inheritAttrs: false` 限制（同时提供 Vue 2 和 Vue 3 版本）

## 安装

```bash
pnpm add @testid/antd-testid-runtime
```

## 快速开始

### 1. 初始化配置

```ts
// main.ts
import { initConfig, TestIdObserver, TestIdVuePlugin } from '@testid/antd-testid-runtime';
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);

// 初始化全局配置（必须在 Observer 启动前调用）
initConfig({
  enable: import.meta.env.DEV,      // 生产环境关闭
  globalPrefix: 'myapp',            // 全局前缀（可选）
  onlyInteractive: true,            // 仅给可交互元素打标
});

// 注册 Vue 3 插件（绕过 inheritAttrs: false）
app.use(TestIdVuePlugin);

app.mount('#app');
```

### 2. 启动 Observer

```ts
// 在 App.vue mounted 或路由守卫中启动
import { TestIdObserver } from '@testid/antd-testid-runtime';

const observer = new TestIdObserver();
observer.start();
```

### 3. 路由切换时重置计数器

```ts
import { resetAllAnchorCounters, resetAllPopupCounters } from '@testid/antd-testid-runtime';

router.afterEach((to) => {
  observer.setRoute(to.name as string);
  observer.resetPopupChildCounter();
  resetAllAnchorCounters();
  resetAllPopupCounters();
});
```

### 4. 调试：检测重复 ID

```ts
import { TestIdChecker } from '@testid/antd-testid-runtime';

// 在浏览器控制台执行，输出格式化告警
TestIdChecker.check();

// 获取统计摘要（不输出控制台）
const stats = TestIdChecker.getStats();
```

## Vue 2 项目接入

Vue 2 项目中，运行时打标逻辑（Observer、计数器、适配器）与 Vue 3 完全一致，仅插件桥接 API 不同。

### 1. 初始化配置 + 注册插件

```js
// main.js
import Vue from 'vue';
import { initConfig, TestIdVue2Plugin } from '@testid/antd-testid-runtime';
import App from './App.vue';

// 初始化全局配置
initConfig({
  enable: process.env.NODE_ENV !== 'production',
  globalPrefix: 'myapp',
  onlyInteractive: true,
});

// 注册 Vue 2 插件（绕过 inheritAttrs: false）
Vue.use(TestIdVue2Plugin);

new Vue({
  render: (h) => h(App),
}).$mount('#app');
```

### 2. 启动 Observer

```js
// 在 App.vue mounted 或路由守卫中启动
import { TestIdObserver } from '@testid/antd-testid-runtime';

const observer = new TestIdObserver();
observer.start();
```

### 3. 路由切换时重置计数器

```js
import { resetAllAnchorCounters, resetAllPopupCounters } from '@testid/antd-testid-runtime';

router.afterEach((to) => {
  observer.setRoute(to.name);
  observer.resetPopupChildCounter();
  resetAllAnchorCounters();
  resetAllPopupCounters();
});
```

> **注意**：Vue 2 使用的编译插件为 `@testid/webpack-plugin-vue2-auto-testid`（Webpack），需要搭配使用。

## testid 生成规则

### 编译期节点（由编译插件注入）

编译期节点由 Vite/Webpack 插件负责注入，本模块不处理：

```
static_page_home_tag_div_3      # 页面内静态节点
static_page_home__BaseSearch_button_0  # 公共组件实例（锚点定位）
```

### 运行时节点（由本模块注入）

| 节点类型 | ID 格式 | 示例 |
|---------|--------|------|
| 页面动态节点 | `{runtimePagePrefix}{route}_{tag}_{counter}` | `dynamic_home_button_0` |
| Modal 浮层 | `{runtimePagePrefix}modal_{tag}_{counter}` | `dynamic_modal_div_0` |
| Drawer 浮层 | `{runtimePagePrefix}drawer_{tag}_{counter}` | `dynamic_drawer_div_0` |
| Select 下拉 | `{runtimePagePrefix}select_{tag}_{counter}` | `dynamic_select_div_2` |
| DatePicker 面板 | `{runtimePagePrefix}datePicker_{tag}_{counter}` | `dynamic_datePicker_div_1` |
| Popover 浮层 | `{runtimePagePrefix}popover_{tag}_{counter}` | `dynamic_popover_div_0` |
| Dropdown 菜单 | `{runtimePagePrefix}dropdown_{tag}_{counter}` | `dynamic_dropdown_li_0` |
| Tooltip 提示 | `{runtimePagePrefix}tooltip_{tag}_{counter}` | `dynamic_tooltip_div_0` |
| Message 消息 | `{runtimePagePrefix}message_{tag}_{counter}` | `dynamic_message_div_0` |
| SubMenu 子菜单 | `{runtimePagePrefix}submenu_{tag}_{counter}` | `dynamic_submenu_li_0` |

## 配置项

```ts
interface TestIdMarkConfig {
  /** 总开关，生产环境强制设为 false */
  enable: boolean;

  /** 全局前缀，拼接到所有 testid 之前 */
  globalPrefix: string;

  /** 编译期静态节点前缀（默认 "static_"） */
  compilePrefix: string;

  /** 页面内动态节点前缀（默认 "dynamic_"） */
  runtimePagePrefix: string;

  /** 浮层组件专属前缀映射 */
  popupPrefixMap: Record<PopupType, string>;

  /** UI 库适配器列表（默认 [antdAdapter]） */
  adapters: UiAdapter[];

  /** 忽略不打标的 HTML 标签 */
  ignoreTags: string[];

  /** 包含此 class 的 DOM 跳过打标 */
  ignoreClass: string[];

  /** 是否仅给可交互控件打标 */
  onlyInteractive: boolean;

  /** 路由切换时是否清空锚点局部计数器 */
  resetInstanceOnRouteChange: boolean;

  /** 路由切换时是否重置全部浮层计数器 */
  resetPopupCounterOnRouteChange: boolean;
}
```

### 同时使用多个 UI 库

```ts
import { initConfig, antdAdapter, elementAdapter } from '@testid/antd-testid-runtime';

initConfig({
  enable: true,
  adapters: [antdAdapter, elementAdapter],  // Ant Design Vue + Element Plus
});
```

### 自定义 CSS 前缀

```ts
// 例如：使用 <a-config-provider prefixCls="my-ui">
initConfig({
  enable: true,
  adapters: [{ ...antdAdapter, cssPrefixes: ['my-ui'] }],
});
```

## 处理器决策树

Observer 对每个新增 DOM 节点的处理按以下优先级执行：

```
0. 已有 data-testid           → 跳过
1. 带 data-test-base-key      → 公共组件实例 → 锚点定位 + 局部计数
2. 浮层内部子节点              → 先查祖先浮层类型 → 浮层子节点计数器
3. body 直系浮层根节点         → 匹配浮层 CSS class → 独立前缀 + 计数器
4. #app 内普通动态节点         → dynamic_ 前缀 + 页面计数器
```

## 核心模块

| 模块 | 说明 |
|------|------|
| `TestIdObserver` | 基于 MutationObserver 的 DOM 监听与自动打标器，运行时核心 |
| `TestIdVuePlugin` | Vue 3 插件，绕过 `inheritAttrs: false` 传递属性到 DOM |
| `TestIdVue2Plugin` | Vue 2 插件，绕过 `inheritAttrs: false` 传递属性到 DOM |
| `TestIdChecker` | ID 重复检测调试工具，按前缀分组格式化告警 |
| `testIdAnchorCounter` | 锚点局部计数器，解决公共组件多实例 ID 重复 |
| `testIdPopupCounter` | 浮层独立计数器，每种浮层类型互不干扰 |
| `testMark` | 全局配置管理，提供 `initConfig` / `getConfig` / 默认配置 |
| `antdAdapter` | Ant Design Vue 适配器（CSS class 识别 + 交互标签） |
| `elementAdapter` | Element Plus 适配器（CSS class 识别 + 交互标签） |

## 锚点定位机制

公共组件（如 `BaseSearch`）在页面中多处使用，仅靠全局计数器无法保证 ID 稳定。锚点定位方案：

1. 编译期在组件根元素注入 `data-test-base-key="common_comp_BaseSearch_tag_button_0"`
2. 运行时向上查找最近带 `data-testid` 的祖先元素作为"锚点"
3. 在锚点下按 `(组件名, 标签名)` 维度维护局部计数器
4. 拼接最终 testid：`{anchorTestId}__{componentName}_{tagName}_{localIndex}`

这确保了不同位置的同一组件实例获得不同的 testid，且不因异步渲染顺序而变化。

## API 参考

### 配置

```ts
import { initConfig, getConfig } from '@testid/antd-testid-runtime';

// 初始化配置
initConfig({ enable: true, globalPrefix: 'app' });

// 获取只读配置
const config = getConfig();
```

### Observer

```ts
import { TestIdObserver } from '@testid/antd-testid-runtime';

const observer = new TestIdObserver();

observer.start();                  // 启动 DOM 监听 + 全量扫描兜底
observer.stop();                   // 停止监听
observer.setRoute('home');         // 更新当前路由名
observer.resetPopupChildCounter(); // 重置浮层子节点计数器
observer.fullScan();               // 手动全量扫描
```

### Vue 插件

**Vue 3：**

```ts
import { TestIdVuePlugin } from '@testid/antd-testid-runtime';

app.use(TestIdVuePlugin);  // 必须在 app.mount() 之前调用
```

**Vue 2：**

```js
import Vue from 'vue';
import { TestIdVue2Plugin } from '@testid/antd-testid-runtime';

Vue.use(TestIdVue2Plugin);  // 必须在 new Vue() 之前调用
```

### 计数器

```ts
import {
  getNextAnchorLocalIndex,
  resetAllAnchorCounters,
  parseBaseKey,
  buildAnchorTestId,
  getNextPopupId,
  resetAllPopupCounters,
  resetPopupCounter,
} from '@testid/antd-testid-runtime';

// 锚点计数器
const localIndex = getNextAnchorLocalIndex(anchorTestId, 'BaseSearch', 'button');
resetAllAnchorCounters();
const parsed = parseBaseKey('common_comp_BaseSearch_tag_button_0');
const testId = buildAnchorTestId('static_page_tag_div_3', 'BaseSearch', 'button', 0);

// 浮层计数器
const modalId = getNextPopupId('modal');
resetAllPopupCounters();
resetPopupCounter('select');
```

### ID 检测

```ts
import { TestIdChecker } from '@testid/antd-testid-runtime';

TestIdChecker.check();    // 控制台格式化输出告警
const stats = TestIdChecker.getStats();  // 返回统计摘要
```

## 适配器

### 内置适配器

| 适配器 | UI 库 | CSS 前缀 |
|--------|------|---------|
| `antdAdapter` | Ant Design Vue | `ant` |
| `elementAdapter` | Element Plus | `el` |

### 自定义适配器

实现 `UiAdapter` 接口即可扩展支持其他 UI 库：

```ts
import type { UiAdapter } from '@testid/antd-testid-runtime';

const myAdapter: UiAdapter = {
  name: 'my-ui-lib',
  cssPrefixes: ['my'],
  popupClassSuffixMap: { /* ... */ },
  interactiveTags: ['my-button', 'my-input', 'button', 'input'],
  tagPrefixPattern: /^my-/,
};
```

## 许可证

MIT
