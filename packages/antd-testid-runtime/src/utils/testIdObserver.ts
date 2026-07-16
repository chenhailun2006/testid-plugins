/**
 * MutationObserver DOM 监听与自动打标器 — testIdObserver.ts
 *
 * 运行时核心模块。通过 MutationObserver 监听 document.body 的 DOM 变化，
 * 对编译期无法捕获的动态节点和浮层节点进行兜底打标。
 *
 * 处理流程:
 *   1. 带 data-test-base-key 的节点 → 公共组件实例 → 锚点定位 + 局部计数
 *   2. body 直系浮层节点 → 匹配浮层类型 → 独立前缀 + 计数器
 *   3. #app 内普通新增节点 → 页面动态节点 → dynamic_ 前缀
 */

import type { TestIdMarkConfig, PopupType } from '../config/testMark';
import { getConfig } from '../config/testMark';
import type { UiAdapter } from '../adapters/types';
import {
  mergeCssPrefixes,
  mergeInteractiveTags,
  mergeTagPrefixPattern,
} from '../adapters/types';
import {
  getNextAnchorLocalIndex,
  parseBaseKey,
  buildAnchorTestId,
} from './testIdAnchorCounter';
import {
  getNextPopupId,
  buildPopupTestId,
} from './testIdPopupCounter';

// ============================================================
// 类型定义
// ============================================================

/**
 * 浮层 CSS class → 类型的映射表类型
 * 每种浮层类型可匹配多组 class 组合 (支持多前缀)
 */
type PopupClassMap = Record<PopupType, string[][]>;

/**
 * Observer 内部状态
 */
interface ObserverState {
  observer: MutationObserver | null;
  isRunning: boolean;
  /** 当前路由名称 (用于 dynamic ID) */
  currentRoute: string;
  /** 页面内 dynamic 节点的兄弟索引计数器 (key: routeName_tag) */
  dynamicCounter: Map<string, number>;
  /** 浮层内部子节点的全局计数器 (key: popupType_tag，同类型浮层共享) */
  popupChildCounter: Map<string, number>;
}

// ============================================================
// 浮层识别规则 (从适配器组装)
// ============================================================

/**
 * 根据适配器列表构建浮层 class 匹配表
 *
 * 合并所有适配器的 popupClassSuffixMap × cssPrefixes，
 * 去重相同 (type, class组合) 的匹配规则。
 *
 * 外层: OR 遍历每个 suffixGroup
 * 内层: 每个 prefix × suffixGroup → AND class 组合
 */
function buildPopupClassMap(adapters: UiAdapter[]): PopupClassMap {
  const result = {} as PopupClassMap;

  // 用 Set 去重 (序列化后比较)
  const seen = new Map<PopupType, Set<string>>();

  for (const adapter of adapters) {
    const entries = Object.entries(adapter.popupClassSuffixMap) as [PopupType, string[][]][];
    for (const [type, suffixGroups] of entries) {
      if (!seen.has(type)) {
        seen.set(type, new Set());
        result[type] = [];
      }
      const typeSeen = seen.get(type)!;
      const selectorSets = result[type];

      for (const suffixGroup of suffixGroups) {
        for (const prefix of adapter.cssPrefixes) {
          const classCombo = suffixGroup.map((suffix) => `${prefix}${suffix}`);
          const key = classCombo.join('|');
          if (!typeSeen.has(key)) {
            typeSeen.add(key);
            selectorSets.push(classCombo);
          }
        }
      }
    }
  }
  return result;
}

// ============================================================
// TestIdObserver 类
// ============================================================

export class TestIdObserver {
  private state: ObserverState;

  /** 浮层 class 匹配映射 (从 adapters 动态构建) */
  private popupClassMap: PopupClassMap;

  /** 合并后的交互标签列表 (来自所有适配器) */
  private interactiveTags: string[];

  /** 合并后的标签前缀正则 (用于 getSimpleTag) */
  private tagPrefixPattern: RegExp | null;

