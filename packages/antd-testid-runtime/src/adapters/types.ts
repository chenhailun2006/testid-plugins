/**
 * UI 库适配器接口 — adapters/types.ts
 *
 * 将 UI 库相关的 CSS class 命名、标签前缀、交互元素识别等逻辑
 * 从核心 Observer 中解耦，实现可插拔的 UI 库支持。
 *
 * 每个适配器描述一个 UI 库的浮层组件识别规则，
 * 多个适配器可组合使用 (如同时使用 Ant Design Vue + Element UI)。
 */

// ============================================================
// 浮层类型 (跨模块共享)
// ============================================================

/**
 * 支持的浮层类型
 */
export type PopupType =
  | 'modal'
  | 'drawer'
  | 'select'
  | 'datePicker'
  | 'popconfirm'
  | 'popover'
  | 'dropdown'
  | 'tooltip'
  | 'message'
  | 'submenu';

// ============================================================
// 适配器接口
// ============================================================

/**
 * UI 库适配器接口
 *
 * 实现此接口即可让 Observer 自动识别该 UI 库的浮层组件。
 */
export interface UiAdapter {
  /** 适配器名称 (调试用) */
  readonly name: string;

  /** CSS 类名前缀数组 (如 AntD: ['ant'], Element: ['el']) */
  readonly cssPrefixes: string[];

  /**
   * 浮层 CSS class 后缀映射
   *
   * 结构: PopupType → string[][]，两层数组含义:
   *   - 外层: OR 关系，任一内层命中即匹配
   *   - 内层: AND 关系，所有 class 必须同时出现
   *
   * 后缀不含前缀，由 buildPopupClassMap 动态拼接。
   */
  readonly popupClassSuffixMap: Record<PopupType, string[][]>;

  /**
   * 交互标签名列表 (用于 onlyInteractive 模式)
   *
   * 包含 UI 库的组件标签名 (如 'a-button', 'el-input') 和原生标签 (如 'button', 'input')。
   * Observer 会合并所有适配器的 interactiveTags 进行判断。
   */
  readonly interactiveTags: string[];

  /**
   * 标签前缀正则 (用于 getSimpleTag 去除 UI 库前缀)
   *
   * 例: AntD → /^a-/, Element → /^el-/
   * 多个适配器的正则用 | 合并。
   */
  readonly tagPrefixPattern: RegExp;
}

/**
 * 从多个适配器合并所有 CSS 前缀
 */
export function mergeCssPrefixes(adapters: UiAdapter[]): string[] {
  const result: string[] = [];
  for (const a of adapters) {
    for (const p of a.cssPrefixes) {
      if (!result.includes(p)) result.push(p);
    }
  }
  return result;
}

/**
 * 从多个适配器合并交互标签列表
 */
export function mergeInteractiveTags(adapters: UiAdapter[]): string[] {
  const set = new Set<string>();
  for (const a of adapters) {
    for (const tag of a.interactiveTags) {
      set.add(tag);
    }
  }
  return [...set];
}

/**
 * 从多个适配器合并标签前缀正则
 */
export function mergeTagPrefixPattern(adapters: UiAdapter[]): RegExp | null {
  const patterns = adapters
    .map((a) => a.tagPrefixPattern.source)
    .filter(Boolean);
  if (patterns.length === 0) return null;
  return new RegExp(patterns.join('|'), 'gi');
}
