# testid-plugins

全自动 DOM 打标 `data-testid` 工具 — Vue 3 + Vite + Ant Design Vue

## 项目结构

```
testid-plugins/
├── packages/
│   ├── @chenhailun2006/vite-plugin-auto-testid/   # Vite 编译期打标插件
│   │   └── src/
│   │       ├── index.ts           # 插件入口
│   │       ├── transform.ts       # 模板 AST 转换核心
│   │       └── types.ts           # 类型定义
│   └── @chenhailun2006/antd-testid-runtime/       # Ant Design Vue 运行时兜底打标模块
│       └── src/
│           ├── index.ts           # 统一导出入口
│           ├── config/
│           │   └── testMark.ts    # 全局配置
│           └── utils/
│               ├── testIdAnchorCounter.ts   # 锚点局部计数器
│               ├── testIdPopupCounter.ts    # 浮层独立计数器
│               ├── testIdObserver.ts        # MutationObserver 打标器
│               └── testIdChecker.ts         # ID 重复检测器
├── examples/
│   └── vue3-antd-demo/            # Vue 3 + Ant Design Vue 示例项目
├── 需求文档.md
└── 详细设计文档.md
```

## 核心设计

### 架构分层

```
┌─────────────────────────────────────────────┐
│ 应用层 (main.ts)                             │
│ 仅 DEV 环境加载运行时所有模块                │
├──────────────────┬──────────────────────────┤
│ 编译期            │ 运行时                    │
│ vite-plugin-auto- │ testIdAnchorCounter      │
│ testid            │ testIdPopupCounter       │
│ (Vue SFC AST)     │ testIdObserver           │
│                   │ testIdChecker            │
├──────────────────┴──────────────────────────┤
│ 配置层: testMark.ts                         │
└─────────────────────────────────────────────┘
```

### 打标优先级

| 优先级 | 来源       | 说明                                          |
| ------ | ---------- | --------------------------------------------- |
| 1      | 手动自定义 | `data-testid="xxx"` 原样保留，不可覆盖        |
| 2      | 编译期     | 页面组件直接注入完整 `static_xxx`             |
| 3      | 编译期     | 公共组件仅注入 `data-test-base-key`           |
| 4      | 运行时     | 锚点定位 + 局部计数器 → 公共组件稳定 testid   |
| 5      | 运行时     | v-for/异步 v-if → `dynamic_xxx`               |
| 6      | 运行时     | Antd 浮层 → 专属前缀 + 独立计数器             |

### 公共组件多实例 — 锚点定位方案

```
父页面模板 (编译期已打标):
  <div data-testid="static_page_dashboard_tag_div_3">   ← 锚点 A
    <BaseSearch />    ← 实例 A-1
  </div>
  <div data-testid="static_page_dashboard_tag_div_7">   ← 锚点 B
    <BaseSearch />    ← 实例 B-1
    <BaseSearch />    ← 实例 B-2
  </div>

运行时锚点定位:
  A-1 → findAnchor → "static_page_dashboard_tag_div_3"
      → getNextAnchorLocalIndex("div_3", "BaseSearch", "button") → 0
      → "static_page_dashboard_tag_div_3__BaseSearch_button_0" ✅ 永远不变

  B-1 → findAnchor → "static_page_dashboard_tag_div_7"
      → getNextAnchorLocalIndex("div_7", "BaseSearch", "button") → 0
      → "static_page_dashboard_tag_div_7__BaseSearch_button_0" ✅ 永远不变

  B-2 → findAnchor → "static_page_dashboard_tag_div_7"
      → getNextAnchorLocalIndex("div_7", "BaseSearch", "button") → 1
      → "static_page_dashboard_tag_div_7__BaseSearch_button_1" ✅ 永远不变
```

### ID 格式规范

| 分类 | 格式 | 示例 |
| --- | --- | --- |
| 页面静态 | `{compilePrefix}_{route}_{tag}_{序号}` | `hall_static_Home_div_0` |
| 公共组件实例 | `{锚点testid}__{组件名}_{标签名}_{局部序号}` | `hall_static_Home_div_3__BaseSearch_button_0` |
| 页面动态 | `{runtimePagePrefix}_{route}_{tag}_{序号}` | `hall_dynamic_userList_input_3` |
| 浮层根节点 | `{runtimePagePrefix}{popupPrefix}{tag}_{计数器}` | `hall_dynamic_modal_div_0` |
| 浮层子节点 | `{runtimePagePrefix}{popupPrefix}{tag}_{计数器}` | `hall_dynamic_select_div_11` |

> `{popupPrefix}` 由 `popupPrefixMap` 配置定义，如 `modal_`、`select_`、`datePicker_` 等。
> 所有运行时注入的 testid（页面动态、浮层）统一使用 `runtimePagePrefix` 前缀，与编译期静态的 `compilePrefix` 形成清晰区分。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建插件包

```bash
pnpm build:all
```

### 3. 运行示例项目

```bash
pnpm dev:demo
```

### 4. 在项目中集成

#### vite.config.ts

```typescript
import vitePluginAutoTestId from '@chenhailun2006/vite-plugin-auto-testid';

export default defineConfig({
  plugins: [
    vue(),
    vitePluginAutoTestId({
      viewPatterns: ['/views/'],
      commonPatterns: ['/components/', '/common/'],
      globalPrefix: 'hall',          // 全局前缀，所有 testid 的基础命名空间
      compilePrefix: 'static_',
    }),
  ],
});
```

