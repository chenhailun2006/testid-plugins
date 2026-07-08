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
  /** 浮层内部子节点的计数器 (key: popupType_tag) */
  popupChildCounter: Map<string, number>;
}

// ============================================================
// 浮层识别规则
// ============================================================

/**
 * 浮层组件的 CSS class 后缀模板 (不含前缀)
 *
 * 每条记录是一组 class 名称 (不含前缀)，配合 antdClassPrefix 动态构建。
 * 多 class 组合表示同时匹配多个 class (如 popconfirm 需同时有 popover + popconfirm)
 *
 * 例: antdClassPrefix = ['ant', 'custom']
 *   → modal: [['ant-modal'], ['custom-modal']]
 *   → popconfirm: [['ant-popover', 'ant-popconfirm'], ['custom-popover', 'custom-popconfirm']]
 */
const POPUP_CLASS_SUFFIX_MAP: Record<PopupType, string[]> = {
  modal:      ['-modal'],
  drawer:     ['-drawer'],
  select:     ['-select-dropdown'],
  datePicker: ['-picker-dropdown'],
  popconfirm: ['-popover', '-popconfirm'],
  dropdown:   ['-dropdown'],
  tooltip:    ['-tooltip'],
};

/**
 * 根据 antdClassPrefix[] 构建浮层 class 匹配表
 * 每种浮层类型 × 每个前缀 = 多组 class 组合
 */
function buildPopupClassMap(prefixes: string[]): PopupClassMap {
  const result = {} as PopupClassMap;
  const entries = Object.entries(POPUP_CLASS_SUFFIX_MAP) as [PopupType, string[]][];
  for (const [type, suffixClasses] of entries) {
    result[type] = prefixes.map((prefix) =>
      suffixClasses.map((suffix) => `${prefix}${suffix}`)
    );
  }
  return result;
}

// ============================================================
// TestIdObserver 类
// ============================================================

export class TestIdObserver {
  private state: ObserverState;

  /** 浮层 class 匹配映射 (根据 antdClassPrefix 动态构建) */
  private popupClassMap: PopupClassMap;

  constructor() {
    const config = getConfig();
    this.popupClassMap = buildPopupClassMap(config.antdClassPrefix);

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
   * 启动 MutationObserver
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
   *   2. body 直系浮层根节点 → 匹配浮层类型 → 独立前缀
   *   3. 浮层内部子节点 → 查找浮层祖先 → 浮层独立前缀 + 计数器
   *   4. #app 内普通节点 → dynamic
   */
  private processSingleNode(node: HTMLElement): void {
    const config = getConfig();

    // 0. 已存在 data-testid → 跳过
    if (node.hasAttribute('data-testid')) return;

    // 0.1 检查忽略条件
    if (this.shouldIgnore(node, config)) return;

    // 1. 带 data-test-base-key → 公共组件实例 (锚点定位)
    const baseKey = node.getAttribute('data-test-base-key');
    if (baseKey) {
      this.handleBaseKeyNode(node, baseKey, config);
      return;
    }

    // 2. body 直系浮层根节点
    const popupType = this.detectPopupType(node);
    if (popupType) {
      this.handlePopupNode(node, popupType);
      return;
    }

    // 3. 浮层内部子节点 (Modal/Drawer/Dropdown 内的按钮、输入框等)
    const popupAncestorType = this.detectPopupAncestor(node);
    if (popupAncestorType) {
      this.handlePopupChildNode(node, popupAncestorType, config);
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
   * @returns 浮层类型或 null (不在任何浮层内)
   */
  private detectPopupAncestor(node: HTMLElement): PopupType | null {
    let current: HTMLElement | null = node.parentElement;
    while (current) {
      const type = this.matchPopupClass(current);
      if (type) {
        // 验证浮层根节点最终连接到 body (排除页面内误匹配)
        const reachesBody = this.reachesBody(current);
        if (reachesBody) return type;
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
   * 处理 Antd 组件前缀: a-button → button, a-input → input
   */
  private getSimpleTag(node: HTMLElement): string {
    return node.tagName.toLowerCase().replace(/^a-/, '');
  }

  /**
   * 判断是否可交互元素
   *
   * 可交互特征:
   *   - 交互类标签: button, input, select, textarea
   *   - onclick 属性
   *   - role="button" / role="checkbox" / role="radio"
   *   - cursor:pointer (不检测，因为可能从 CSS 继承，误判率高)
   */
  private isInteractive(node: HTMLElement): boolean {
    const tag = node.tagName.toLowerCase();

    // 交互标签 (含 Antd 前缀)
    const interactiveTags = [
      'button', 'a-button',
      'input', 'a-input', 'a-input-number',
      'select', 'a-select',
      'textarea', 'a-textarea',
    ];
    if (interactiveTags.includes(tag)) return true;

    // onclick 原生事件
    if (node.hasAttribute('onclick')) return true;

    // role 属性
    const role = node.getAttribute('role');
    if (role === 'button' || role === 'checkbox' || role === 'radio' || role === 'switch') {
      return true;
    }

    // tabindex: 可聚焦即交互
    if (node.hasAttribute('tabindex')) return true;

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
