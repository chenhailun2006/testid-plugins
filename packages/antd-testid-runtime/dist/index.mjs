var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// src/adapters/antd.ts
var popupClassSuffixMap = {
  modal: [["-modal"]],
  drawer: [["-drawer"]],
  select: [["-select-dropdown"]],
  datePicker: [
    ["-picker-dropdown"],
    // Ant Design Vue 4.x
    ["-calendar-picker-container"]
    // Ant Design Vue 1.x
  ],
  popconfirm: [["-popover", "-popconfirm"]],
  popover: [["-popover"]],
  dropdown: [["-dropdown"]],
  tooltip: [["-tooltip"]],
  message: [["-message"]],
  submenu: [["-menu-submenu-popup"]]
};
var antdAdapter = {
  name: "ant-design-vue",
  cssPrefixes: ["ant"],
  popupClassSuffixMap,
  interactiveTags: [
    "button",
    "input",
    "select",
    "textarea",
    "a-button",
    "a-input",
    "a-input-number",
    "a-select",
    "a-textarea",
    "a-checkbox",
    "a-radio",
    "a-switch",
    "a-menu-item",
    "a-dropdown-button",
    "a-tabs-tab-pane",
    "a-table",
    "a-tag",
    "a-card",
    "a-collapse-panel"
  ],
  tagPrefixPattern: /^a-/
};

// src/config/testMark.ts
var defaultConfig = {
  enable: true,
  globalPrefix: "",
  compilePrefix: "static_",
  runtimePagePrefix: "dynamic_",
  adapters: [antdAdapter],
  popupPrefixMap: {
    modal: "modal_",
    drawer: "drawer_",
    select: "select_",
    datePicker: "datePicker_",
    popconfirm: "popconfirm_",
    popover: "popover_",
    dropdown: "dropdown_",
    tooltip: "tooltip_",
    message: "message_",
    submenu: "submenu_"
  },
  ignoreTags: ["script", "style", "svg", "br", "iframe"],
  ignoreClass: ["no-test-mark", "hidden"],
  onlyInteractive: true,
  resetInstanceOnRouteChange: true,
  resetPopupCounterOnRouteChange: true
};
function mergeConfig(userConfig) {
  if (!userConfig) {
    const cfg = __spreadValues({}, defaultConfig);
    return applyGlobalPrefix(cfg);
  }
  const merged = __spreadProps(__spreadValues(__spreadValues({}, defaultConfig), userConfig), {
    // popupPrefixMap 需要深度合并: 允许用户只覆盖部分浮层前缀
    popupPrefixMap: __spreadValues(__spreadValues({}, defaultConfig.popupPrefixMap), userConfig.popupPrefixMap || {})
  });
  return applyGlobalPrefix(merged);
}
function applyGlobalPrefix(cfg) {
  const g = cfg.globalPrefix;
  if (!g) return cfg;
  const prefix = `${g}_`;
  const prepend = (val) => val.startsWith(prefix) ? val : `${prefix}${val}`;
  return __spreadProps(__spreadValues({}, cfg), {
    compilePrefix: prepend(cfg.compilePrefix),
    runtimePagePrefix: prepend(cfg.runtimePagePrefix),
    // 注意: popupPrefixMap 不拼接 globalPrefix
    // 浮层 testid 格式为 ${runtimePagePrefix}${popupPrefixMap[type]}...，
    // runtimePagePrefix 已携带 globalPrefix，避免重复
    popupPrefixMap: __spreadValues({}, cfg.popupPrefixMap)
  });
}
var globalConfig = __spreadValues({}, defaultConfig);
function initConfig(custom) {
  globalConfig = mergeConfig(custom);
}
function getConfig() {
  return globalConfig;
}

