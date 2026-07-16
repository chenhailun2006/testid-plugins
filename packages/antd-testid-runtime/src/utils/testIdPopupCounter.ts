/**
 * 浮层独立计数器 — testIdPopupCounter.ts
 *
 * 每种浮层类型维护独立的自增计数器，类型之间互不干扰。
 *
 * 这意味着:
 *   - Modal 第 1 次出现: modal_button_0
 *   - Select 第 1 次出现: select_div_0
 *   - Modal 第 2 次出现: modal_button_1
 *   - Select 第 2 次出现: select_div_1
 */

import type { PopupType } from '../adapters/types';
import { getConfig } from '../config/testMark';

// ============================================================
// 计数器管理
// ============================================================

/**
 * 各类型浮层独立计数器
 */
const popupCounters: Record<PopupType, number> = {
  modal: 0,
  drawer: 0,
  select: 0,
  datePicker: 0,
  popconfirm: 0,
  popover: 0,
  dropdown: 0,
  tooltip: 0,
  message: 0,
  submenu: 0,
};

/**
 * 获取某类型浮层的下一个 ID (自增)
 *
 * @param type - 浮层类型
 * @returns 计数器值 (使用前，从 0 开始)
 */
export function getNextPopupId(type: PopupType): number {
  // 安全检查: 未注册的类型回退到 modal
  const key = type in popupCounters ? type : 'modal';
  const id = popupCounters[key];
  popupCounters[key] += 1;
  return id;
}

/**
 * 重置所有浮层计数器
 */
export function resetAllPopupCounters(): void {
  (Object.keys(popupCounters) as PopupType[]).forEach(
    (key) => (popupCounters[key] = 0)
  );
}

/**
 * 重置指定类型浮层计数器
 */
export function resetPopupCounter(type: PopupType): void {
  if (type in popupCounters) {
    popupCounters[type] = 0;
  }
}

/**
 * 获取所有计数器快照 (调试用)
 */
export function getPopupCounterSnapshot(): Record<PopupType, number> {
  return { ...popupCounters };
}

// ============================================================
// testid 生成
// ============================================================

/**
 * 生成浮层根节点 testid
 *
 * 格式: ${runtimePagePrefix}${popupPrefix}${tag}_${counterId}
 * 例: hall_dynamic_modal_div_0, hall_dynamic_select_div_2
 *
 * 浮层均为运行时注入，因此统一使用 runtimePagePrefix 作为前缀，
 * 与页面内动态节点保持一致。
 *
 * @param type - 浮层类型
 * @param tag - HTML 标签名 (简化后)
 * @param counterId - 计数器 ID (从 getNextPopupId 获取)
 */
export function buildPopupTestId(
  type: PopupType,
  tag: string,
  counterId: number
): string {
  const config = getConfig();
  const popupPrefix = config.popupPrefixMap[type] || `${type}_`;
  return `${config.runtimePagePrefix}${popupPrefix}${tag}_${counterId}`;
}
