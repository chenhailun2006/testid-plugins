/**
 * 模板 AST 转换核心逻辑 (Vue 2 版)
 *
 * 负责解析 Vue 2 SFC 模板，为 DOM 节点注入 data-testid 或 data-test-base-key。
 *
 * ┌─ 页面组件 (/views/**) → 直接注入完整 static_xxx data-testid
 * └─ 公共组件 (/components/**, /common/**) → 仅注入 data-test-base-key
 *
 * 与 vite-plugin-auto-testid (Vue 3) 共享相同的计数器架构和 ID 格式，
 * 但 AST 操作基于 vue-template-compiler（Vue 2）的 AST 结构。
 */

import MagicString from 'magic-string';
import type { TransformContext, TransformResult } from './types';
import { INTERACTIVE_TAGS, DEFAULT_IGNORE_TAGS, DEFAULT_IGNORE_CLASS } from './types';

// ============================================================
// Vue 2 AST 节点类型定义
// ============================================================

/**
 * Vue 2 模板 AST 元素节点 (vue-template-compiler 编译产物)
 *
 * vue-template-compiler 没有 TypeScript 类型声明，
 * 此处仅定义本插件实际用到的字段。
 */
interface ASTElement {
  type: 1;
  tag: string;
  attrsList: { name: string; value: string }[];
  attrsMap: Record<string, string>;
  children: ASTNode[];

  // v-for
  for?: string;
  alias?: string;
  iterator1?: string;
  forProcessed?: boolean;

  // v-if / v-else-if / v-else
  if?: string;
  ifConditions?: { exp: string | undefined; block: ASTElement }[];
  else?: true;
  elseif?: string;

  // :key
  key?: string;

  // 事件绑定
  events?: Record<string, { value: string; modifiers?: Record<string, boolean> }>;
  nativeEvents?: Record<string, { value: string; modifiers?: Record<string, boolean> }>;

  // 动态绑定属性 (v-bind)
  attrs?: { name: string; value: string; dynamic?: boolean }[];
  hasBindings?: boolean;

  // class
  staticClass?: string;
  classBinding?: string;

  // 源码位置 (需 compile(outputSourceRange: true))
  start?: number;
  end?: number;
  // vue-template-compiler 的 loc 属性
  rawAttrsMap?: Record<string, { name: string; value: string; start: number; end: number }>;
}

/** Vue 2 模板 AST 节点类型联合 */
type ASTNode = ASTElement | { type: 2 | 3; text?: string; expression?: string };

// ============================================================
// 属性名常量
// ============================================================

const ATTR_TESTID = 'data-testid';

// ============================================================
// 路径提取工具
// ============================================================

/**
 * 从文件路径提取页面名
 * 例: /src/views/login/index.vue → login
 *     /src/views/user/Profile.vue → user_Profile
 */
