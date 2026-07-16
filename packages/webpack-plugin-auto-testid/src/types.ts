/**
 * webpack-plugin-auto-testid 类型定义
 */

/**
 * 插件配置选项
 */
export interface AutoTestIdPluginOptions {
  /**
   * 全局前缀，会拼接到所有 testid 前缀之前
   * 例: globalPrefix = "hall" → 实际前缀为 hall_static_、hall_dynamic_
   * 默认: 空 (不添加)
   */
  globalPrefix?: string;

  /**
   * 页面视图组件所在目录匹配模式
   * 匹配文件路径中包含这些字符串的 .vue 文件
   * 默认：['/views/']
   */
  viewPatterns?: string[];

  /**
   * 公共复用组件所在目录匹配模式
   * 默认：['/components/', '/common/']
   */
  commonPatterns?: string[];

  /**
   * 编译期静态节点统一前缀
   * 默认：'static_'
   */
  compilePrefix?: string;

  /**
   * 忽略不打标的 HTML 标签名
   * 默认：['script', 'style', 'svg', 'br', 'iframe']
   */
  ignoreTags?: string[];

  /**
   * 包含此 class 的 DOM 跳过打标
   * 默认：['no-test-mark', 'hidden']
   */
  ignoreClass?: string[];

  /**
   * 是否仅给可交互控件打标
   * 默认：true
   */
  onlyInteractive?: boolean;
}

/**
 * 模板转换上下文
 */
export interface TransformContext {
  /** 是否页面视图组件 */
  isViewComponent: boolean;
  /** 编译前缀 */
  compilePrefix: string;
  /** 当前文件路径 */
  filename: string;
  /** 当前组件内全局计数器 */
  counter: number;
  /** 已使用的 ID (防冲突) */
  usedIds: Set<string>;
  /** 忽略标签列表 */
  ignoreTags: string[];
  /** 忽略 class 列表 */
  ignoreClass: string[];
  /** 仅交互控件 */
  onlyInteractive: boolean;
}

/**
 * 转换结果
 */
export interface TransformResult {
  /** 转换后的模板代码 */
  code: string;
  /** source map (可选) */
  map?: any;
}

/**
 * 交互控件白名单 (onlyInteractive === true 时生效)
 *
 * 包含 Ant Design Vue (a-*) 的常用交互组件标签，
 * 用户可通过 customPrefixes 选项扩展。
 */
export const INTERACTIVE_TAGS = new Set([
  'button',
  'a-button',
  'input',
  'a-input',
  'a-input-number',
  'select',
  'a-select',
  'textarea',
  'a-textarea',
  'a-checkbox',
  'a-radio',
  'a-switch',
  'a-menu-item',
  'a-dropdown-button',
  'a-tabs-tab-pane',
  'a-table',
  'a-tag',
  'a-card',
  'a-collapse-panel',
]);

/**
 * 强制注入完整 data-testid（不走 base-key）的组件标签集合
 *
 * 这些组件（如 Ant Design Vue 的 a-menu-item / a-sub-menu、Element 的 el-menu-item）
 * 在渲染时，其最终 DOM（如 <li class="ant-menu-item">）由**父组件内部 render 函数**
 * 创建并托管 vnode，而非自身组件实例。
 *
 * 若编译期仅注入 data-test-base-key，运行时锚点解析出的 data-testid 只存在于 DOM、
 * 不在 vnode 中，会被父组件的重渲染（selectedKeys / hover / 数据更新）抹除，
 * 导致 base-key 残留、data-testid 丢失（典型表现：submenu 子项能注入，
 * 但 a-menu 直接子级 a-menu-item 只有 data-test-base-key）。
 *
 * 强制注入完整 data-testid 可让其随 $attrs 透传到目标 DOM 的 vnode 中，
 * 父组件重渲染时由 Vue 自行保留，彻底解决丢失问题。
 */
export const FORCE_FULL_TESTID_TAGS = new Set([
  'a-menu-item',
  'a-sub-menu',
  'el-menu-item',
]);

/**
 * 默认忽略标签
 */
export const DEFAULT_IGNORE_TAGS = [
  'script',
  'style',
  'svg',
  'br',
  'iframe',
];

/**
 * 默认忽略 class
 */
export const DEFAULT_IGNORE_CLASS = ['no-test-mark', 'hidden'];
