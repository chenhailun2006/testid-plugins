/**
 * webpack-plugin-auto-testid — Webpack 编译期打标 Loader 入口
 *
 * 功能:
 *   - 拦截 .vue 文件，对 <template> 部分注入 data-testid
 *   - 页面组件 (/views/**) → 直接注入完整 static_xxx data-testid
 *   - 公共组件 (/components/**, /common/**) → 仅注入 data-test-base-key
 *   - 仅开发模式 (NODE_ENV !== 'production') 生效
 *
 * 使用方式 (webpack.config.js):
 *   module: {
 *     rules: [{
 *       test: /\.vue$/,
 *       enforce: 'pre',   // 在 vue-loader 之前执行
 *       use: [{
 *         loader: '@testid/webpack-plugin-auto-testid',
 *         options: {
 *           viewPatterns: ['/views/'],
 *           commonPatterns: ['/components/', '/common/'],
 *           globalPrefix: 'hall',   // 可选全局前缀
 *         }
 *       }]
 *     }]
 *   }
 *
 * 与 vite-plugin-auto-testid 功能完全对齐，
 * 共享相同的 transform.ts + types.ts 核心逻辑。
 */

import { parse as parseSFC } from '@vue/compiler-sfc';
import { transformTemplate } from './transform';
import type { AutoTestIdPluginOptions } from './types';
import { DEFAULT_IGNORE_TAGS, DEFAULT_IGNORE_CLASS } from './types';

export type { AutoTestIdPluginOptions, TransformContext, TransformResult } from './types';

/**
 * Webpack Loader 上下文类型
 *
 * Webpack 5 loader 通过 this 暴露上下文 API：
 *   - this.resourcePath: 当前处理的文件路径
 *   - this.getOptions(): 获取 loader options
 *   - this.callback(err, result): 异步返回结果
 */
interface WebpackLoaderContext {
  resourcePath: string;
  getOptions: () => AutoTestIdPluginOptions;
  callback: (err: Error | null, content?: string, sourceMap?: any) => void;
}

/**
 * Webpack Loader 主函数
 *
 * 拦截 .vue 文件，解析 SFC 并对 <template> 注入 testid。
 * 若模板无变化则原样返回，避免破坏 source map 和缓存。
 *
 * @param source - Vue SFC 源代码
 * @returns 转换后的 Vue SFC 源代码
 */
function loader(this: WebpackLoaderContext, source: string): string {
  const callback = this.callback;

  // ── 生产构建不做任何处理 ──
  if (process.env.NODE_ENV === 'production') {
    return source;
  }

  const id = this.resourcePath;

  // ── 仅处理 .vue 文件 ──
  if (!id.endsWith('.vue')) {
    return source;
  }

  const options = this.getOptions() || {};
  const {
    viewPatterns = ['/views/'],
    commonPatterns = ['/components/', '/common/'],
    globalPrefix,
    compilePrefix: rawCompilePrefix = 'static_',
    ignoreTags = DEFAULT_IGNORE_TAGS,
    ignoreClass = DEFAULT_IGNORE_CLASS,
    onlyInteractive = true,
  } = options;

  // 全局前缀拼接
  const compilePrefix = globalPrefix
    ? `${globalPrefix}_${rawCompilePrefix}`
    : rawCompilePrefix;

  // ── 判断文件类型 ──
  const isView = viewPatterns.some((p) => id.includes(p));
  const isCommon = commonPatterns.some((p) => id.includes(p));

  if (!isView && !isCommon) {
    return source;
  }

  try {
    // ── 解析 SFC ──
    const { descriptor, errors } = parseSFC(source, {
      filename: id,
    });

    if (errors.length > 0) {
      console.warn(
        `[webpack-plugin-auto-testid] SFC parse warnings: ${id}`,
        errors
      );
    }

    if (!descriptor.template) {
      return source;
    }

    // ── 转换模板 ──
    const result = transformTemplate(descriptor.template.content, {
      isViewComponent: isView,
      compilePrefix,
      filename: id,
      ignoreTags,
      ignoreClass,
      onlyInteractive,
    });

    if (!result || result.code === descriptor.template.content) {
      return source; // 无变化，原样返回
    }

    // ── 替换模板内容 ──
    const templateStart = descriptor.template.loc.start.offset;
    const templateEnd = descriptor.template.loc.end.offset;

    const newCode =
      source.slice(0, templateStart) +
      result.code +
      source.slice(templateEnd);

    callback(null, newCode);
    return newCode;
  } catch (e) {
    // 解析失败不阻塞构建
    console.warn(
      `[webpack-plugin-auto-testid] 模板解析失败: ${id}`,
      e instanceof Error ? e.message : e
    );
    return source;
  }
}

export default loader;
