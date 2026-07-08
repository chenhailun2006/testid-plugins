import { Plugin } from 'vite';

/**
 * vite-plugin-auto-testid 类型定义
 */
/**
 * 插件配置选项
 */
interface AutoTestIdPluginOptions {
    /**
     * 全局前缀，会拼接到所有 testid 前缀之前
     * 例: globalPrefix = "hall" → 实际前缀为 hall_static_、hall_dynamic_
     * 默认: 空 (不添加)
     */
    globalPrefix?: string;
    /**
     * 页面视图组件所在目录匹配模式
     * 匹配文件路径中包含这些字符串的 .vue 文件
     * 默认：['/views/']
     */
    viewPatterns?: string[];
    /**
     * 公共复用组件所在目录匹配模式
     * 默认：['/components/', '/common/']
     */
    commonPatterns?: string[];
    /**
     * 编译期静态节点统一前缀
     * 默认：'static_'
     */
    compilePrefix?: string;
    /**
     * 忽略不打标的 HTML 标签名
     * 默认：['script', 'style', 'svg', 'br', 'iframe']
     */
    ignoreTags?: string[];
    /**
     * 包含此 class 的 DOM 跳过打标
     * 默认：['no-test-mark', 'hidden']
     */
    ignoreClass?: string[];
    /**
     * 是否仅给可交互控件打标
     * 默认：true
     */
    onlyInteractive?: boolean;
}
/**
 * 模板转换上下文
 */
interface TransformContext {
    /** 是否页面视图组件 */
    isViewComponent: boolean;
    /** 编译前缀 */
    compilePrefix: string;
    /** 当前文件路径 */
    filename: string;
    /** 当前组件内全局计数器 */
    counter: number;
    /** 已使用的 ID (防冲突) */
    usedIds: Set<string>;
    /** 忽略标签列表 */
    ignoreTags: string[];
    /** 忽略 class 列表 */
    ignoreClass: string[];
    /** 仅交互控件 */
    onlyInteractive: boolean;
}
/**
 * 转换结果
 */
interface TransformResult {
    /** 转换后的模板代码 */
    code: string;
    /** source map (可选) */
    map?: any;
}

/**
 * vite-plugin-auto-testid — Vite 编译期打标插件入口
 *
 * 功能:
 *   - 拦截 .vue 文件 transform
 *   - 页面组件 (/views/**) → 直接注入完整 static_xxx data-testid
 *   - 公共组件 (/components/**, /common/**) → 仅注入 data-test-base-key
 *   - 仅 vite dev 模式生效，vite build 不做任何处理
 */

/**
 * 默认导出：创建 Vite 插件实例
 */
declare function vitePluginAutoTestId(options?: AutoTestIdPluginOptions): Plugin;

export { type AutoTestIdPluginOptions, type TransformContext, type TransformResult, vitePluginAutoTestId as default, vitePluginAutoTestId };