  constructor() {
    const config = getConfig();
    this.popupClassMap = buildPopupClassMap(config.adapters);
    this.interactiveTags = mergeInteractiveTags(config.adapters);
    this.tagPrefixPattern = mergeTagPrefixPattern(config.adapters);

    this.state = {
      observer: null,
      isRunning: false,
      currentRoute: '',
      dynamicCounter: new Map(),
      popupChildCounter: new Map(),
    };
  }

  // ==========================================================
  // 生命周期
  // ==========================================================

  /**
   * 启动 MutationObserver (自动执行全量扫描兜底)
   */
  start(): void {
    if (this.state.isRunning) return;
    if (typeof MutationObserver === 'undefined') return;

    const config = getConfig();
    if (!config.enable) return;

    this.state.observer = new MutationObserver(this.handleMutations);
    this.state.observer.observe(document.body, {
      childList: true, // 监听子节点增删
      subtree: true,   // 监听所有后代节点
    });
    this.state.isRunning = true;

    // Observer 启动时无法捕获已有 DOM，需全量扫描兜底
    // (解决 start() 执行前已渲染的带 data-test-base-key 节点未被处理的问题)
    this.fullScan();
  }

  /**
   * 停止 Observer
   */
  stop(): void {
    this.state.observer?.disconnect();
    this.state.observer = null;
    this.state.isRunning = false;
  }

  /**
   * 更新当前路由 (路由切换时调用)
   */
  setRoute(routeName: string): void {
    this.state.currentRoute = routeName;
  }

  /**
   * 重置浮层子节点计数器 (路由切换时调用)
   */
  resetPopupChildCounter(): void {
    this.state.popupChildCounter.clear();
  }

  /**
   * 全量扫描当前 DOM (用于启动时兜底, 处理 Observer 启动前已渲染的节点)
   */
  fullScan(): void {
    const app = document.getElementById('app');
    if (app) {
      this.processNodeRecursive(app);
    }
    // 扫描 body 直系浮层节点
    Array.from(document.body.children).forEach((child) => {
      if (child.id !== 'app') {
        this.processNodeRecursive(child as HTMLElement);
      }
    });
  }

  // ==========================================================
  // MutationObserver 回调
  // ==========================================================

