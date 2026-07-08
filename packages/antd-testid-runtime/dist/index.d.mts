/**
 * 全局配置模块 — testMark.ts
 *
 * 管理所有打标相关的配置项：
 * - 前缀 (compile / runtime / popup)
 * - 黑白名单
 * - 开关
 * - 浮层前缀映射
 */
/**
 * 支持的浮层类型
 */
type PopupType = 'modal' | 'drawer' | 'select' | 'datePicker' | 'popconfirm' | 'dropdown' | 'tooltip';
/**
 * 全量配置接口
 */
interface TestIdMarkConfig {
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
    /** Antd 浮层组件专属前缀映射 */
    popupPrefixMap: Record<PopupType, string>;
    /**
     * Ant Design Vue CSS 类名前缀 (对应 ConfigProvider 的 prefixCls)
     *
     * 支持数组，可同时匹配多个前缀体系:
     *   默认: ['ant'] → 匹配 .ant-modal, .ant-picker-dropdown 等
     *   若项目使用 <a-config-provider prefixCls="my-ui"> 则设为 ['my-ui']
     *   混合使用: ['ant', 'my-ui'] → 同时匹配两个体系的所有浮层组件
     */
    antdClassPrefix: string[];
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
/**
 * 交互控件白名单 (onlyInteractive === true 时生效)
 */
declare const INTERACTIVE_TAGS: Set<string>;
/**
 * 默认配置对象 (enable 默认为 true，由调用方传入 DEV 判断)
 */
declare const defaultConfig: TestIdMarkConfig;
/**
 * 合并用户自定义配置与默认配置
 * 采用浅合并策略，popupPrefixMap 支持部分覆盖
 *
 * 关键: 若设置了 globalPrefix，自动拼接到所有前缀字段
 */
declare function mergeConfig(userConfig?: Partial<TestIdMarkConfig>): TestIdMarkConfig;
/**
 * 初始化全局配置 (应用启动时调用)
 */
declare function initConfig(custom?: Partial<TestIdMarkConfig>): void;
/**
 * 获取当前全局配置 (只读)
 */
declare function getConfig(): Readonly<TestIdMarkConfig>;

/**
 * 锚点局部计数器 — testIdAnchorCounter.ts
 *
 * 解决公共组件多实例 ID 重复问题。
 *
 * 核心思路：
 *   不依赖全局挂载顺序（会因异步渲染而变化），
 *   而是依赖"父模板结构"来定位 ——
 *   向上查找最近带 data-testid 的祖先元素作为"锚点"，
 *   在锚点下按 (组件名, 标签名) 维度维护局部计数器。
 *
 * 数据结构:
 *   Map<`${anchorTestId}__${componentName}__${tagName}`, counter>
 *
 * 示例:
 *   "static_page_dashboard_tag_div_3__BaseSearch__button" → 0
 *   "static_page_dashboard_tag_div_3__BaseSearch__button" → 1 (第 2 次出现)
 *   "static_page_dashboard_tag_div_7__BaseSearch__button" → 0 (不同锚点, 独立计数)
 */
/**
 * 获取锚点下某组件某标签的下一个局部索引 (自增)
 *
 * @param anchorTestId - 锚点 testid (findAnchor 返回)
 * @param componentName - 组件名称 (从 base-key 解析)
 * @param tagName - 标签名 (从 base-key 解析)
 * @returns 局部索引 (从 0 开始)
 */
declare function getNextAnchorLocalIndex(anchorTestId: string, componentName: string, tagName: string): number;
/**
 * 重置所有锚点计数器 (路由切换时调用)
 */
declare function resetAllAnchorCounters(): void;
/**
 * 获取当前锚点计数器映射（仅用于调试）
 */
declare function getAnchorCounterMap(): ReadonlyMap<string, number>;
/**
 * base-key 解析结果
 */
interface ParsedBaseKey {
    componentName: string;
    tagName: string;
    templateIndex: string;
}
/**
 * 从 base-key 中解析组件名和标签名
 *
 * base-key 格式: common_comp_{componentName}_tag_{tagName}_{templateIndex}
 *
 * @param baseKey - base-key 字符串
 * @returns 解析结果或 null (格式不匹配)
 */
declare function parseBaseKey(baseKey: string): ParsedBaseKey | null;
/**
 * 拼接最终 testid
 *
 * 格式: ${anchorTestId}__${componentName}_${tagName}_${localIndex}
 *
 * 示例:
 *   anchorTestId  = "static_page_dashboard_tag_div_3"
 *   componentName = "BaseSearch"
 *   tagName       = "button"
 *   localIndex    = 0
 *   返回: "static_page_dashboard_tag_div_3__BaseSearch_button_0"
 *
 * @param anchorTestId - 锚点 testid
 * @param componentName - 组件名
 * @param tagName - 标签名
 * @param localIndex - 局部索引 (从 getNextAnchorLocalIndex 获取)
 */
declare function buildAnchorTestId(anchorTestId: string, componentName: string, tagName: string, localIndex: number): string;

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

/**
 * 获取某类型浮层的下一个 ID (自增)
 *
 * @param type - 浮层类型
 * @returns 计数器值 (使用前，从 0 开始)
 */
declare function getNextPopupId(type: PopupType): number;
/**
 * 重置所有浮层计数器
 */
declare function resetAllPopupCounters(): void;
/**
 * 重置指定类型浮层计数器
 */
declare function resetPopupCounter(type: PopupType): void;
/**
 * 获取所有计数器快照 (调试用)
 */
declare function getPopupCounterSnapshot(): Record<PopupType, number>;
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
declare function buildPopupTestId(type: PopupType, tag: string, counterId: number): string;

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
declare class TestIdObserver {
    private state;
    /** 浮层 class 匹配映射 (根据 antdClassPrefix 动态构建) */
    private popupClassMap;
    constructor();
    /**
     * 启动 MutationObserver
     */
    start(): void;
    /**
     * 停止 Observer
     */
    stop(): void;
    /**
     * 更新当前路由 (路由切换时调用)
     */
    setRoute(routeName: string): void;
    /**
     * 重置浮层子节点计数器 (路由切换时调用)
     */
    resetPopupChildCounter(): void;
    /**
     * 全量扫描当前 DOM (用于启动时兜底, 处理 Observer 启动前已渲染的节点)
     */
    fullScan(): void;
    /**
     * MutationObserver 回调 (箭头函数绑定 this)
     */
    private handleMutations;
    /**
     * 递归处理元素节点及其子节点
     */
    private processNodeRecursive;
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
    private processSingleNode;
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
    private handleBaseKeyNode;
    /**
     * 向上遍历 DOM 树，找到第一个带 data-testid 属性的祖先元素作为锚点
     *
     * 如果一直找到 #app / body 都没有，返回 "__root" 作为兜底
     */
    private findAnchor;
    /**
     * 处理 Antd 浮层根节点
     *
     * @param node - 浮层根节点元素
     * @param type - 浮层类型
     */
    private handlePopupNode;
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
    private detectPopupType;
    /**
     * 向上遍历 DOM，检测节点是否在某个浮层内部
     *
     * 查找最近的匹配 POPUP_CLASS_MAP 的祖先元素 (不要求它本身是 body 直系，
     * 因为 Ant Design Vue 4 可能在浮层根节点外包一层 wrapper DIV)。
     * 找到浮层根节点后，继续向上验证其祖先链能到达 body (确保不在 #app 内)。
     *
     * @returns 浮层类型或 null (不在任何浮层内)
     */
    private detectPopupAncestor;
    /**
     * 验证节点的祖先链是否能到达 document.body
     * (经过若干层 wrapper 后依然是 body 下的浮层)
     */
    private reachesBody;
    /**
     * 检测节点 class 是否匹配某个浮层类型
     *
     * 遍历 popupClassMap 中的所有 class 组合，任一组合全部命中即匹配。
     */
    private matchPopupClass;
    /**
     * 处理页面内动态新增节点 (v-for / 异步 v-if 等)
     *
     * ID 格式: ${runtimePagePrefix}${route}_${tag}_${counter}
     */
    private handleDynamicNode;
    /**
     * 处理浮层内部子节点 (Modal/Drawer/Dropdown 内的按钮、输入框等)
     *
     * ID 格式: ${runtimePagePrefix}${popupPrefix}${tag}_${counter}
     * 例: hall_dynamic_modal_button_0, hall_dynamic_select_div_2
     *
     * 浮层子元素均为运行时注入，统一使用 runtimePagePrefix 前缀。
     */
    private handlePopupChildNode;
    /**
     * 检测元素是否在 #app 容器内
     */
    private isInsideApp;
    /**
     * 获取元素的简化标签名
     *
     * 处理 Antd 组件前缀: a-button → button, a-input → input
     */
    private getSimpleTag;
    /**
     * 判断是否可交互元素
     *
     * 可交互特征:
     *   - 交互类标签: button, input, select, textarea
     *   - onclick 属性
     *   - role="button" / role="checkbox" / role="radio"
     *   - cursor:pointer (不检测，因为可能从 CSS 继承，误判率高)
     */
    private isInteractive;
    /**
     * 检查是否应跳过 (ignoreTags / ignoreClass)
     */
    private shouldIgnore;
}

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

/**
 * 检测分组维度
 */
type CheckGroup = 'custom' | 'static' | 'dynamic' | PopupType;
declare class TestIdChecker {
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
    static check(): boolean;
    /**
     * 执行检测并返回统计摘要 (不输出控制台)
     */
    static getStats(): {
        group: CheckGroup;
        total: number;
        unique: number;
        duplicates: number;
    }[];
    /**
     * 按 testid 前缀分类
     */
    private static classifyTestId;
    /**
     * 控制台告警输出 (按分组格式化)
     */
    private static reportGroupDuplicates;
}

export { INTERACTIVE_TAGS, type ParsedBaseKey, type PopupType, TestIdChecker, type TestIdMarkConfig, TestIdObserver, buildAnchorTestId, buildPopupTestId, defaultConfig, getAnchorCounterMap, getConfig, getNextAnchorLocalIndex, getNextPopupId, getPopupCounterSnapshot, initConfig, mergeConfig, parseBaseKey, resetAllAnchorCounters, resetAllPopupCounters, resetPopupCounter };
