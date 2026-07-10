/**
 * 模板 AST 转换核心逻辑
 *
 * 负责解析 Vue SFC 模板，为 DOM 节点注入 data-testid 或 data-test-base-key。
 *
 * ┌─ 页面组件 (/views/**) → 直接注入完整 static_xxx data-testid
 * └─ 公共组件 (/components/**, /common/**) → 仅注入 data-test-base-key
 *
 * 与 vite-plugin-auto-testid 共享完全相同的 transform 逻辑。
 */

import { parse, type NodeTypes } from '@vue/compiler-dom';
import type {
  TemplateChildNode,
  ElementNode,
  AttributeNode,
  DirectiveNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
} from '@vue/compiler-core';
import type { TransformContext, TransformResult } from './types';
import { INTERACTIVE_TAGS, DEFAULT_IGNORE_TAGS, DEFAULT_IGNORE_CLASS } from './types';
import MagicString from 'magic-string';

/**
 * 模板属性名常量
 */
const ATTR_TESTID = 'data-testid';
const ATTR_BASE_KEY = 'data-test-base-key';

/**
 * v-if 分支对应的 AST 节点类型
 * 1 = NodeTypes.IF
 * 17 = NodeTypes.IF_BRANCH (v-else-if / v-else)
 */
const IF_NODE_TYPE = 9;  // NodeTypes.IF
const IF_BRANCH_NODE_TYPE = 10; // NodeTypes.IF_BRANCH

/**
 * 递归 AST 检查是否包含 v-if (用于判断是否有条件分支)
 */
function hasVIf(node: TemplateChildNode): boolean {
  if (node.type === IF_NODE_TYPE) return true;
  if ('children' in node && node.children) {
    return node.children.some(hasVIf);
  }
  return false;
}

// ============================================================
// 路径提取工具
// ============================================================

/**
 * 从文件路径提取页面名
 * 例: /src/views/login/index.vue → login
 *     /src/views/user/Profile.vue → user_Profile
 */