  /**
   * MutationObserver 回调 (箭头函数绑定 this)
   */
  private handleMutations = (mutations: MutationRecord[]): void => {
    const config = getConfig();
    if (!config.enable) return;

    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        this.processNodeRecursive(node as HTMLElement);
      });
    }
  };

  // ==========================================================
  // 节点处理决策树
  // ==========================================================

  /**
   * 递归处理元素节点及其子节点
   */
  private processNodeRecursive(el: HTMLElement): void {
    // 使用迭代栈避免深层递归
    const stack: HTMLElement[] = [el];

    while (stack.length > 0) {
      const node = stack.pop()!;
      this.processSingleNode(node);

      // 将子节点推入栈 (逆序保证原始顺序)
      const children = node.children;
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i] as HTMLElement);
      }
    }
  }

  /**
   * 处理单个节点
   *
   * 决策优先级:
   *   0. 已有 data-testid → 跳过
   *   1. 带 data-test-base-key → 公共组件实例 (锚点定位)
   *   2. 浮层内部子节点 → 先查祖先，再查自身是否 root
   *       (避免嵌套浮层如 el-cascader-panel ∈ el-cascader__suggestion-panel 被误判为独立 root)
   *   3. body 直系浮层根节点 → 匹配浮层类型 → 独立前缀
   *   4. #app 内普通节点 → dynamic
   */
  private processSingleNode(node: HTMLElement): void {
    const config = getConfig();

    // 0. 已存在非空 data-testid → 跳过
    //    注意: 仅判断非空值。若 UI 库透传了空 data-testid=""，
    //    应当视为"未注入"继续走后续打标逻辑 (避免误判跳过)。
    const existingTestId = node.getAttribute('data-testid');
    if (existingTestId) return;

    // 0.1 检查忽略条件
    if (this.shouldIgnore(node, config)) return;

    // 1. 带 data-test-base-key → 公共组件实例 (锚点定位)
    const baseKey = node.getAttribute('data-test-base-key');
    if (baseKey) {
      this.handleBaseKeyNode(node, baseKey, config);
      return;
    }

    // 2. 先查是否在已知浮层内部 (优先于 root 判定)
    const popupAncestor = this.detectPopupAncestor(node);
    if (popupAncestor) {
      this.handlePopupChildNode(node, popupAncestor.type, config);
      return;
    }

    // 3. 再查是否为 body 直系浮层根节点
    const popupType = this.detectPopupType(node);
    if (popupType) {
      this.handlePopupNode(node, popupType);
      return;
    }

    // 4. #app 内普通动态节点
    if (this.isInsideApp(node)) {
      this.handleDynamicNode(node, config);
    }
  }

  // ==========================================================
  // 处理: 公共组件 base-key 节点 (锚点定位)
  // ==========================================================

  /**
   * 处理公共组件 base-key 节点 — 锚点定位方案
   *
   * 流程:
   *   1. 解析 baseKey → { componentName, tagName, templateIndex }
   *   2. 查找最近锚点 → anchorTestId (祖先元素上的 data-testid)
   *   3. 锚点下局部计数 → localIndex
   *   4. 拼接: {anchorTestId}__{componentName}_{tagName}_{localIndex}
   *   5. 移除 data-test-base-key
   */
  private handleBaseKeyNode(
    node: HTMLElement,
    baseKey: string,
    _config: TestIdMarkConfig
  ): void {
    const parsed = parseBaseKey(baseKey);
    if (!parsed) return;

    // 查找最近锚点
    const anchorTestId = this.findAnchor(node);

    // 锚点下局部计数
    const localIndex = getNextAnchorLocalIndex(
      anchorTestId,
      parsed.componentName,
      parsed.tagName
    );

    // 拼接稳定 testid
    // 注意：buildAnchorTestId 已经包含锚点的完整 testid（含前缀），
    // 这里不需要再追加 compilePrefix，否则会重复拼接前缀
    const testId = buildAnchorTestId(
      anchorTestId,
      parsed.componentName,
      parsed.tagName,
      localIndex
    );

    node.setAttribute('data-testid', testId);
    node.removeAttribute('data-test-base-key');
  }

  /**
   * 向上遍历 DOM 树，找到第一个带 data-testid 属性的祖先元素作为锚点
   *
   * 如果一直找到 #app / body 都没有，返回 "__root" 作为兜底
   */
  private findAnchor(node: HTMLElement): string {
    let parent = node.parentElement;
    while (parent) {
      const tid = parent.getAttribute('data-testid');
      if (tid) {
        return tid;
      }
      // 到达根节点，停止
      if (parent.id === 'app' || parent === document.body) {
        break;
      }
      parent = parent.parentElement;
    }
    // fallback: 无锚点可定位
    return '__root';
  }

  // ==========================================================
  // 处理: 浮层节点
  // ==========================================================

  /**
   * 处理 Antd 浮层根节点
   *
   * @param node - 浮层根节点元素
   * @param type - 浮层类型
   */
  private handlePopupNode(node: HTMLElement, type: PopupType): void {
    const counterId = getNextPopupId(type);
    const tag = this.getSimpleTag(node);
    const testId = buildPopupTestId(type, tag, counterId);
    node.setAttribute('data-testid', testId);
  }

  /**
   * 检测节点是否为浮层根节点
   *
   * Ant Design Vue 4.x 可能用一层 wrapper DIV 包裹浮层再 append 到 body:
   *   body → DIV(wrapper) → DIV.ant-picker-dropdown → panel
   *
   * 因此不要求 parentElement === document.body，
   * 只要节点 class 匹配浮层类型且不在 #app 内即可。
   *
   * @param node - 待检测节点
   * @returns 浮层类型或 null
   */
  private detectPopupType(node: HTMLElement): PopupType | null {
    // 排除 #app 内节点 (这些走 dynamic 处理，避免将页面内静态 dropdown 误判为浮层)
    if (this.isInsideApp(node)) return null;

    // 匹配 Antd 组件的 CSS class
    return this.matchPopupClass(node);
  }

  /**
   * 向上遍历 DOM，检测节点是否在某个浮层内部
   *
   * 查找最近的匹配 POPUP_CLASS_MAP 的祖先元素 (不要求它本身是 body 直系，
   * 因为 Ant Design Vue 4 可能在浮层根节点外包一层 wrapper DIV)。
   * 找到浮层根节点后，继续向上验证其祖先链能到达 body (确保不在 #app 内)。
   *
   * @returns 浮层类型 + 祖先元素，或 null (不在任何浮层内)
   */
  private detectPopupAncestor(node: HTMLElement): { type: PopupType; element: HTMLElement } | null {
    let current: HTMLElement | null = node.parentElement;
    while (current) {
      const type = this.matchPopupClass(current);
      if (type) {
        // 验证浮层根节点最终连接到 body (排除页面内误匹配)
        const reachesBody = this.reachesBody(current);
        if (reachesBody) return { type, element: current };
      }
      if (current === document.body || current.id === 'app') break;
      current = current.parentElement;
    }
    return null;
  }

  /**
   * 验证节点的祖先链是否能到达 document.body
   * (经过若干层 wrapper 后依然是 body 下的浮层)
   */
  private reachesBody(node: HTMLElement): boolean {
    let current: HTMLElement | null = node;
    while (current && current !== document.body) {
      if (current.id === 'app') return false;
      current = current.parentElement;
    }
    return current === document.body;
  }

  /**
   * 检测节点 class 是否匹配某个浮层类型
   *
   * 遍历 popupClassMap 中的所有 class 组合，任一组合全部命中即匹配。
   */
  private matchPopupClass(node: HTMLElement): PopupType | null {
    const classStr = node.className || '';
    // 确保 classStr 是字符串 (SVG 元素可能返回 SVGAnimatedString)
    if (typeof classStr !== 'string') return null;

    const classList = classStr.split(/\s+/);
    const entries = Object.entries(this.popupClassMap) as [PopupType, string[][]][];
    for (const [type, selectorSets] of entries) {
      for (const requiredClasses of selectorSets) {
        if (requiredClasses.every((cls) => classList.includes(cls))) {
          return type;
        }
      }
    }
    return null;
  }

  // ==========================================================
  // 处理: 页面动态节点
  // ==========================================================

  /**
   * 处理页面内动态新增节点 (v-for / 异步 v-if 等)
   *
   * ID 格式: ${runtimePagePrefix}${route}_${tag}_${counter}
   */
  private handleDynamicNode(
    node: HTMLElement,
    config: TestIdMarkConfig
  ): void {
    // onlyInteractive 模式下跳过非交互元素
    if (config.onlyInteractive && !this.isInteractive(node)) return;

    const tag = this.getSimpleTag(node);
    const route = this.state.currentRoute || 'unknown';
    const key = `${route}_${tag}`;

    const current = this.state.dynamicCounter.get(key) ?? 0;
    this.state.dynamicCounter.set(key, current + 1);

    const testId = `${config.runtimePagePrefix}${route}_${tag}_${current}`;
    node.setAttribute('data-testid', testId);
  }

  /**
   * 处理浮层内部子节点 (Modal/Drawer/Dropdown 内的按钮、输入框等)
   *
   * 同类型浮层的子节点共享全局计数器 (key: popupType_tag)，
   * 确保页面上多个同类下拉选择框的下拉选项 testid 全局唯一。
   *
   * ID 格式: ${runtimePagePrefix}${popupPrefix}${tag}_${counter}
   * 例: hall_dynamic_modal_button_0, hall_dynamic_select_div_2
   *
   * 浮层子元素均为运行时注入，统一使用 runtimePagePrefix 前缀。
   */
  private handlePopupChildNode(
    node: HTMLElement,
    popupType: PopupType,
    config: TestIdMarkConfig
  ): void {
    if (config.onlyInteractive && !this.isInteractive(node)) return;

    const tag = this.getSimpleTag(node);

    // 同类型浮层的子节点共享全局计数器
    // 确保页面上多个相同类型的下拉选择框，其下拉选项 testid 全局唯一
    const key = `${popupType}_${tag}`;

    const current = this.state.popupChildCounter.get(key) ?? 0;
    this.state.popupChildCounter.set(key, current + 1);

    const popupPrefix = config.popupPrefixMap[popupType] || `${popupType}_`;
    const testId = `${config.runtimePagePrefix}${popupPrefix}${tag}_${current}`;
    node.setAttribute('data-testid', testId);
  }

  // ==========================================================
  // 辅助方法
  // ==========================================================

  /**
   * 检测元素是否在 #app 容器内
   */
  private isInsideApp(node: HTMLElement): boolean {
    const app = document.getElementById('app');
    if (!app) return false;
    return app.contains(node);
  }

  /**
   * 获取元素的简化标签名
   *
   * 去除所有适配器注册的 UI 库标签前缀:
   *   AntD: a-button → button, a-input → input
   *   Element: el-button → button, el-input → input
   */
  private getSimpleTag(node: HTMLElement): string {
    let tag = node.tagName.toLowerCase();
    if (this.tagPrefixPattern) {
      tag = tag.replace(this.tagPrefixPattern, '');
    }
    return tag;
  }

  /**
   * 判断是否可交互元素
   *
   * 可交互特征:
   *   - 匹配任意适配器的交互标签 (含原生 + UI 库前缀)
   *   - onclick 属性
   *   - role="button" / role="checkbox" / role="radio" / role="switch"
   *   - tabindex 属性
   *   - CSS class 匹配 UI 库交互组件 (如 ant-menu-item → 渲染为 <li>，tag 不匹配组件名)
   */
  private isInteractive(node: HTMLElement): boolean {
    const tag = node.tagName.toLowerCase();

    // 匹配所有适配器的交互标签
    if (this.interactiveTags.includes(tag)) return true;

    // onclick 原生事件
    if (node.hasAttribute('onclick')) return true;

    // role 属性
    const role = node.getAttribute('role');
    if (role === 'button' || role === 'checkbox' || role === 'radio' || role === 'switch') {
      return true;
    }

    // tabindex: 可聚焦即交互
    if (node.hasAttribute('tabindex')) return true;

    // CSS class 兜底: UI 库组件渲染为通用 HTML 标签时 (如 <a-menu-item> → <li class="ant-menu-item">)，
    // 仅靠 tagName 无法匹配 interactiveTags 中的组件名，需要通过 class 辅助识别。
    const classStr = node.className;
    if (typeof classStr === 'string') {
      // 匹配 Ant Design Vue 常见交互组件的 CSS class
      if (/\bant-(?:menu-item|menu-submenu|dropdown-menu-item|select-item|tabs-tab|picker-cell|breadcrumb-link)\b/.test(classStr)) {
        return true;
      }
      // 匹配 Element UI 常见交互组件
      if (/\bel-(?:menu-item|dropdown-menu__item|select-dropdown__item|tabs__item)\b/.test(classStr)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查是否应跳过 (ignoreTags / ignoreClass)
   */
  private shouldIgnore(node: HTMLElement, config: TestIdMarkConfig): boolean {
    // 忽略标签
    const tag = node.tagName.toLowerCase();
    if (config.ignoreTags.includes(tag)) return true;

    // 忽略 class
    const classStr = node.className;
    if (typeof classStr === 'string') {
      for (const cls of config.ignoreClass) {
        if (classStr.split(/\s+/).includes(cls)) return true;
      }
    }

    return false;
  }
}
