/**
 * ID 重复检测调试工具 — testIdChecker.ts
 *
 * 按前缀分组检测 data-testid 重复，控制台告警定位问题来源。
 *
 * 分组维度:
 *   - custom:     业务手动自定义 data-testid
 *   - static:     编译静态 + 公共组件实例
 *   - dynamic:    页面内动态节点
 *   - modal / drawer / select / datePicker / popconfirm / dropdown / tooltip: 各类浮层
 */

import type { PopupType } from '../config/testMark';

// ============================================================
// 类型定义
// ============================================================

/**
 * 检测分组维度
 */
type CheckGroup =
  | 'custom'   // 手动 data-testid (业务自定义)
  | 'static'   // 编译静态 + 公共组件实例
  | 'dynamic'  // 页面内动态节点
  | PopupType; // 各独立浮层类型

/**
 * 重复信息
 */
interface DuplicateInfo {
  testId: string;
  count: number;
  elements: HTMLElement[];
}

/**
 * 分组标签
 */
const GROUP_LABELS: Record<CheckGroup, string> = {
  custom: '[业务手动 ID]',
  static: '[编译静态 ID]',
  dynamic: '[页面动态 ID]',
  modal: '[Modal 浮层]',
  drawer: '[Drawer 浮层]',
  select: '[Select 浮层]',
  datePicker: '[DatePicker 浮层]',
  popconfirm: '[Popconfirm 浮层]',
  dropdown: '[Dropdown 浮层]',
  tooltip: '[Tooltip 浮层]',
};

/**
 * 分组建议
 */
const GROUP_SUGGESTIONS: Record<CheckGroup, string> = {
  custom:
    '业务代码中存在手写固定重复 data-testid，请检查相关模板代码',
  static:
    '锚点局部计数器异常或页面编译期 testid 冲突，检查锚点查找逻辑',
  dynamic:
    '页面动态节点兄弟索引计算逻辑缺陷，检查 dynamicCounter 重置逻辑',
  modal: 'Modal 独立计数器自增逻辑失效，检查 getNextPopupId 调用',
  drawer: 'Drawer 独立计数器自增逻辑失效',
  select: 'Select 独立计数器自增逻辑失效',
  datePicker: 'DatePicker 独立计数器自增逻辑失效',
  popconfirm: 'Popconfirm 独立计数器自增逻辑失效',
  dropdown: 'Dropdown 独立计数器自增逻辑失效',
  tooltip: 'Tooltip 独立计数器自增逻辑失效',
};

// ============================================================
// TestIdChecker
// ============================================================

export class TestIdChecker {
  /**
   * 执行全量重复检测
   *
   * 步骤:
   *   1. 查询所有带 data-testid 属性的 DOM 节点
   *   2. 按 testid 前缀分组 (custom / static / dynamic / modal / ...)
   *   3. 组内统计出现次数 > 1 的 testid
   *   4. 控制台按分组输出告警信息
   *
   * @returns 是否有重复 ID
   */
  static check(): boolean {
    const allElements = document.querySelectorAll('[data-testid]');
    const groupMap = new Map<CheckGroup, Map<string, HTMLElement[]>>();

    // ── 分组统计 ──
    allElements.forEach((el) => {
      const testId = el.getAttribute('data-testid')!;
      const group = this.classifyTestId(testId);

      if (!groupMap.has(group)) {
        groupMap.set(group, new Map());
      }
      const idMap = groupMap.get(group)!;
      if (!idMap.has(testId)) {
        idMap.set(testId, []);
      }
      idMap.get(testId)!.push(el as HTMLElement);
    });

    // ── 重复检测 ──
    let hasDuplicate = false;

    groupMap.forEach((idMap, group) => {
      const duplicates: DuplicateInfo[] = [];

      idMap.forEach((elements, testId) => {
        if (elements.length > 1) {
          duplicates.push({ testId, count: elements.length, elements });
        }
      });

      if (duplicates.length > 0) {
        hasDuplicate = true;
        this.reportGroupDuplicates(group, duplicates);
      }
    });

    return hasDuplicate;
  }

  /**
   * 执行检测并返回统计摘要 (不输出控制台)
   */
  static getStats(): {
    group: CheckGroup;
    total: number;
    unique: number;
    duplicates: number;
  }[] {
    const allElements = document.querySelectorAll('[data-testid]');
    const groupMap = new Map<CheckGroup, Map<string, HTMLElement[]>>();

    allElements.forEach((el) => {
      const testId = el.getAttribute('data-testid')!;
      const group = this.classifyTestId(testId);

      if (!groupMap.has(group)) {
        groupMap.set(group, new Map());
      }
      const idMap = groupMap.get(group)!;
      if (!idMap.has(testId)) {
        idMap.set(testId, []);
      }
      idMap.get(testId)!.push(el as HTMLElement);
    });

    const stats: { group: CheckGroup; total: number; unique: number; duplicates: number }[] = [];

    groupMap.forEach((idMap, group) => {
      let total = 0;
      let unique = 0;
      let duplicates = 0;

      idMap.forEach((elements) => {
        total += elements.length;
        unique++;
        if (elements.length > 1) {
          duplicates++;
        }
      });

      stats.push({ group, total, unique, duplicates });
    });

    return stats.sort((a, b) => b.total - a.total);
  }

  // ==========================================================
  // 私有方法
  // ==========================================================

  /**
   * 按 testid 前缀分类
   */
  private static classifyTestId(testId: string): CheckGroup {
    // 没有下划线 → 视为用户自定义
    if (!testId.includes('_')) return 'custom';

    // 提取前缀 (第一个 _ 之前的部分 + _)
    const firstUnderscore = testId.indexOf('_');
    const prefix = testId.substring(0, firstUnderscore + 1);

    // 系统前缀
    if (prefix === 'static_') return 'static';
    if (prefix === 'dynamic_') return 'dynamic';

    // 浮层前缀检测
    const popupTypes: PopupType[] = [
      'modal', 'drawer', 'select', 'datePicker',
      'popconfirm', 'dropdown', 'tooltip',
    ];
    for (const type of popupTypes) {
      if (prefix === `${type}_`) return type;
    }

    // 其他未知前缀 → 归为 custom
    return 'custom';
  }

  /**
   * 控制台告警输出 (按分组格式化)
   */
  private static reportGroupDuplicates(
    group: CheckGroup,
    duplicates: DuplicateInfo[]
  ): void {
    const groupLabel = GROUP_LABELS[group] || group;
    const suggestion = GROUP_SUGGESTIONS[group] || '未知原因，请联系开发排查';

    console.group(
      `%c[testid-checker] %c${groupLabel} %c检测到 ${duplicates.length} 个重复 ID`,
      'color: #ff6b6b; font-weight: bold;',
      'color: #ffa500;',
      'color: #999;'
    );

    duplicates.forEach((d) => {
      console.log(
        `%c  ✗ ${d.testId} %c(出现 ${d.count} 次)`,
        'color: #ff6b6b;',
        'color: #999;'
      );

      // 输出 DOM 元素引用
      d.elements.forEach((el) => {
        // 构造简要选择器便于定位
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const cls = typeof el.className === 'string'
          ? '.' + el.className.split(/\s+/).slice(0, 3).join('.')
          : '';
        console.log(`    → <${tag}${id}${cls}>`, el);
      });
    });

    console.log(`%c  💡 建议: ${suggestion}`, 'color: #4ecdc4;');
    console.groupEnd();
  }
}
