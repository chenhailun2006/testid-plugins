/**
 * Ant Design Vue 适配器 — adapters/antd.ts
 *
 * 识别 Ant Design Vue 的浮层组件:
 *   - ant-modal, ant-drawer, ant-select-dropdown, ant-picker-dropdown,
 *     ant-popover+ant-popconfirm, ant-dropdown, ant-tooltip, ant-message
 *
 * 支持多版本兼容:
 *   - Ant Design Vue 4.x: ant-picker-dropdown
 *   - Ant Design Vue 1.x: ant-calendar-picker-container
 */

import type { UiAdapter, PopupType } from './types';

const popupClassSuffixMap: Record<PopupType, string[][]> = {
  modal:      [['-modal']],
  drawer:     [['-drawer']],
  select:     [['-select-dropdown']],
  datePicker: [
    ['-picker-dropdown'],            // Ant Design Vue 4.x
    ['-calendar-picker-container'],  // Ant Design Vue 1.x
  ],
  popconfirm: [['-popover', '-popconfirm']],
  dropdown:   [['-dropdown']],
  tooltip:    [['-tooltip']],
  message:    [['-message']],
};

export const antdAdapter: UiAdapter = {
  name: 'ant-design-vue',
  cssPrefixes: ['ant'],
  popupClassSuffixMap,
  interactiveTags: [
    'button',
    'input',
    'select',
    'textarea',
    'a-button',
    'a-input',
    'a-input-number',
    'a-select',
    'a-textarea',
    'a-checkbox',
    'a-radio',
    'a-switch',
  ],
  tagPrefixPattern: /^a-/,
};
