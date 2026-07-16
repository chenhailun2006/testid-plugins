/**
 * 类型定义 & 常量 — 与 vite-plugin-auto-testid 功能对齐
 *
 * 本文件定义编译期打标插件的所有类型和常量，
 * 与 Vue 3 版本共享相同的 ID 格式规范和计数器逻辑。
 */

// ============================================================
// 交互标签白名单
// ============================================================

/**
 * 默认交互元素标签白名单
 *
 * 包含原生 HTML 交互标签和常见 UI 库组件标签。
 * onlyInteractive=true 时仅对这些标签注入 testid。
 */
export const INTERACTIVE_TAGS = new Set([
  // 原生 HTML 交互标签
  'a', 'button', 'input', 'select', 'textarea', 'form',
  'label', 'option', 'optgroup', 'fieldset', 'legend',
  'details', 'summary', 'audio', 'video',
  // Ant Design Vue (Vue 2 使用 a- 前缀)
  'a-button', 'a-input', 'a-input-number', 'a-select',
  'a-textarea', 'a-checkbox', 'a-radio', 'a-switch',
  'a-menu-item', 'a-dropdown-button', 'a-tabs-tab-pane',
  'a-table', 'a-tag', 'a-badge', 'a-avatar',
  'a-card', 'a-collapse-panel', 'a-timeline-item',
  'a-tree-select', 'a-cascader', 'a-upload',
  'a-transfer', 'a-mention', 'a-rate', 'a-slider',
  'a-steps-step', 'a-anchor-link', 'a-breadcrumb-item',
  // Element UI (Vue 2 / Element Plus 均使用 el- 前缀)
  'el-button', 'el-input', 'el-input-number', 'el-select',
  'el-checkbox', 'el-radio', 'el-switch', 'el-menu-item',
  'el-tabs-pane', 'el-table', 'el-tag', 'el-badge',
  'el-avatar', 'el-card', 'el-collapse-item',
  'el-timeline-item', 'el-tree-select', 'el-cascader',
  'el-upload', 'el-transfer', 'el-rate', 'el-slider',
  'el-steps-step', 'el-breadcrumb-item',
  // Vant (Vue 2)
  'van-button', 'van-field', 'van-checkbox', 'van-radio',
  'van-switch', 'van-stepper', 'van-rate', 'van-slider',
  'van-uploader', 'van-picker',
]);

// ============================================================
// 忽略规则
// ============================================================

/** 默认忽略的 HTML 标签 (不对这些标签打标) */
export const DEFAULT_IGNORE_TAGS = ['script', 'style', 'svg', 'br', 'hr', 'iframe', 'template'];

/** 包含此 class 的元素跳过打标 */
export const DEFAULT_IGNORE_CLASS = ['no-test-mark', 'hidden'];

// ============================================================
// 插件选项
// ============================================================

/**
 * 编译期插件配置选项
 */
export interface AutoTestIdPluginOptions {
  /**
   * 页面视图组件路径匹配模式
   * @default ['/views/']
   */
  viewPatterns?: string[];

  /**
   * 公共组件路径匹配模式
   * @default ['/components/', '/common/']
   */
  commonPatterns?: string[];

  /**
   * 全局前缀，自动拼接到 compilePrefix 前
   * 例: "hall" → 生成的 testid 为 "hall_static_xxx"
   */
  globalPrefix?: string;

  /**
   * 编译期静态节点前缀
   * @default 'static_'
   */
  compilePrefix?: string;

  /**
   * 跳过不打标的 HTML 标签
   * @default DEFAULT_IGNORE_TAGS
   */
  ignoreTags?: string[];

  /**
   * 包含此 class 的元素跳过打标
   * @default DEFAULT_IGNORE_CLASS
   */
  ignoreClass?: string[];

  /**
   * 仅给可交互控件打标
   * @default true
   */
  onlyInteractive?: boolean;
}

// ============================================================
// 内部类型
// ============================================================

/**
 * 模板转换上下文 (跨元素共享的计数器和配置)
 */
export interface TransformContext {
  /** 是否为页面视图组件 */
  isViewComponent: boolean;
  /** 编译期 testid 前缀 (含 globalPrefix) */
  compilePrefix: string;
  /** 源文件路径 */
  filename: string;
  /** 全局计数器 (第三优先级) */
  counter: number;
  /** 已占用的 testid，防止冲突 */
  usedIds: Set<string>;
  /** 忽略的 HTML 标签 */
  ignoreTags: string[];
  /** 忽略的 CSS class */
  ignoreClass: string[];
  /** 是否仅处理交互元素 */
  onlyInteractive: boolean;
}

/**
 * 模板转换结果
 */
export interface TransformResult {
  /** 转换后的模板源代码 */
  code: string;
}