// src/adapters/element.ts
var popupClassSuffixMap2 = {
  modal: [["-dialog"]],
  drawer: [["-drawer"]],
  select: [
    ["-select-dropdown"],
    // ElSelect 下拉面板
    ["-cascader__suggestion-panel"],
    // ElCascader 浮层 (suggestion 模式)
    ["-cascader-panel"]
    // ElCascader 浮层 (panel 模式 / 低版本)
  ],
  datePicker: [
    ["-picker-panel"],
    // 日期/时间选择器面板
    ["-date-range-picker__content"]
    // 日期范围选择器内容区
  ],
  popconfirm: [
    ["-message-box"],
    // Element MessageBox
    ["-popconfirm"]
    // Element Popconfirm
  ],
  popover: [["-popover"]],
  dropdown: [["-dropdown-menu"]],
  tooltip: [["-tooltip__popper"]],
  message: [["-message"]],
  submenu: []
};
var elementAdapter = {
  name: "element-ui",
  cssPrefixes: ["el"],
  popupClassSuffixMap: popupClassSuffixMap2,
  interactiveTags: [
    "button",
    "input",
    "select",
    "textarea",
    "el-button",
    "el-input",
    "el-input-number",
    "el-select",
    "el-textarea",
    "el-checkbox",
    "el-radio",
    "el-switch"
  ],
  tagPrefixPattern: /^el-/
};

// src/utils/testIdAnchorCounter.ts
var anchorCounterMap = /* @__PURE__ */ new Map();
function buildAnchorKey(anchorTestId, componentName, tagName) {
  return `${anchorTestId}__${componentName}__${tagName}`;
}
function getNextAnchorLocalIndex(anchorTestId, componentName, tagName) {
  var _a;
  const key = buildAnchorKey(anchorTestId, componentName, tagName);
  const current = (_a = anchorCounterMap.get(key)) != null ? _a : 0;
  anchorCounterMap.set(key, current + 1);
  return current;
}
function resetAllAnchorCounters() {
  anchorCounterMap.clear();
}
function getAnchorCounterMap() {
  return anchorCounterMap;
}
function parseBaseKey(baseKey) {
  const match = baseKey.match(
    /^common_comp_(.+?)_tag_(.+)_(\d+)$/
  );
  if (!match) {
    console.warn(
      "[antd-testid-runtime] parseBaseKey \u5931\u8D25\uFF0CbaseKey \u683C\u5F0F\u4E0D\u5339\u914D:",
      baseKey,
      "\u671F\u671B\u683C\u5F0F: common_comp_{componentName}_tag_{tagName}_{index}"
    );
    return null;
  }
  return {
    componentName: match[1],
    tagName: match[2],
    templateIndex: match[3]
  };
}
function buildAnchorTestId(anchorTestId, componentName, tagName, localIndex) {
  return `${anchorTestId}__${componentName}_${tagName}_${localIndex}`;
}

// src/utils/testIdPopupCounter.ts
var popupCounters = {
  modal: 0,
  drawer: 0,
  select: 0,
  datePicker: 0,
  popconfirm: 0,
  popover: 0,
  dropdown: 0,
  tooltip: 0,
  message: 0,
  submenu: 0
};
function getNextPopupId(type) {
  const key = type in popupCounters ? type : "modal";
  const id = popupCounters[key];
  popupCounters[key] += 1;
  return id;
}
function resetAllPopupCounters() {
  Object.keys(popupCounters).forEach(
    (key) => popupCounters[key] = 0
  );
}
function resetPopupCounter(type) {
  if (type in popupCounters) {
    popupCounters[type] = 0;
  }
}
function getPopupCounterSnapshot() {
  return __spreadValues({}, popupCounters);
}
function buildPopupTestId(type, tag, counterId) {
  const config = getConfig();
  const popupPrefix = config.popupPrefixMap[type] || `${type}_`;
  return `${config.runtimePagePrefix}${popupPrefix}${tag}_${counterId}`;
}

// src/adapters/types.ts
function mergeInteractiveTags(adapters) {
  const set = /* @__PURE__ */ new Set();
  for (const a of adapters) {
    for (const tag of a.interactiveTags) {
      set.add(tag);
    }
  }
  return [...set];
}
function mergeTagPrefixPattern(adapters) {
  const patterns = adapters.map((a) => a.tagPrefixPattern.source).filter(Boolean);
  if (patterns.length === 0) return null;
  return new RegExp(patterns.join("|"), "gi");
}

