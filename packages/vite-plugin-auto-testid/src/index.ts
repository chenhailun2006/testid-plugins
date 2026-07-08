/**
 * vite-plugin-auto-testid — Vite 编译期打标插件入口
 *
 * 功能:
 *   - 拦截 .vue 文件 transform
 *   - 页面组件 (/views/**) → 直接注入完整 static_xxx data-testid
 *   - 公共组件 (/components/**, /common/**) → 仅注入 data-test-base-key
 *   - 仅 vite dev 模式生效，vite build 不做任何处理
 */

import type { Plugin } from 'vite';
import { parse as parseSFC } from '@vue/compiler-sfc';
import { transformTemplate } from './transform';
import type { AutoTestIdPluginOptions } from './types';
import { DEFAULT_IGNORE_TAGS, DEFAULT_IGNORE_CLASS } from './types';

export type { AutoTestIdPluginOptions, TransformContext, TransformResult } from './types';

/**
 * 默认导出：创建 Vite 插件实例
 */
export default function vitePluginAutoTestId(
  options: AutoTestIdPluginOptions = {}
): Plugin {
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
  const compilePrefix = globalPrefix ? `${globalPrefix}_${rawCompilePrefix}` : rawCompilePrefix;

  return {
    name: 'vite-plugin-auto-testid',
    enforce: 'pre', // 在其他 Vue 插件之前执行，尽早处理模板

    /**
     * transform 钩子: 拦截 .vue 文件，对其 <template> 部分注入 testid
     */
    transform(code: string, id: string) {
      // ── 生产构建不做任何处理 ──
      if (process.env.NODE_ENV === 'production') return null;

      // ── 仅处理 .vue 文件 ──
      if (!id.endsWith('.vue')) return null;

      // ── 判断文件类型 ──
      const isView = viewPatterns.some((p) => id.includes(p));
      const isCommon = commonPatterns.some((p) => id.includes(p));

      if (!isView && !isCommon) return null;

      try {
        // ── 解析 SFC ──
        const { descriptor, errors } = parseSFC(code, {
          filename: id,
        });

        if (errors.length > 0) {
          console.warn(`[vite-plugin-auto-testid] SFC parse warnings: ${id}`, errors);
        }

        if (!descriptor.template) return null;

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
          return null; // 无变化则不触发 HMR
        }

        // ── 替换模板内容 ──
        const templateStart = descriptor.template.loc.start.offset;
        const templateEnd = descriptor.template.loc.end.offset;

        const newCode =
          code.slice(0, templateStart) +
          result.code +
          code.slice(templateEnd);

        return {
          code: newCode,
          map: result.map || null,
        };
      } catch (e) {
        // 解析失败不阻塞构建
        console.warn(
          `[vite-plugin-auto-testid] 模板解析失败: ${id}`,
          e instanceof Error ? e.message : e
        );
        return null;
      }
    },
  };
}

/**
 * 命名导出: 供按需引用
 */
export { vitePluginAutoTestId };
