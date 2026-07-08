/**
 * vite-plugin-auto-testid 类型定义
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