// src/utils/testIdObserver.ts
function buildPopupClassMap(adapters) {
  const result = {};
  const seen = /* @__PURE__ */ new Map();
  for (const adapter of adapters) {
    const entries = Object.entries(adapter.popupClassSuffixMap);
    for (const [type, suffixGroups] of entries) {
      if (!seen.has(type)) {
        seen.set(type, /* @__PURE__ */ new Set());
        result[type] = [];
      }
      const typeSeen = seen.get(type);
      const selectorSets = result[type];
      for (const suffixGroup of suffixGroups) {
        for (const prefix of adapter.cssPrefixes) {
          const classCombo = suffixGroup.map((suffix) => `${prefix}${suffix}`);
          const key = classCombo.join("|");
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
var TestIdObserver = class {
  constructor() {
    // ==========================================================
    // MutationObserver 回调
    // ==========================================================
    /**
     * MutationObserver 回调 (箭头函数绑定 this)
     */
    this.handleMutations = (mutations) => {
      const config = getConfig();
      if (!config.enable) return;
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          this.processNodeRecursive(node);
        });
      }
    };
    const config = getConfig();
    this.popupClassMap = buildPopupClassMap(config.adapters);
    this.interactiveTags = mergeInteractiveTags(config.adapters);
    this.tagPrefixPattern = mergeTagPrefixPattern(config.adapters);
    this.state = {
      observer: null,
      isRunning: false,
      currentRoute: "",
      dynamicCounter: /* @__PURE__ */ new Map(),
      popupChildCounter: /* @__PURE__ */ new Map()
    };
  }
  // ==========================================================
  // 生命周期
  // ==========================================================
  /**
   * 启动 MutationObserver (自动执行全量扫描兜底)
   */
  start() {
    if (this.state.isRunning) return;
    if (typeof MutationObserver === "undefined") return;
    const config = getConfig();
    if (!config.enable) return;
    this.state.observer = new MutationObserver(this.handleMutations);
    this.state.observer.observe(document.body, {
      childList: true,
      // 监听子节点增删
      subtree: true
      // 监听所有后代节点
    });
    this.state.isRunning = true;
    this.fullScan();
  }
  /**
   * 停止 Observer
   */
  stop() {
    var _a;
    (_a = this.state.observer) == null ? void 0 : _a.disconnect();
    this.state.observer = null;
    this.state.isRunning = false;
  }
  /**
   * 更新当前路由 (路由切换时调用)
   */
  setRoute(routeName) {
    this.state.currentRoute = routeName;
  }
  /**
   * 重置浮层子节点计数器 (路由切换时调用)
   */
  resetPopupChildCounter() {
    this.state.popupChildCounter.clear();
  }
  /**
   * 全量扫描当前 DOM (用于启动时兜底, 处理 Observer 启动前已渲染的节点)
   */
  fullScan() {
    const app = document.getElementById("app");
    if (app) {
      this.processNodeRecursive(app);
    }
    Array.from(document.body.children).forEach((child) => {
      if (child.id !== "app") {
        this.processNodeRecursive(child);
      }
    });
  }
  // ==========================================================
  // 节点处理决策树
  // ==========================================================
  /**
   * 递归处理元素节点及其子节点
   */
  processNodeRecursive(el) {
    const stack = [el];
    while (stack.length > 0) {
      const node = stack.pop();
      this.processSingleNode(node);
      const children = node.children;
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
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
  processSingleNode(node) {
    const config = getConfig();
    const existingTestId = node.getAttribute("data-testid");
    if (existingTestId) return;
    if (this.shouldIgnore(node, config)) return;
    const baseKey = node.getAttribute("data-test-base-key");
    if (baseKey) {
      this.handleBaseKeyNode(node, baseKey, config);
      return;
    }
    const popupAncestor = this.detectPopupAncestor(node);
    if (popupAncestor) {
      this.handlePopupChildNode(node, popupAncestor.type, config);
      return;
    }
    const popupType = this.detectPopupType(node);
    if (popupType) {
      this.handlePopupNode(node, popupType);
      return;
    }
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
  handleBaseKeyNode(node, baseKey, _config) {
    const parsed = parseBaseKey(baseKey);
    if (!parsed) return;
    const anchorTestId = this.findAnchor(node);
    const localIndex = getNextAnchorLocalIndex(
      anchorTestId,
      parsed.componentName,
      parsed.tagName
    );
    const testId = buildAnchorTestId(
      anchorTestId,
      parsed.componentName,
      parsed.tagName,
      localIndex
    );
    node.setAttribute("data-testid", testId);
    node.removeAttribute("data-test-base-key");
  }
  /**
   * 向上遍历 DOM 树，找到第一个带 data-testid 属性的祖先元素作为锚点
   *
   * 如果一直找到 #app / body 都没有，返回 "__root" 作为兜底
   */
  findAnchor(node) {
    let parent = node.parentElement;
    while (parent) {
      const tid = parent.getAttribute("data-testid");
      if (tid) {
        return tid;
      }
      if (parent.id === "app" || parent === document.body) {
        break;
      }
      parent = parent.parentElement;
    }
    return "__root";
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
  handlePopupNode(node, type) {
    const counterId = getNextPopupId(type);
    const tag = this.getSimpleTag(node);
    const testId = buildPopupTestId(type, tag, counterId);
    node.setAttribute("data-testid", testId);
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
  detectPopupType(node) {
    if (this.isInsideApp(node)) return null;
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
  detectPopupAncestor(node) {
    let current = node.parentElement;
    while (current) {
      const type = this.matchPopupClass(current);
      if (type) {
        const reachesBody = this.reachesBody(current);
        if (reachesBody) return { type, element: current };
      }
      if (current === document.body || current.id === "app") break;
      current = current.parentElement;
    }
    return null;
  }
  /**
   * 验证节点的祖先链是否能到达 document.body
   * (经过若干层 wrapper 后依然是 body 下的浮层)
   */
  reachesBody(node) {
    let current = node;
    while (current && current !== document.body) {
      if (current.id === "app") return false;
      current = current.parentElement;
    }
    return current === document.body;
  }
  /**
   * 检测节点 class 是否匹配某个浮层类型
   *
   * 遍历 popupClassMap 中的所有 class 组合，任一组合全部命中即匹配。
   */
  matchPopupClass(node) {
    const classStr = node.className || "";
    if (typeof classStr !== "string") return null;
    const classList = classStr.split(/\s+/);
    const entries = Object.entries(this.popupClassMap);
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
  handleDynamicNode(node, config) {
    var _a;
    if (config.onlyInteractive && !this.isInteractive(node)) return;
    const tag = this.getSimpleTag(node);
    const route = this.state.currentRoute || "unknown";
    const key = `${route}_${tag}`;
    const current = (_a = this.state.dynamicCounter.get(key)) != null ? _a : 0;
    this.state.dynamicCounter.set(key, current + 1);
    const testId = `${config.runtimePagePrefix}${route}_${tag}_${current}`;
    node.setAttribute("data-testid", testId);
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
  handlePopupChildNode(node, popupType, config) {
    var _a;
    if (config.onlyInteractive && !this.isInteractive(node)) return;
    const tag = this.getSimpleTag(node);
    const key = `${popupType}_${tag}`;
    const current = (_a = this.state.popupChildCounter.get(key)) != null ? _a : 0;
    this.state.popupChildCounter.set(key, current + 1);
    const popupPrefix = config.popupPrefixMap[popupType] || `${popupType}_`;
    const testId = `${config.runtimePagePrefix}${popupPrefix}${tag}_${current}`;
    node.setAttribute("data-testid", testId);
  }
  // ==========================================================
  // 辅助方法
  // ==========================================================
  /**
   * 检测元素是否在 #app 容器内
   */
  isInsideApp(node) {
    const app = document.getElementById("app");
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
  getSimpleTag(node) {
    let tag = node.tagName.toLowerCase();
    if (this.tagPrefixPattern) {
      tag = tag.replace(this.tagPrefixPattern, "");
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
  isInteractive(node) {
    const tag = node.tagName.toLowerCase();
    if (this.interactiveTags.includes(tag)) return true;
    if (node.hasAttribute("onclick")) return true;
    const role = node.getAttribute("role");
    if (role === "button" || role === "checkbox" || role === "radio" || role === "switch") {
      return true;
    }
    if (node.hasAttribute("tabindex")) return true;
    const classStr = node.className;
    if (typeof classStr === "string") {
      if (/\bant-(?:menu-item|menu-submenu|dropdown-menu-item|select-item|tabs-tab|picker-cell|breadcrumb-link)\b/.test(classStr)) {
        return true;
      }
      if (/\bel-(?:menu-item|dropdown-menu__item|select-dropdown__item|tabs__item)\b/.test(classStr)) {
        return true;
      }
    }
    return false;
  }
  /**
   * 检查是否应跳过 (ignoreTags / ignoreClass)
   */
  shouldIgnore(node, config) {
    const tag = node.tagName.toLowerCase();
    if (config.ignoreTags.includes(tag)) return true;
    const classStr = node.className;
    if (typeof classStr === "string") {
      for (const cls of config.ignoreClass) {
        if (classStr.split(/\s+/).includes(cls)) return true;
      }
    }
    return false;
  }
};

// src/utils/testIdChecker.ts
var GROUP_LABELS = {
  custom: "[\u4E1A\u52A1\u624B\u52A8 ID]",
  static: "[\u7F16\u8BD1\u9759\u6001 ID]",
  dynamic: "[\u9875\u9762\u52A8\u6001 ID]",
  modal: "[Modal \u6D6E\u5C42]",
  drawer: "[Drawer \u6D6E\u5C42]",
  select: "[Select \u6D6E\u5C42]",
  datePicker: "[DatePicker \u6D6E\u5C42]",
  popconfirm: "[Popconfirm \u6D6E\u5C42]",
  popover: "[Popover \u6D6E\u5C42]",
  dropdown: "[Dropdown \u6D6E\u5C42]",
  tooltip: "[Tooltip \u6D6E\u5C42]",
  message: "[Message \u6D6E\u5C42]",
  submenu: "[SubMenu \u6D6E\u5C42]"
};
var GROUP_SUGGESTIONS = {
  custom: "\u4E1A\u52A1\u4EE3\u7801\u4E2D\u5B58\u5728\u624B\u5199\u56FA\u5B9A\u91CD\u590D data-testid\uFF0C\u8BF7\u68C0\u67E5\u76F8\u5173\u6A21\u677F\u4EE3\u7801",
  static: "\u951A\u70B9\u5C40\u90E8\u8BA1\u6570\u5668\u5F02\u5E38\u6216\u9875\u9762\u7F16\u8BD1\u671F testid \u51B2\u7A81\uFF0C\u68C0\u67E5\u951A\u70B9\u67E5\u627E\u903B\u8F91",
  dynamic: "\u9875\u9762\u52A8\u6001\u8282\u70B9\u5144\u5F1F\u7D22\u5F15\u8BA1\u7B97\u903B\u8F91\u7F3A\u9677\uFF0C\u68C0\u67E5 dynamicCounter \u91CD\u7F6E\u903B\u8F91",
  modal: "Modal \u72EC\u7ACB\u8BA1\u6570\u5668\u81EA\u589E\u903B\u8F91\u5931\u6548\uFF0C\u68C0\u67E5 getNextPopupId \u8C03\u7528",
  drawer: "Drawer \u72EC\u7ACB\u8BA1\u6570\u5668\u81EA\u589E\u903B\u8F91\u5931\u6548",
  select: "Select \u72EC\u7ACB\u8BA1\u6570\u5668\u81EA\u589E\u903B\u8F91\u5931\u6548",
  datePicker: "DatePicker \u72EC\u7ACB\u8BA1\u6570\u5668\u81EA\u589E\u903B\u8F91\u5931\u6548",
  popconfirm: "Popconfirm \u72EC\u7ACB\u8BA1\u6570\u5668\u81EA\u589E\u903B\u8F91\u5931\u6548",
  popover: "Popover \u72EC\u7ACB\u8BA1\u6570\u5668\u81EA\u589E\u903B\u8F91\u5931\u6548",
  dropdown: "Dropdown \u72EC\u7ACB\u8BA1\u6570\u5668\u81EA\u589E\u903B\u8F91\u5931\u6548",
  tooltip: "Tooltip \u72EC\u7ACB\u8BA1\u6570\u5668\u81EA\u589E\u903B\u8F91\u5931\u6548",
  message: "Message \u72EC\u7ACB\u8BA1\u6570\u5668\u81EA\u589E\u903B\u8F91\u5931\u6548",
  submenu: "SubMenu \u72EC\u7ACB\u8BA1\u6570\u5668\u81EA\u589E\u903B\u8F91\u5931\u6548"
};
var TestIdChecker = class {
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
  static check() {
    const allElements = document.querySelectorAll("[data-testid]");
    const groupMap = /* @__PURE__ */ new Map();
    allElements.forEach((el) => {
      const testId = el.getAttribute("data-testid");
      const group = this.classifyTestId(testId);
      if (!groupMap.has(group)) {
        groupMap.set(group, /* @__PURE__ */ new Map());
      }
      const idMap = groupMap.get(group);
      if (!idMap.has(testId)) {
        idMap.set(testId, []);
      }
      idMap.get(testId).push(el);
    });
    let hasDuplicate = false;
    groupMap.forEach((idMap, group) => {
      const duplicates = [];
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
  static getStats() {
    const allElements = document.querySelectorAll("[data-testid]");
    const groupMap = /* @__PURE__ */ new Map();
    allElements.forEach((el) => {
      const testId = el.getAttribute("data-testid");
      const group = this.classifyTestId(testId);
      if (!groupMap.has(group)) {
        groupMap.set(group, /* @__PURE__ */ new Map());
      }
      const idMap = groupMap.get(group);
      if (!idMap.has(testId)) {
        idMap.set(testId, []);
      }
      idMap.get(testId).push(el);
    });
    const stats = [];
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
  static classifyTestId(testId) {
    if (!testId.includes("_")) return "custom";
    const firstUnderscore = testId.indexOf("_");
    const prefix = testId.substring(0, firstUnderscore + 1);
    if (prefix === "static_") return "static";
    if (prefix === "dynamic_") return "dynamic";
    const popupTypes = [
      "modal",
      "drawer",
      "select",
      "datePicker",
      "popconfirm",
      "popover",
      "dropdown",
      "tooltip",
      "message",
      "submenu"
    ];
    for (const type of popupTypes) {
      if (prefix === `${type}_`) return type;
    }
    return "custom";
  }
  /**
   * 控制台告警输出 (按分组格式化)
   */
  static reportGroupDuplicates(group, duplicates) {
    const groupLabel = GROUP_LABELS[group] || group;
    const suggestion = GROUP_SUGGESTIONS[group] || "\u672A\u77E5\u539F\u56E0\uFF0C\u8BF7\u8054\u7CFB\u5F00\u53D1\u6392\u67E5";
    console.group(
      `%c[testid-checker] %c${groupLabel} %c\u68C0\u6D4B\u5230 ${duplicates.length} \u4E2A\u91CD\u590D ID`,
      "color: #ff6b6b; font-weight: bold;",
      "color: #ffa500;",
      "color: #999;"
    );
    duplicates.forEach((d) => {
      console.log(
        `%c  \u2717 ${d.testId} %c(\u51FA\u73B0 ${d.count} \u6B21)`,
        "color: #ff6b6b;",
        "color: #999;"
      );
      d.elements.forEach((el) => {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : "";
        const cls = typeof el.className === "string" ? "." + el.className.split(/\s+/).slice(0, 3).join(".") : "";
        console.log(`    \u2192 <${tag}${id}${cls}>`, el);
      });
    });
    console.log(`%c  \u{1F4A1} \u5EFA\u8BAE: ${suggestion}`, "color: #4ecdc4;");
    console.groupEnd();
  }
};

// src/utils/testIdVuePlugin.ts
var WATCHED_ATTRS = ["data-testid", "data-test-base-key"];
var TestIdVuePlugin = {
  install(app) {
    app.mixin({
      mounted() {
        const el = this.$el;
        if (!el) return;
        const attrs = this.$attrs || {};
        if (!attrs || typeof attrs !== "object") return;
        for (const attr of WATCHED_ATTRS) {
          const value = attrs[attr];
          if (value != null && !el.hasAttribute(attr)) {
            el.setAttribute(attr, String(value));
          }
        }
      }
    });
  }
};

// src/utils/testIdVue2Plugin.ts
var WATCHED_ATTRS2 = ["data-testid", "data-test-base-key"];
var TestIdVue2Plugin = {
  install(_Vue) {
    _Vue.mixin({
      mounted() {
        const el = this.$el;
        if (!el) return;
        const attrs = this.$attrs || {};
        if (!attrs || typeof attrs !== "object") return;
        for (const attr of WATCHED_ATTRS2) {
          const value = attrs[attr];
          if (value != null && !el.hasAttribute(attr)) {
            el.setAttribute(attr, String(value));
          }
        }
      }
    });
  }
};
export {
  TestIdChecker,
  TestIdObserver,
  TestIdVue2Plugin,
  TestIdVuePlugin,
  antdAdapter,
  buildAnchorTestId,
  buildPopupTestId,
  defaultConfig,
  elementAdapter,
  getAnchorCounterMap,
  getConfig,
  getNextAnchorLocalIndex,
  getNextPopupId,
  getPopupCounterSnapshot,
  initConfig,
  mergeConfig,
  parseBaseKey,
  resetAllAnchorCounters,
  resetAllPopupCounters,
  resetPopupCounter
};
