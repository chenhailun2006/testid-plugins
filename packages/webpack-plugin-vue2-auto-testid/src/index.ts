/**
 * webpack-plugin-vue2-auto-testid — Vue 2 Webpack 编译期打标 Loader 入口
 *
 * 功能:
 *   - 拦截 .vue 文件，对 <template> 部分注入 data-testid
 *   - 页面组件 (/views/**) → 直接注入完整 static_xxx data-testid
 *   - 公共组件 (/components/**, /common/**) → 仅注入 data-test-base-key
 *   - 仅开发模式 (NODE_ENV !== 'production') 生效
 *
 * 使用 vue-template-compiler (Vue 2) 解析 SFC 和模板 AST，
 * 是 vite-plugin-auto-testid 在 Vue 2 + Webpack 技术栈的对等实现。
 *
 * 使用方式 (vue.config.js):
 *   module.exports = {
 *     chainWebpack: (config) => {
 *       config.module
 *         .rule('vue2-testid')
 *         .test(/\.vue$/)
 *         .enforce('pre')
 *         .use('testid-loader')
 *         .loader('@testid/webpack-plugin-vue2-auto-testid')
 *         .options({ viewPatterns: ['/views/'], ... });
 *     }
 *   };
 */

import { createRequire } from 'module';
import { transformTemplate } from './transform';
import type { AutoTestIdPluginOptions } from './types';
import { DEFAULT_IGNORE_TAGS, DEFAULT_IGNORE_CLASS } from './types';

export type { AutoTestIdPluginOptions, TransformContext, TransformResult } from './types';

// ============================================================
// vue-template-compiler 类型声明
// ============================================================

/**
 * SFC 解析结果 (vue-template-compiler 的 parseComponent 返回值)
 */
interface SFCDescriptor {
  template: { content: string; start: number; end: number } | null;
  script: { content: string; start: number; end: number } | null;
  styles: { content: string; start: number; end: number }[];
}

/**
 * vue-template-compiler 模块接口
 */
interface Vue2Compiler {
  parseComponent(source: string): SFCDescriptor;
  compile(
    template: string,
    options: { outputSourceRange: boolean }
  ): { ast: any; render: string; staticRenderFns: string[]; errors: any[]; tips: any[] };
}

// ============================================================
// Webpack Loader 类型
// ============================================================

interface WebpackLoaderContext {
  resourcePath: string;
  getOptions: () => AutoTestIdPluginOptions;
  callback: (err: Error | null, content?: string, sourceMap?: any) => void;
}

// ============================================================
// Loader 主函数
// ============================================================

/**
 * Webpack Loader 入口
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

  // ── 加载 vue-template-compiler (peer dependency) ──
  // 解决 pnpm workspace 中 symlink 导致 vue-template-compiler 内部
  // require('vue') 解析到 hoisted vue@3 而非项目安装的 vue@2 的问题
  let compiler: Vue2Compiler;
  try {
    compiler = require('vue-template-compiler');
  } catch (err: any) {
    if (err?.message?.includes('version mismatch')) {
      // pnpm workspace: Module._resolveFilename 拦截 vue 解析，重定向到 vue@2
      const Module = require('module');
      const projectRoot = (this as any).rootContext || process.cwd();
      const projectRequire = createRequire(projectRoot + '/package.json');

      // 找到项目依赖树中正确的 vue@2 路径
      let vue2Path: string;
      try {
        vue2Path = projectRequire.resolve('vue');
      } catch {
        console.warn(
          '[webpack-plugin-vue2-auto-testid] 项目中未安装 vue，' +
          '请确保已安装与 vue-template-compiler 版本匹配的 vue'
        );
        return source;
      }

      // 临时拦截 Module._resolveFilename，将 'vue' 重定向到 vue@2
      // 直接调用静态方法 (不用 .call)，避免 this 上下文问题
      type ResolveFilenameFn = (request: string, parent: any, isMain: boolean, options?: any) => string;
      const originalResolveFilename = Module._resolveFilename.bind(Module);

      Module._resolveFilename = function (request: string, parent: any, ...rest: any[]) {
        if (request === 'vue') {
          return vue2Path;
        }
        return (originalResolveFilename as Function)(request, parent, ...rest);
      } as any;

      try {
        compiler = projectRequire('vue-template-compiler');
      } finally {
        Module._resolveFilename = originalResolveFilename;
      }
    } else {
      console.warn(
        '[webpack-plugin-vue2-auto-testid] 未找到 vue-template-compiler，' +
        '请确保项目中已安装与 Vue 版本匹配的 vue-template-compiler:',
        err?.message || err
      );
      return source;
    }
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
    // ── 用 vue-template-compiler 解析 SFC ──
    const sfc = compiler.parseComponent(source);

    if (!sfc.template) {
      return source; // 无模板 (如纯 render 函数组件)
    }

    // ── 转换模板 ──
    const result = transformTemplate(
      sfc.template.content,
      {
        isViewComponent: isView,
        compilePrefix,
        filename: id,
        ignoreTags,
        ignoreClass,
        onlyInteractive,
      },
      compiler
    );

    if (!result || result.code === sfc.template.content) {
      return source; // 无变化，原样返回
    }

    // ── 替换模板内容 ──
    const newCode =
      source.slice(0, sfc.template.start) +
      result.code +
      source.slice(sfc.template.end);

    callback(null, newCode);
    return newCode;
  } catch (e) {
    // 解析失败不阻塞构建
    console.warn(
      `[webpack-plugin-vue2-auto-testid] 模板解析失败: ${id}`,
      e instanceof Error ? e.message : e
    );
    return source;
  }
}

export default loader;
