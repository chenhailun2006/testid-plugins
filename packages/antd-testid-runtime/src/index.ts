/**
 * antd-testid-runtime — Ant Design Vue 运行时兜底打标模块统一入口
 *
 * 导出所有需要在用户项目中引用的模块：
 *   - 配置: initConfig, getConfig, TestIdMarkConfig
 *   - Observer: TestIdObserver
 *   - 锚点计数器: 所有 API
 *   - 浮层计数器: 所有 API
 *   - ID 检测器: TestIdChecker
 */

// ── 配置 ──
export {
  initConfig,
  getConfig,
  defaultConfig,
  mergeConfig,
} from './config/testMark';
export type {
  TestIdMarkConfig,
  PopupType,
} from './config/testMark';
export { INTERACTIVE_TAGS } from './config/testMark';

// ── 锚点计数器 ──
export {
  getNextAnchorLocalIndex,
  resetAllAnchorCounters,
  getAnchorCounterMap,
  parseBaseKey,
  buildAnchorTestId,
} from './utils/testIdAnchorCounter';
export type { ParsedBaseKey } from './utils/testIdAnchorCounter';

// ── 浮层计数器 ──
export {
  getNextPopupId,
  resetAllPopupCounters,
  resetPopupCounter,
  getPopupCounterSnapshot,
  buildPopupTestId,
} from './utils/testIdPopupCounter';

// ── DOM 观察器 ──
export { TestIdObserver } from './utils/testIdObserver';

// ── ID 检测器 ──
export { TestIdChecker } from './utils/testIdChecker';
