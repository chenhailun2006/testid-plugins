/**
 * Element UI 适配器 — adapters/element.ts
 *
 * 识别 Element UI / Element Plus 的浮层组件:
 *   - el-dialog, el-drawer, el-select-dropdown, el-picker-panel,
 *     el-message-box, el-popconfirm, el-dropdown-menu,
 *     el-tooltip__popper, el-message
 *
 * 注意: el-popper 被多种组件共用 (select/dropdown/tooltip 等)，
 *       不单独作为识别依据，避免误匹配。
 */

import type { UiAdapter, PopupType } from './types';

const popupClassSuffixMap: Record<PopupType, string[][]> = {
  modal:      [['-dialog']],
  drawer:     [['-drawer']],
  select:     [
    ['-select-dropdown'],             // ElSelect 下拉面板
    ['-cascader__suggestion-panel'],  // ElCascader 浮层 (suggestion 模式)
    ['-cascader-panel'],              // ElCascader 浮层 (panel 模式 / 低版本)
  ],
  datePicker: [
    ['-picker-panel'],                // 日期/时间选择器面板
    ['-date-range-picker__content'],  // 日期范围选择器内容区
  ],
  popconfirm: [
    ['-message-box'],    // Element MessageBox
    ['-popconfirm'],     // Element Popconfirm
  ],
  dropdown:   [['-dropdown-menu']],
  tooltip:    [
    ['-tooltip__popper'],  // Element Tooltip 浮层
    ['-popover'],          // Element Popover 浮层 (语义上接近 tooltip)
  ],
  message:    [['-message']],
};

export const elementAdapter: UiAdapter = {
  name: 'element-ui',
  cssPrefixes: ['el'],
  popupClassSuffixMap,
  interactiveTags: [
    'button',
    'input',
    'select',
    'textarea',
    'el-button',
    'el-input',
    'el-input-number',
    'el-select',
    'el-textarea',
    'el-checkbox',
    'el-radio',
    'el-switch',
  ],
  tagPrefixPattern: /^el-/,
};