function extractPageName(filename: string): string {
  const normalized = filename.replace(/\\/g, '/');
  const match = normalized.match(/\/views\/(.+?)(?:\/index)?\.vue$/);
  if (!match) return 'unknown';
  return match[1].replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * 从文件路径提取组件名
 * 例: /src/components/BaseSearch.vue → BaseSearch
 */
function extractCompName(filename: string): string {
  const normalized = filename.replace(/\\/g, '/');
  const name = normalized.split('/').pop()?.replace('.vue', '') || 'unknown';
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

// ============================================================
// ID 生成函数
// ============================================================

/**
 * 生成页面组件 testid
 * 格式: ${prefix}page_${pageName}_comp_${compName}_tag_${tagName}_${index}
 */
function generateViewTestId(ctx: TransformContext, tag: string, index: number): string {
  const pageName = extractPageName(ctx.filename);
  const compName = extractCompName(ctx.filename);
  return `${ctx.compilePrefix}page_${pageName}_comp_${compName}_tag_${tag}_${index}`;
}

/**
 * 生成公共组件 base-key
 * 格式: common_comp_${compName}_tag_${tagName}_${index}
 * 运行时: Observer 通过锚点定位拼接最终 testid
 */
function generateCommonBaseKey(ctx: TransformContext, tag: string, index: number): string {
  const compName = extractCompName(ctx.filename);
  return `common_comp_${compName}_tag_${tag}_${index}`;
}

// ============================================================
// 节点检查工具
// ============================================================

/**
 * 检查节点是否已有手动 data-testid
 */
function hasManualTestId(node: ASTElement): boolean {
  // 检查静态属性
  if (node.attrsMap && node.attrsMap[ATTR_TESTID]) return true;
  // 检查动态绑定 (v-bind:data-testid 或 :data-testid)
  if (node.attrs) {
    return node.attrs.some((a) => a.name === ATTR_TESTID);
  }
  return false;
}

/**
 * 判断节点是否为交互元素
 */
function isInteractiveElement(node: ASTElement): boolean {
  const tag = node.tag.toLowerCase();

  // 白名单
  if (INTERACTIVE_TAGS.has(tag)) return true;

  // 检查事件绑定
  if (node.events) {
    const eventNames = Object.keys(node.events);
    if (eventNames.some((name) => ['click', 'input', 'change', 'submit', 'keydown', 'keyup'].includes(name))) {
      return true;
    }
  }

  // 检查原生事件 (.native 修饰符)
  if (node.nativeEvents) {
    const nativeEventNames = Object.keys(node.nativeEvents);
    if (nativeEventNames.some((name) => ['click', 'input', 'change', 'submit', 'keydown', 'keyup'].includes(name))) {
      return true;
    }
  }

  return false;
}

/**
 * 检查节点是否包含忽略 class
 */
function hasIgnoreClass(node: ASTElement, ignoreClass: string[]): boolean {
  if (ignoreClass.length === 0) return false;

  const classStr = (node.staticClass || '') + (node.classBinding ? ' ' + node.classBinding : '');
  return ignoreClass.some((cls) => classStr.includes(cls));
}

/**
 * 是否应跳过该节点
 */
function shouldSkipNode(node: ASTElement, ctx: TransformContext): boolean {
  if (hasManualTestId(node)) return true;
  if (ctx.ignoreTags.includes(node.tag.toLowerCase())) return true;
  if (hasIgnoreClass(node, ctx.ignoreClass)) return true;
  if (ctx.onlyInteractive && !isInteractiveElement(node)) return true;
  return false;
}

/**
 * 获取简化标签名 (去掉 UI 库前缀)
 * 例: a-button → button, el-input → input, van-checkbox → checkbox
 */
function getSimpleTag(el: ASTElement): string {
  return el.tag.toLowerCase().replace(/^(a-|el-|van-)/, '');
}

// ============================================================
// v-for 相关
// ============================================================

/**
 * 解析 v-for 指令信息
 *
 * Vue 2 AST 的 v-for 信息存储在元素的直接字段上：
 *   - node.for   : 迭代源表达式 (如 "list")
 *   - node.alias : 循环项别名 (如 "item")
 *   - node.iterator1 : 索引别名 (如 "index" / "i")
 *   - node.key   : :key 的值 (如 "item.id")
 */
function parseVForDirective(
  node: ASTElement
): { hasStableKey: boolean; keyExpr: string | null; indexBinding: string | null } {
  if (!node.for) {
    return { hasStableKey: false, keyExpr: null, indexBinding: null };
  }

  const indexBinding = node.iterator1 || null;

  let hasStableKey = false;
  let keyExpr: string | null = null;

  if (node.key) {
    const keyContent = node.key.trim();
    const indexVar = node.iterator1 || '';
    // 稳定 key: :key="item.id" — 包含 item.xxx 且不依赖 index
    if (keyContent.includes('item.') && !keyContent.includes('index') && !(indexVar && keyContent.includes(indexVar))) {
      hasStableKey = true;
      keyExpr = keyContent;
    }
  }

  return { hasStableKey, keyExpr, indexBinding };
}

// ============================================================
// 核心 AST 遍历与变换
// ============================================================

/**
 * 注入信息
 */
interface InjectInfo {
  node: ASTElement;
  testId: string;
  isBaseKey: boolean;
  isDynamic: boolean; // 是否动态绑定 (:data-testid)
}

/**
 * 递归遍历 AST 节点树，收集需要注入 testid 的节点信息
 */
function collectInjections(
  node: ASTNode,
  ctx: TransformContext,
  result: InjectInfo[],
  parentTestId?: string,
  branchCounter?: { current: number }
): void {
  // 只处理元素节点 (type === 1)
  if (!node || node.type !== 1) {
    return;
  }

  const el = node as ASTElement;

  // ── 跳过 v-else / v-else-if 节点（由 v-if 主节点的 ifConditions 统一处理）──
  if (el.else || el.elseif) {
    return;
  }

  // ============================================================
  // 1. 处理 v-for (优先级最高)
  // ============================================================
  if (el.for && !el.forProcessed) {
    el.forProcessed = true;

    const forTag = getSimpleTag(el);
    const { hasStableKey, keyExpr, indexBinding } = parseVForDirective(el);

    if (hasStableKey && keyExpr) {
      // 情况 A: 有稳定 key — 编译注入动态 :data-testid
      const baseKey = ctx.isViewComponent
        ? generateViewTestId(ctx, forTag, ctx.counter)
        : generateCommonBaseKey(ctx, forTag, ctx.counter);
      ctx.counter++;

      result.push({
        node: el,
        testId: `\`${baseKey}_key_\${${keyExpr}}\``,
        isBaseKey: false, // 动态绑定已含稳定 key，不需运行时转换
        isDynamic: true,
      });
    } else if (indexBinding) {
      // 情况 B: 有 index — 编译注入动态 :data-testid
      const testId = ctx.isViewComponent
        ? generateViewTestId(ctx, forTag, ctx.counter)
        : generateCommonBaseKey(ctx, forTag, ctx.counter);
      ctx.counter++;

      result.push({
        node: el,
        testId: `\`${testId}-\${${indexBinding}}\``,
        isBaseKey: false, // 动态 testid 含 index 后缀，不需运行时转换
        isDynamic: true,
      });
    } else {
      // 情况 C: 无稳定 key — 静态打标，子节点交运行时处理
      const testId = ctx.isViewComponent
        ? generateViewTestId(ctx, forTag, ctx.counter)
        : generateCommonBaseKey(ctx, forTag, ctx.counter);
      ctx.counter++;

      result.push({
        node: el,
        testId,
        isBaseKey: !ctx.isViewComponent,
        isDynamic: false,
      });
    }

    // v-for 子节点交由运行时 MutationObserver 处理，编译期不再递归
    return;
  }

  // ============================================================
  // 2. 跳过不需要打标的节点 (但继续递归子节点)
  // ============================================================
  if (shouldSkipNode(el, ctx)) {
    // 如果节点已有手动 data-testid，可作为子节点的锚点
    const manualId = el.attrsMap ? el.attrsMap[ATTR_TESTID] : undefined;
    const anchorId = manualId || parentTestId;
    if (el.children) {
      el.children.forEach((child) =>
        collectInjections(child, ctx, result, anchorId, branchCounter)
      );
    }
    return;
  }

  // 获取简化标签名
  const tag = getSimpleTag(el);

  // ============================================================
  // 3. 处理 v-if 条件块
  // ============================================================
  if (el.if) {
    // v-if 主节点：外层容器注入 testid，使用独立子计数器
    const containerTestId = ctx.isViewComponent
      ? generateViewTestId(ctx, tag, ctx.counter)
      : generateCommonBaseKey(ctx, tag, ctx.counter);
    ctx.counter++;

    result.push({
      node: el,
      testId: containerTestId,
      isBaseKey: !ctx.isViewComponent,
      isDynamic: false,
    });

    // 遍历所有 v-if / v-else-if / v-else 分支
    // ifConditions[0] = v-if, ifConditions[1] = v-else-if, ifConditions[2] = v-else
    if (el.ifConditions) {
      for (const condition of el.ifConditions) {
        const subCounter = { current: 0 };
        const branch = condition.block;
        if (branch && branch.children) {
          branch.children.forEach((child) =>
            collectInjections(child, ctx, result, containerTestId, subCounter)
          );
        }
      }
    }
    return;
  }

  // ============================================================
  // 4. 普通元素节点
  // ============================================================
  let testId: string;

  let isBaseKey: boolean;

  if (branchCounter && parentTestId) {
    // 处于 v-if / v-show 分支中: {parentTestId}__{tag}-{n}
    // 子元素 testid 已通过父锚点 + 局部计数器实现稳定，无需运行时转换
    testId = `${parentTestId}__${tag}-${branchCounter.current}`;
    branchCounter.current++;
    isBaseKey = false; // v-if 子元素已在编译期确定，不需运行时锚点定位
  } else {
    // 普通节点
    testId = ctx.isViewComponent
      ? generateViewTestId(ctx, tag, ctx.counter)
      : generateCommonBaseKey(ctx, tag, ctx.counter);
    ctx.counter++;
    isBaseKey = !ctx.isViewComponent;
  }

  result.push({
    node: el,
    testId,
    isBaseKey,
    isDynamic: false,
  });

  // 递归处理子节点
  if (el.children) {
    el.children.forEach((child) =>
      collectInjections(child, ctx, result, testId, branchCounter)
    );
  }
}

// ============================================================
// 代码生成
// ============================================================

/**
 * 查找开标签结束位置
 *
 * 利用 Vue 2 AST 已解析的属性位置信息 (rawAttrsMap)：
 *   - 从最后一个属性的 end 位置之后开始扫描
 *   - 属性与 '>' / '/>' 之间仅有空白字符
 *   - 彻底避开反引号、表达式中的 '>' 操作符等误判
 *
 * 返回标签结束符的位置和是否自闭合。
 */
function findOpeningTagEnd(
  element: ASTElement,
  template: string
): { pos: number; isSelfClose: boolean } {
  // 确定扫描起点：最后一个属性结束位置，或标签名之后
  let scanFrom: number;
  const attrsList = element.attrsList || [];
  const rawAttrsMap = element.rawAttrsMap || {};

  if (attrsList.length > 0 && element.start !== undefined) {
    // 遍历所有属性，找到最远的 end 位置
    let maxEnd = element.start + 1 + element.tag.length; // 至少从 <tagname 之后开始
    for (const attr of attrsList) {
      const posInfo = rawAttrsMap[attr.name];
      if (posInfo && posInfo.end > maxEnd) {
        maxEnd = posInfo.end;
      }
    }
    scanFrom = maxEnd;
  } else if (element.start !== undefined) {
    // <tagname ... — 属性不存在时从标签名后开始
    scanFrom = element.start + 1 + element.tag.length;
  } else {
    // start 不存在 (异常情况)，跳过
    return { pos: 0, isSelfClose: false };
  }

  // 从扫描起点向后，仅跳过空白，找到 '>' 或 '/>'
  let i = scanFrom;
  while (i < template.length) {
    const ch = template[i];

    // 跳过空白字符
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // 检测自闭合 '/>'
    if (ch === '/' && i + 1 < template.length && template[i + 1] === '>') {
      return { pos: i, isSelfClose: true };
    }

    // 检测普通开标签结束 '>'
    if (ch === '>') {
      return { pos: i, isSelfClose: false };
    }

    i++;
  }

  // 未找到 (异常情况)，回退
  return { pos: i, isSelfClose: false };
}

/**
 * 将 InjectInfo 列表应用到模板源代码，生成新的模板字符串
 *
 * 使用 MagicString 在元素开标签结束符 '>' 或 '/>' 前插入属性。
 * vue-template-compiler 的 AST 节点 start 指向 '<' 的位置。
 */
function applyInjections(template: string, injections: InjectInfo[]): string {
  if (injections.length === 0) return template;

  const s = new MagicString(template);

  for (const info of injections) {
    // 使用 AST 节点的属性位置信息精确定位 '>' 位置
    const { pos: gtPos } = findOpeningTagEnd(info.node, template);

    // 在 '>' 或 '/>' 前插入属性
    let attrStr: string;
    if (info.isDynamic) {
      if (info.isBaseKey) {
        attrStr = ` :data-test-base-key="${info.testId}"`;
      } else {
        attrStr = ` :data-testid="${info.testId}"`;
      }
    } else {
      if (info.isBaseKey) {
        attrStr = ` data-test-base-key="${info.testId}"`;
      } else {
        attrStr = ` data-testid="${info.testId}"`;
      }
    }

    // 在 '>' 或 '/>' 前插入属性
    s.appendLeft(gtPos, attrStr);
  }

  return s.toString();
}

// ============================================================
// 主入口
// ============================================================

/**
 * transformTemplate 的选项
 */
export interface TransformOptions {
  isViewComponent: boolean;
  compilePrefix?: string;
  filename?: string;
  ignoreTags?: string[];
  ignoreClass?: string[];
  onlyInteractive?: boolean;
}

/**
 * 转换 Vue 2 模板，自动注入 testid 属性
 *
 * 使用 vue-template-compiler 将模板解析为 AST，
 * 遍历收集需要打标的节点，最后用 MagicString 在源码中插入属性。
 *
 * @param templateContent - <template> 部分源代码
 * @param options - 转换选项
 * @returns 转换结果 { code } 或 null (无变化)
 */
export function transformTemplate(
  templateContent: string,
  options: TransformOptions,
  compiler: any // vue-template-compiler 实例，从 loader 传入
): TransformResult | null {
  const {
    isViewComponent,
    compilePrefix = 'static_',
    filename = '',
    ignoreTags = DEFAULT_IGNORE_TAGS,
    ignoreClass = DEFAULT_IGNORE_CLASS,
    onlyInteractive = true,
  } = options;

  // ── 解析模板为 AST ──
  let ast: any;
  try {
    const compiled = compiler.compile(templateContent, {
      outputSourceRange: true,
      // 只关心 AST，不需要生成 render 函数 (但 vue-template-compiler 始终会生成)
    });
    ast = compiled.ast;
  } catch {
    // 解析失败 (非标准模板语法)，静默返回
    return null;
  }

  if (!ast) return null;

  // ── 创建转换上下文 ──
  const ctx: TransformContext = {
    isViewComponent,
    compilePrefix,
    filename,
    counter: 0,
    usedIds: new Set(),
    ignoreTags,
    ignoreClass,
    onlyInteractive,
  };

  // ── 收集需要注入的信息 ──
  // Vue 2 AST 根节点 type === 0 (Root)，children 包含顶层节点
  const injections: InjectInfo[] = [];
  if (ast.children) {
    ast.children.forEach((child: ASTNode) => {
      collectInjections(child, ctx, injections);
    });
  }

  if (injections.length === 0) return null;

  // ── 应用注入，生成新代码 ──
  const newCode = applyInjections(templateContent, injections);

  if (newCode === templateContent) return null;

  return {
    code: newCode,
  };
}
