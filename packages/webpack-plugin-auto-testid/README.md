# @testid/webpack-plugin-auto-testid

Webpack 编译期 Loader — 解析 Vue SFC 模板 AST，自动为 DOM 节点注入 `data-testid` / `data-test-base-key` 属性。

与 [@testid/vite-plugin-auto-testid](../vite-plugin-auto-testid/) 功能完全对齐，核心 transform 逻辑共享。

## 功能概述

- **页面组件** (`/views/**`) → 直接注入完整 `static_xxx` `data-testid`
- **公共组件** (`/components/**`, `/common/**`) → 仅注入 `data-test-base-key`，运行时由 Observer 锚点定位拼接最终 testid
- **仅开发模式生效** — `NODE_ENV=production` 时跳过所有处理，零构建产物开销

## 安装

```bash
pnpm add -D @testid/webpack-plugin-auto-testid
```

## 快速开始

### webpack.config.js

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        enforce: 'pre', // 在 vue-loader 之前执行，确保模板在编译前已注入 testid
        use: [
          {
            loader: '@testid/webpack-plugin-auto-testid',
            options: {
              viewPatterns: ['/views/'],
              commonPatterns: ['/components/', '/common/'],
              globalPrefix: 'hall',    // 可选：全局前缀
              compilePrefix: 'static_',
              onlyInteractive: true,
            },
          },
        ],
      },
      // ... vue-loader 等其他规则
    ],
  },
};
```

### 配合运行时 Observer

编译期插件需要搭配运行时模块 [@testid/antd-testid-runtime](../antd-testid-runtime/) 一起使用，以处理公共组件锚点定位和浮层（Modal/Drawer/Select/Dropdown 等）的动态打标：

```javascript
// main.js
import {
  initConfig,
  TestIdObserver,
} from '@testid/antd-testid-runtime';

if (process.env.NODE_ENV !== 'production') {
  initConfig({
    globalPrefix: 'hall',
    compilePrefix: 'static_',
    runtimePagePrefix: 'dynamic_',
  });

  const observer = new TestIdObserver();
  observer.start();
  requestAnimationFrame(() => observer.fullScan());

  // Vue Router 路由切换
  router.beforeEach((to) => observer.setRoute(String(to.name || to.path)));
}
```

## 配置项

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `viewPatterns` | `string[]` | `['/views/']` | 页面视图组件的路径匹配模式 |
| `commonPatterns` | `string[]` | `['/components/', '/common/']` | 公共组件的路径匹配模式 |
| `globalPrefix` | `string` | `''` | 全局前缀，自动拼接到 `compilePrefix` 前，如 `"hall"` → `hall_static_` |
| `compilePrefix` | `string` | `'static_'` | 编译期静态节点前缀 |
| `ignoreTags` | `string[]` | `['script','style','svg','br','iframe']` | 跳过不打标的 HTML 标签 |
| `ignoreClass` | `string[]` | `['no-test-mark','hidden']` | 包含此 class 的元素跳过打标 |
| `onlyInteractive` | `boolean` | `true` | 仅给可交互控件（button/input/select 等）打标 |

## 编译期三层计数器架构

```
1. v-for 动态注入 (最高优先级)
   - 有 index → :data-testid="`...-${index}`"  动态绑定
   - 有 key  → :data-testid="`..._key_${item.id}`"
   - 无稳定 key → 静态 data-testid，子节点交运行时处理

2. v-if/v-else 条件块子计数器 (第二优先级)
   - v-if 分支使用独立子计数器 {parentTestId}__{tag}-{n}
   - 保证条件块内增删不影响外部序号

3. 全局计数器 (第三优先级)
   - 跨模板共享 counter + usedIds Set
   - 自动跳过已有手动 data-testid 的节点
```

## ID 格式

| 分类 | 格式 | 示例 |
| --- | --- | --- |
| 页面静态 | `{prefix}page_{pageName}_comp_{compName}_tag_{tag}_{index}` | `hall_static_page_dashboard_comp_index_tag_button_0` |
| 公共组件 | `common_comp_{compName}_tag_{tag}_{index}` (base-key) | `common_comp_BaseSearch_tag_button_0` |
| v-for 动态 | `` `{prefix}...-\${index}` `` | `` `hall_static_page_list_comp_index_tag_div_3-${i}` `` |

## 与 Vite 版对比

| | vite-plugin-auto-testid | webpack-plugin-auto-testid |
| --- | --- | --- |
| 构建工具 | Vite 5+ | Webpack 5+ |
| 入口机制 | Vite `transform` hook | Webpack Loader |
| 文件路径 | `transform(code, id)` 的 `id` | `this.resourcePath` |
| 选项获取 | 函数参数 | `this.getOptions()` |
| `enforce` | 插件选项 `enforce: 'pre'` | webpack config `enforce: 'pre'` |
| 核心逻辑 | `transform.ts` | 相同的 `transform.ts` |

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 开发模式 (watch)
pnpm dev
```

## License

MIT
