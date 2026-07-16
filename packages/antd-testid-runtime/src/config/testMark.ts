/**
 * 全局配置模块 — testMark.ts
 *
 * 管理所有打标相关的配置项：
 * - 前缀 (compile / runtime / popup)
 * - 黑白名单
 * - 开关
 * - 浮层前缀映射
 * - UI 库适配器
 */

import type { UiAdapter, PopupType } from '../adapters/types';
import { antdAdapter } from '../adapters/antd';

// ============================================================
// 类型重导出
// ============================================================

export type { PopupType } from '../adapters/types';

// ============================================================
// 类型定义
// ============================================================

/**
 * 全量配置接口
 */
export interface TestIdMarkConfig {
  /** 总开关，生产环境强制为 false */
  enable: boolean;

  /**
   * 全局前缀，拼接到所有 testid 前缀之前
   * 例: globalPrefix = "hall" → compilePrefix 变为 hall_static_，runtimePagePrefix 变为 hall_dynamic_
   * 设值后会自动应用到 compilePrefix、runtimePagePrefix 和 popupPrefixMap
   * 默认: 空 (不添加)
   */
  globalPrefix: string;

  /** 编译期静态节点统一前缀 (默认 "static_") */
  compilePrefix: string;

  /** 页面内动态节点统一前缀 (默认 "dynamic_") */
  runtimePagePrefix: string;

  /** 浮层组件专属前缀映射 */
  popupPrefixMap: Record<PopupType, string>;

  /**
   * UI 库适配器列表 (默认为 [antdAdapter])
   *
   * 每个适配器定义了一个 UI 库的浮层 CSS class 识别规则、
   * 交互标签列表和标签前缀。Observer 自动合并所有适配器的规则。
   *
   * 仅使用 Ant Design Vue:
   *   adapters: [antdAdapter]
   *
   * 仅使用 Element UI:
   *   adapters: [elementAdapter]
   *
   * 同时使用两种 UI 库:
   *   adapters: [antdAdapter, elementAdapter]
   *
   * 自定义 Ant Design Vue CSS 前缀 (如 <a-config-provider prefixCls="my-ui">):
   *   adapters: [{ ...antdAdapter, cssPrefixes: ['my-ui'] }]
   */
  adapters: UiAdapter[];

  /** 忽略不打标的 HTML 标签名 */
  ignoreTags: string[];

  /** 包含此 class 的 DOM 跳过打标 */
  ignoreClass: string[];

  /** 是否仅给可交互控件打标 */
  onlyInteractive: boolean;

  /** 路由切换时是否清空锚点局部计数器 */
  resetInstanceOnRouteChange: boolean;

  /** 路由切换时是否重置全部浮层计数器 */
  resetPopupCounterOnRouteChange: boolean;
}

// ============================================================
// 默认配置
// ============================================================

/**
 * 默认配置对象 (enable 默认为 true，由调用方传入 DEV 判断)
 */
export const defaultConfig: TestIdMarkConfig = {
  enable: true,
  globalPrefix: '',
  compilePrefix: 'static_',
  runtimePagePrefix: 'dynamic_',
  adapters: [antdAdapter],
  popupPrefixMap: {
    modal: 'modal_',
    drawer: 'drawer_',
    select: 'select_',
    datePicker: 'datePicker_',
    popconfirm: 'popconfirm_',
    popover: 'popover_',
    dropdown: 'dropdown_',
    tooltip: 'tooltip_',
    message: 'message_',
    submenu: 'submenu_',
  },
  ignoreTags: ['script', 'style', 'svg', 'br', 'iframe'],
  ignoreClass: ['no-test-mark', 'hidden'],
  onlyInteractive: true,
  resetInstanceOnRouteChange: true,
  resetPopupCounterOnRouteChange: true,
};

// ============================================================
// 配置合并 & 单例
// ============================================================

/**
 * 合并用户自定义配置与默认配置
 * 采用浅合并策略，popupPrefixMap 支持部分覆盖
 *
 * 关键: 若设置了 globalPrefix，自动拼接到所有前缀字段
 */
export function mergeConfig(
  userConfig?: Partial<TestIdMarkConfig>
): TestIdMarkConfig {
  if (!userConfig) {
    const cfg = { ...defaultConfig };
    return applyGlobalPrefix(cfg);
  }

  const merged: TestIdMarkConfig = {
    ...defaultConfig,
    ...userConfig,
    // popupPrefixMap 需要深度合并: 允许用户只覆盖部分浮层前缀
    popupPrefixMap: {
      ...defaultConfig.popupPrefixMap,
      ...(userConfig.popupPrefixMap || {}),
    },
  };

  return applyGlobalPrefix(merged);
}

/**
 * 如果设置了 globalPrefix，将其拼接到所有前缀字段 (幂等)
 */
function applyGlobalPrefix(cfg: TestIdMarkConfig): TestIdMarkConfig {
  const g = cfg.globalPrefix;
  if (!g) return cfg;

  const prefix = `${g}_`;

  // 防止重复拼接
  const prepend = (val: string): string =>
    val.startsWith(prefix) ? val : `${prefix}${val}`;

  return {
    ...cfg,
    compilePrefix: prepend(cfg.compilePrefix),
    runtimePagePrefix: prepend(cfg.runtimePagePrefix),
    // 注意: popupPrefixMap 不拼接 globalPrefix
    // 浮层 testid 格式为 ${runtimePagePrefix}${popupPrefixMap[type]}...，
    // runtimePagePrefix 已携带 globalPrefix，避免重复
    popupPrefixMap: { ...cfg.popupPrefixMap },
  };
}

/**
 * 全局配置实例 (模块级单例)
 * 初始化时调用 initConfig() 注入
 */
let globalConfig: TestIdMarkConfig = { ...defaultConfig };

/**
 * 初始化全局配置 (应用启动时调用)
 */
export function initConfig(custom?: Partial<TestIdMarkConfig>): void {
  globalConfig = mergeConfig(custom);
}

/**
 * 获取当前全局配置 (只读)
 */
export function getConfig(): Readonly<TestIdMarkConfig> {
  return globalConfig;
}