function extractPageName(filename: string): string {
  // 标准化路径分隔符
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
function generateViewTestId(
  ctx: TransformContext,
  tag: string,
  index: number
): string {
  const pageName = extractPageName(ctx.filename);
  const compName = extractCompName(ctx.filename);
  return `${ctx.compilePrefix}page_${pageName}_comp_${compName}_tag_${tag}_${index}`;
}

/**
 * 生成公共组件 base-key
 * 格式: common_comp_${compName}_tag_${tagName}_${index}
 * 运行时: Observer 通过锚点定位拼接最终 testid
 */
function generateCommonBaseKey(
  ctx: TransformContext,
  tag: string,
  index: number
): string {
  const compName = extractCompName(ctx.filename);
  return `common_comp_${compName}_tag_${tag}_${index}`;
}

// ============================================================
// 节点检查工具
// ============================================================

/**
 * 检查节点是否已有手动 data-testid
 */
function hasManualTestId(node: ElementNode): boolean {
  return node.props.some((prop) => {
    if (prop.type === 6) {
      // 静态属性 (NodeTypes.ATTRIBUTE)
      return (prop as AttributeNode).name === ATTR_TESTID;
    }
    if (prop.type === 7) {
      // 指令 (NodeTypes.DIRECTIVE)
      const dir = prop as DirectiveNode;
      if (dir.name === 'bind' && dir.arg?.type === 4) {
        const arg = dir.arg as SimpleExpressionNode;
        return arg.content === ATTR_TESTID;
      }
    }
    return false;
  });
}

/**
 * 判断节点是否为交互元素
 */
function isInteractiveElement(node: ElementNode): boolean {
  const tag = node.tag.toLowerCase();

  // 白名单
  if (INTERACTIVE_TAGS.has(tag)) return true;

  // 检查 clickable 属性
  return node.props.some((prop) => {
    if (prop.type === 6) {
      const attr = prop as AttributeNode;
      return attr.name === 'onclick';
    }
    if (prop.type === 7) {
      const dir = prop as DirectiveNode;
      if (dir.name === 'on') {
        // @click, @input 等
        if (dir.arg?.type === 4) {
          const arg = dir.arg as SimpleExpressionNode;
          return ['click', 'input', 'change', 'submit', 'keydown', 'keyup'].includes(arg.content);
        }
      }
    }
    return false;
  });
}

/**
 * 检查节点是否包含忽略 class
 */
function hasIgnoreClass(node: ElementNode, ignoreClass: string[]): boolean {
  if (ignoreClass.length === 0) return false;

  const classAttr = node.props.find(
    (p): p is AttributeNode =>
      p.type === 6 && (p as AttributeNode).name === 'class'
  );
  if (!classAttr) return false;

  const classValue = classAttr.value?.content || '';
  return ignoreClass.some((cls) => classValue.includes(cls));
}

/**
 * 是否应跳过该节点
 */
function shouldSkipNode(node: ElementNode, ctx: TransformContext): boolean {
  if (hasManualTestId(node)) return true;
  if (ctx.ignoreTags.includes(node.tag.toLowerCase())) return true;
  if (hasIgnoreClass(node, ctx.ignoreClass)) return true;
  if (ctx.onlyInteractive && !isInteractiveElement(node)) return true;
  return false;
}

// ============================================================
// v-for 相关
// ============================================================

/**
 * 从 v-for 指令中提取 key 表达式 (简单情况)
 * 返回: { hasStableKey, keyExpr }
 */
function parseVForDirective(node: ElementNode): { hasStableKey: boolean; keyExpr: string | null; indexBinding: string | null } {
  const forDir = node.props.find(
    (p): p is DirectiveNode =>
      p.type === 7 &&
      (p as DirectiveNode).name === 'for'
  ) as DirectiveNode | undefined;

  if (!forDir) return { hasStableKey: false, keyExpr: null, indexBinding: null };

  const exp = forDir.exp as SimpleExpressionNode | undefined;
  if (!exp) return { hasStableKey: false, keyExpr: null, indexBinding: null };

  // v-for="(item, index) in list" 或 v-for="item in list"
  const source = exp.content.trim();

  // 检测是否有 index 别名
  // 模式: (item, index) in ... 或 (item, i) in ...
  const withIndexMatch = source.match(/\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
  let indexBinding: string | null = null;
  if (withIndexMatch) {
    indexBinding = withIndexMatch[2];
  }

  // 检测 item.id 作为稳定 key
  const keyDir = node.props.find(
    (p): p is DirectiveNode =>
      p.type === 7 &&
      (p as DirectiveNode).name === 'bind' &&
      (p as DirectiveNode).arg?.type === 4 &&
      ((p as DirectiveNode).arg as SimpleExpressionNode).content === 'key'
  ) as DirectiveNode | undefined;

  let hasStableKey = false;
  let keyExpr: string | null = null;

  if (keyDir?.exp) {
    const keyExp = keyDir.exp as SimpleExpressionNode | CompoundExpressionNode;
    if ('content' in keyExp) {
      // 稳定 key: :key="item.id" 或 :key="item.code"
      const content = (keyExp as SimpleExpressionNode).content.trim();
      if (content.includes('item.') && !content.includes('index')) {
        hasStableKey = true;
        keyExpr = content;
      }
    }
  }

  return { hasStableKey, keyExpr, indexBinding };
}

// ============================================================
// 核心 AST 遍历与变换
// ============================================================

/**
 * 遍历 AST 并收集需要注入 testid 的节点信息
 *
 * 返回需要修改的位置列表: { node, testId, isBaseKey }
 */
interface InjectInfo {
  node: ElementNode;
  testId: string;
  isBaseKey: boolean;
  isDynamic: boolean;         // 是否动态绑定 (:data-testid)
}

/**
 * 遍历节点树，收集打标信息
 */
function collectInjections(
  node: TemplateChildNode,
  ctx: TransformContext,
  result: InjectInfo[],
  parentTestId?: string,
  branchCounter?: { current: number }
): void {
  // 只处理元素节点
  if (node.type !== 1) {
    // ElementNode.type === 1
    // 递归处理子节点 (如 v-for 的 TemplateLiteral)
    if ('children' in node && node.children) {
      node.children.forEach((child) =>
        collectInjections(child, ctx, result, parentTestId, branchCounter)
      );
    }
    return;
  }

  const el = node as ElementNode;

  // ============================================================
  // 1. 处理 v-for (优先级最高，即使 onlyInteractive 也需打标)
  //    因为 v-for 产生重复的 DOM 结构，E2E 测试必须能区分每一项
  // ============================================================
  const forDir = el.props.find(
    (p): p is DirectiveNode =>
      p.type === 7 && (p as DirectiveNode).name === 'for'
  ) as DirectiveNode | undefined;

  if (forDir) {
    // 获取简化标签名 (a-button → button)
    const forTag = el.tag.toLowerCase().replace(/^a-/, '');
    const { hasStableKey, keyExpr, indexBinding } = parseVForDirective(el);

    if (hasStableKey && keyExpr) {
      // 情况 A: 有稳定 key — 编译注入动态 :data-testid (或 :data-test-base-key)
      const baseKey = ctx.isViewComponent
        ? generateViewTestId(ctx, forTag, ctx.counter)
        : generateCommonBaseKey(ctx, forTag, ctx.counter);
      ctx.counter++;

      result.push({
        node: el,
        testId: `\`${baseKey}_key_\${${keyExpr}}\``,
        isBaseKey: !ctx.isViewComponent,
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
        isBaseKey: !ctx.isViewComponent,
        isDynamic: true,
      });
    }
    // 情况 C: 无稳定 key — 外层打标，内部跳过
    else {
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
  // 2. 跳过不需要打标的节点
  // ============================================================
  if (shouldSkipNode(el, ctx)) {
    // 如果已有手动 testid，可以用作子节点的锚点，继续递归子节点
    const manualId = el.props.find(
      (p): p is AttributeNode =>
        p.type === 6 && (p as AttributeNode).name === ATTR_TESTID
    ) as AttributeNode | undefined;

    const anchorId = manualId?.value?.content || parentTestId;
    if ('children' in el && el.children) {
      el.children.forEach((child) =>
        collectInjections(child, ctx, result, anchorId, branchCounter)
      );
    }
    return;
  }

  // 获取简化标签名 (a-button → button)
  const tag = el.tag.toLowerCase().replace(/^a-/, '');

  // ============================================================
  // 3. 处理 v-if 分支
  // ============================================================
  if (node.type === IF_NODE_TYPE || node.type === IF_BRANCH_NODE_TYPE) {
    // v-if 条件块：外层容器编译打标，使用独立子计数器
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

    // 子节点使用独立子计数器 (branchCounter)
    const subCounter = { current: 0 };
    if ('children' in el && el.children) {
      el.children.forEach((child) =>
        collectInjections(child, ctx, result, containerTestId, subCounter)
      );
    }
    return;
  }

  // ============================================================
  // 4. 普通元素节点
  // ============================================================
  let testId: string;

  if (branchCounter && parentTestId) {
    // 处于 v-if 分支中: 使用 {parentTestId}__{tag}-{n} 格式
    testId = `${parentTestId}__${tag}-${branchCounter.current}`;
    branchCounter.current++;
  } else {
    // 正常元素
    testId = ctx.isViewComponent
      ? generateViewTestId(ctx, tag, ctx.counter)
      : generateCommonBaseKey(ctx, tag, ctx.counter);
    ctx.counter++;
  }

  result.push({
    node: el,
    testId,
    isBaseKey: !ctx.isViewComponent,
    isDynamic: false,
  });

  // 递归处理子节点
  if ('children' in el && el.children) {
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
 * 从 startOffset (< 的位置) 开始向后扫描，
 * 跳过引号内的内容，找到第一个 '>' 或 '/>'，
 * 返回标签结束符的位置和是否自闭合。
 */
function findOpeningTagEnd(
  template: string,
  startOffset: number
): { pos: number; isSelfClose: boolean } {
  let i = startOffset;
  let inQuote = false;
  let quoteChar = '';

  while (i < template.length) {
    const ch = template[i];

    // 处理引号内的内容 (属性值)
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
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
 * 原理: 使用 MagicString 在元素开标签结束符 '>' 或 '/>' 前插入属性
 */
function applyInjections(template: string, injections: InjectInfo[]): string {
  if (injections.length === 0) return template;

  const s = new MagicString(template);

  for (const info of injections) {
    const { loc } = info.node;
    // Vue AST 中 loc.start.offset 才是字符偏移量 (非 loc.startOffset)
    const startOffset = loc.start.offset;

    // 从开标签起始位置 '<' 向后定位到第一个 '>' 或 '/>'
    const { pos: gtPos, isSelfClose } = findOpeningTagEnd(template, startOffset);

    // 在 '>' 或 '/>' 前插入
    const actualInsertPos = gtPos;

    // 注入属性，前面加一个空格
    let attrStr: string;
    if (info.isDynamic) {
      // 动态绑定 :data-testid 或 :data-test-base-key
      if (info.isBaseKey) {
        attrStr = ` :data-test-base-key="${info.testId}"`;
      } else {
        attrStr = ` :data-testid="${info.testId}"`;
      }
    } else {
      // 静态属性
      if (info.isBaseKey) {
        attrStr = ` data-test-base-key="${info.testId}"`;
      } else {
        attrStr = ` data-testid="${info.testId}"`;
      }
    }

    s.appendLeft(actualInsertPos, attrStr);
  }

  return s.toString();
}

// ============================================================
// 主入口
// ============================================================

export interface TransformOptions {
  isViewComponent: boolean;
  compilePrefix?: string;
  filename?: string;
  ignoreTags?: string[];
  ignoreClass?: string[];
  onlyInteractive?: boolean;
}

/**
 * 转换 Vue 模板，自动注入 testid 属性
 *
 * @param templateContent - <template> 部分源代码
 * @param options - 转换选项
 * @returns 转换结果 (code + map)
 */
export function transformTemplate(
  templateContent: string,
  options: TransformOptions
): TransformResult | null {
  const {
    isViewComponent,
    compilePrefix = 'static_',
    filename = '',
    ignoreTags = DEFAULT_IGNORE_TAGS,
    ignoreClass = DEFAULT_IGNORE_CLASS,
    onlyInteractive = true,
  } = options;

  // 解析模板为 AST
  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(templateContent, {
      comments: true,
      getTextMode: () => 0, // DATA 模式
    });
  } catch {
    // 解析失败 (非标准模板语法)，静默返回
    return null;
  }

  // 创建转换上下文
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

  // 收集需要注入的信息
  const injections: InjectInfo[] = [];
  ast.children.forEach((child) => {
    collectInjections(child, ctx, injections);
  });

  if (injections.length === 0) return null;

  // 应用注入，生成新代码
  const newCode = applyInjections(templateContent, injections);

  if (newCode === templateContent) return null;

  return {
    code: newCode,
  };
}