#### main.ts

```typescript
import {
  initConfig,
  TestIdObserver,
  resetAllAnchorCounters,
  resetAllPopupCounters,
  TestIdChecker,
} from '@chenhailun2006/antd-testid-runtime';

if (import.meta.env.DEV) {
  initConfig({
    // ── 前缀配置 ──
    globalPrefix: 'hall',                     // 全局前缀（编译期 & 运行时共用）
    compilePrefix: 'static_',
    runtimePagePrefix: 'dynamic_',
    popupPrefixMap: {                         // 浮层前缀映射（不含 globalPrefix）
      modal: 'modal_',
      drawer: 'drawer_',
      select: 'select_',
      datePicker: 'datePicker_',
      dropdown: 'dropdown_',
      tooltip: 'tooltip_',
      popconfirm: 'popconfirm_',
    },

    // ── 浮层识别 ──
    antdClassPrefix: ['ant'],                 // Ant Design Vue CSS 类名前缀，支持多值
                                              // 如使用自定义 prefixCls 则改为 ['my-ui']
                                              // 多前缀混合: ['ant', 'my-ui']

    // ── 行为配置 ──
    onlyInteractive: false,                   // true = 仅给可交互控件打标
    resetInstanceOnRouteChange: true,         // 路由切换时重置锚点计数器
    resetPopupCounterOnRouteChange: true,     // 路由切换时重置浮层计数器
  });

  const observer = new TestIdObserver();
  observer.start();

  requestAnimationFrame(() => {
    observer.fullScan();
    setTimeout(() => TestIdChecker.check(), 500);
  });

  router.beforeEach((to) => observer.setRoute(String(to.name || to.path)));
  router.afterEach(() => {
    resetAllAnchorCounters();
    resetAllPopupCounters();
    observer.resetPopupChildCounter();
    setTimeout(() => TestIdChecker.check(), 300);
  });

  // 开发调试
  (window as any).__testIdObserver = observer;
  (window as any).__testIdChecker = TestIdChecker;
}
```

## 配置参考

### `initConfig()` 完整配置项

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enable` | `boolean` | `true` | 总开关 |
| `globalPrefix` | `string` | `''` | 全局前缀，自动拼接到 `compilePrefix`、`runtimePagePrefix` |
| `compilePrefix` | `string` | `'static_'` | 编译期静态节点前缀 |
| `runtimePagePrefix` | `string` | `'dynamic_'` | 运行时动态节点前缀 |
| `popupPrefixMap` | `Record<PopupType, string>` | 见默认配置 | 浮层类型 → 前缀映射 |
| `antdClassPrefix` | `string[]` | `['ant']` | Ant Design Vue CSS 类名前缀，支持多值 |
| `ignoreTags` | `string[]` | `['script','style','svg','br','iframe']` | 跳过的 HTML 标签 |
| `ignoreClass` | `string[]` | `['no-test-mark','hidden']` | 跳过的 CSS class |
| `onlyInteractive` | `boolean` | `true` | 是否仅给可交互控件打标 |
| `resetInstanceOnRouteChange` | `boolean` | `true` | 路由切换时重置锚点计数器 |
| `resetPopupCounterOnRouteChange` | `boolean` | `true` | 路由切换时重置浮层计数器 |

### 前缀组合规则

```
globalPrefix: 'hall'
  → compilePrefix     = 'hall_static_'
  → runtimePagePrefix = 'hall_dynamic_'
  → popupPrefixMap    = { modal: 'modal_', ... }  (不自动拼 globalPrefix)
  
浮层 testid: runtimePagePrefix + popupPrefix + tag + counter
  → hall_dynamic_modal_div_0
  → hall_dynamic_select_div_11
```

> `popupPrefixMap` 不自动拼接 `globalPrefix`，因为浮层 testid 统一通过 `runtimePagePrefix` 携带全局前缀，避免重复。

### 浮层类型与 CSS class 映射

| 类型 | CSS class 匹配 | popupPrefixMap 默认值 |
| --- | --- | --- |
| `modal` | `{prefix}-modal` | `'modal_'` |
| `drawer` | `{prefix}-drawer` | `'drawer_'` |
| `select` | `{prefix}-select-dropdown` | `'select_'` |
| `datePicker` | `{prefix}-picker-dropdown` | `'datePicker_'` |
| `popconfirm` | `{prefix}-popover` + `{prefix}-popconfirm` | `'popconfirm_'` |
| `dropdown` | `{prefix}-dropdown` | `'dropdown_'` |
| `tooltip` | `{prefix}-tooltip` | `'tooltip_'` |

> `{prefix}` 取 `antdClassPrefix` 数组中的每个值逐一匹配，任一命中即识别。支持 `<a-config-provider prefixCls="custom">` 自定义前缀场景。

## 环境隔离

- 编译插件: `process.env.NODE_ENV === 'production'` 时直接跳过
- 运行时模块: 所有逻辑包裹在 `import.meta.env.DEV` 中，生产构建时 tree-shake 移除
- 生产产物零 `data-testid` / `data-test-base-key` 属性，零体积开销

## 开发调试

浏览器控制台可用命令:

```javascript
// 手动触发全量打标
window.__testIdObserver.fullScan()

// 手动触发 ID 重复检测
window.__testIdChecker.check()

// 暂停 / 重新启动观察器
window.__testIdObserver.stop()
window.__testIdObserver.start()
```
