"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => vitePluginAutoTestId,
  vitePluginAutoTestId: () => vitePluginAutoTestId
});
module.exports = __toCommonJS(index_exports);
var import_compiler_sfc = require("@vue/compiler-sfc");

// src/transform.ts
var import_compiler_dom = require("@vue/compiler-dom");

// src/types.ts
var INTERACTIVE_TAGS = /* @__PURE__ */ new Set([
  "button",
  "a-button",
  "input",
  "a-input",
  "a-input-number",
  "select",
  "a-select",
  "textarea",
  "a-textarea",
  "a-checkbox",
  "a-radio",
  "a-switch"
]);
var DEFAULT_IGNORE_TAGS = [
  "script",
  "style",
  "svg",
  "br",
  "iframe"
];
var DEFAULT_IGNORE_CLASS = ["no-test-mark", "hidden"];

// src/transform.ts
var import_magic_string = __toESM(require("magic-string"));
var ATTR_TESTID = "data-testid";
var IF_NODE_TYPE = 9;
var IF_BRANCH_NODE_TYPE = 10;
function extractPageName(filename) {
  const normalized = filename.replace(/\\/g, "/");
  const match = normalized.match(/\/views\/(.+?)(?:\/index)?\.vue$/);
  if (!match) return "unknown";
  return match[1].replace(/\//g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}
function extractCompName(filename) {
  const normalized = filename.replace(/\\/g, "/");
  const name = normalized.split("/").pop()?.replace(".vue", "") || "unknown";
  return name.replace(/[^a-zA-Z0-9_]/g, "");
}
function generateViewTestId(ctx, tag, index) {
  const pageName = extractPageName(ctx.filename);
  const compName = extractCompName(ctx.filename);
  return `${ctx.compilePrefix}page_${pageName}_comp_${compName}_tag_${tag}_${index}`;
}
function generateCommonBaseKey(ctx, tag, index) {
  const compName = extractCompName(ctx.filename);
  return `common_comp_${compName}_tag_${tag}_${index}`;
}
function hasManualTestId(node) {
  return node.props.some((prop) => {
    if (prop.type === 6) {
      return prop.name === ATTR_TESTID;
    }
    if (prop.type === 7) {
      const dir = prop;
      if (dir.name === "bind" && dir.arg?.type === 4) {
        const arg = dir.arg;
        return arg.content === ATTR_TESTID;
      }
    }
    return false;
  });
}
function isInteractiveElement(node) {
  const tag = node.tag.toLowerCase();
  if (INTERACTIVE_TAGS.has(tag)) return true;
  return node.props.some((prop) => {
    if (prop.type === 6) {
      const attr = prop;
      return attr.name === "onclick";
    }
    if (prop.type === 7) {
      const dir = prop;
      if (dir.name === "on") {
        if (dir.arg?.type === 4) {
          const arg = dir.arg;
          return ["click", "input", "change", "submit", "keydown", "keyup"].includes(arg.content);
        }
      }
    }
    return false;
  });
}
function hasIgnoreClass(node, ignoreClass) {
  if (ignoreClass.length === 0) return false;
  const classAttr = node.props.find(
    (p) => p.type === 6 && p.name === "class"
  );
  if (!classAttr) return false;
  const classValue = classAttr.value?.content || "";
  return ignoreClass.some((cls) => classValue.includes(cls));
}
function shouldSkipNode(node, ctx) {
  if (hasManualTestId(node)) return true;
  if (ctx.ignoreTags.includes(node.tag.toLowerCase())) return true;
  if (hasIgnoreClass(node, ctx.ignoreClass)) return true;
  if (ctx.onlyInteractive && !isInteractiveElement(node)) return true;
  return false;
}
function parseVForDirective(node) {
  const forDir = node.props.find(
    (p) => p.type === 7 && p.name === "for"
  );
  if (!forDir) return { hasStableKey: false, keyExpr: null, indexBinding: null };
  const exp = forDir.exp;
  if (!exp) return { hasStableKey: false, keyExpr: null, indexBinding: null };
  const source = exp.content.trim();
  const withIndexMatch = source.match(/\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
  let indexBinding = null;
  if (withIndexMatch) {
    indexBinding = withIndexMatch[2];
  }
  const keyDir = node.props.find(
    (p) => p.type === 7 && p.name === "bind" && p.arg?.type === 4 && p.arg.content === "key"
  );
  let hasStableKey = false;
  let keyExpr = null;
  if (keyDir?.exp) {
    const keyExp = keyDir.exp;
    if ("content" in keyExp) {
      const content = keyExp.content.trim();
      if (content.includes("item.") && !content.includes("index")) {
        hasStableKey = true;
        keyExpr = content;
      }
    }
  }
  return { hasStableKey, keyExpr, indexBinding };
}
function collectInjections(node, ctx, result, parentTestId, branchCounter) {
  if (node.type !== 1) {
    if ("children" in node && node.children) {
      node.children.forEach(
        (child) => collectInjections(child, ctx, result, parentTestId, branchCounter)
      );
    }
    return;
  }
  const el = node;
  const forDir = el.props.find(
    (p) => p.type === 7 && p.name === "for"
  );
  if (forDir) {
    const forTag = el.tag.toLowerCase().replace(/^a-/, "");
    const { hasStableKey, keyExpr, indexBinding } = parseVForDirective(el);
    if (hasStableKey && keyExpr) {
      const baseKey = ctx.isViewComponent ? generateViewTestId(ctx, forTag, ctx.counter) : generateCommonBaseKey(ctx, forTag, ctx.counter);
      ctx.counter++;
      result.push({
        node: el,
        testId: `\`${baseKey}_key_\${${keyExpr}}\``,
        isBaseKey: !ctx.isViewComponent,
        isDynamic: true
      });
    } else if (indexBinding) {
      const testId2 = ctx.isViewComponent ? generateViewTestId(ctx, forTag, ctx.counter) : generateCommonBaseKey(ctx, forTag, ctx.counter);
      ctx.counter++;
      result.push({
        node: el,
        testId: `\`${testId2}-\${${indexBinding}}\``,
        isBaseKey: !ctx.isViewComponent,
        isDynamic: true
      });
    } else {
      const testId2 = ctx.isViewComponent ? generateViewTestId(ctx, forTag, ctx.counter) : generateCommonBaseKey(ctx, forTag, ctx.counter);
      ctx.counter++;
      result.push({
        node: el,
        testId: testId2,
        isBaseKey: !ctx.isViewComponent,
        isDynamic: false
      });
    }
    return;
  }
  if (shouldSkipNode(el, ctx)) {
    const manualId = el.props.find(
      (p) => p.type === 6 && p.name === ATTR_TESTID
    );
    const anchorId = manualId?.value?.content || parentTestId;
    if ("children" in el && el.children) {
      el.children.forEach(
        (child) => collectInjections(child, ctx, result, anchorId, branchCounter)
      );
    }
    return;
  }
  const tag = el.tag.toLowerCase().replace(/^a-/, "");
  if (node.type === IF_NODE_TYPE || node.type === IF_BRANCH_NODE_TYPE) {
    const containerTestId = ctx.isViewComponent ? generateViewTestId(ctx, tag, ctx.counter) : generateCommonBaseKey(ctx, tag, ctx.counter);
    ctx.counter++;
    result.push({
      node: el,
      testId: containerTestId,
      isBaseKey: !ctx.isViewComponent,
      isDynamic: false
    });
    const subCounter = { current: 0 };
    if ("children" in el && el.children) {
      el.children.forEach(
        (child) => collectInjections(child, ctx, result, containerTestId, subCounter)
      );
    }
    return;
  }
  let testId;
  if (branchCounter && parentTestId) {
    testId = `${parentTestId}__${tag}-${branchCounter.current}`;
    branchCounter.current++;
  } else {
    testId = ctx.isViewComponent ? generateViewTestId(ctx, tag, ctx.counter) : generateCommonBaseKey(ctx, tag, ctx.counter);
    ctx.counter++;
  }
  result.push({
    node: el,
    testId,
    isBaseKey: !ctx.isViewComponent,
    isDynamic: false
  });
  if ("children" in el && el.children) {
    el.children.forEach(
      (child) => collectInjections(child, ctx, result, testId, branchCounter)
    );
  }
}
function findOpeningTagEnd(template, startOffset) {
  let i = startOffset;
  let inQuote = false;
  let quoteChar = "";
  while (i < template.length) {
    const ch = template[i];
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
    if (ch === "/" && i + 1 < template.length && template[i + 1] === ">") {
      return { pos: i, isSelfClose: true };
    }
    if (ch === ">") {
      return { pos: i, isSelfClose: false };
    }
    i++;
  }
  return { pos: i, isSelfClose: false };
}
function applyInjections(template, injections) {
  if (injections.length === 0) return template;
  const s = new import_magic_string.default(template);
  for (const info of injections) {
    const { loc } = info.node;
    const startOffset = loc.start.offset;
    const { pos: gtPos, isSelfClose } = findOpeningTagEnd(template, startOffset);
    const actualInsertPos = isSelfClose ? gtPos : gtPos;
    let attrStr;
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
    s.appendLeft(actualInsertPos, attrStr);
  }
  return s.toString();
}
function transformTemplate(templateContent, options) {
  const {
    isViewComponent,
    compilePrefix = "static_",
    filename = "",
    ignoreTags = DEFAULT_IGNORE_TAGS,
    ignoreClass = DEFAULT_IGNORE_CLASS,
    onlyInteractive = true
  } = options;
  let ast;
  try {
    ast = (0, import_compiler_dom.parse)(templateContent, {
      comments: true,
      getTextMode: () => 0
      // DATA 模式
    });
  } catch {
    return null;
  }
  const ctx = {
    isViewComponent,
    compilePrefix,
    filename,
    counter: 0,
    usedIds: /* @__PURE__ */ new Set(),
    ignoreTags,
    ignoreClass,
    onlyInteractive
  };
  const injections = [];
  ast.children.forEach((child) => {
    collectInjections(child, ctx, injections);
  });
  if (injections.length === 0) return null;
  const newCode = applyInjections(templateContent, injections);
  if (newCode === templateContent) return null;
  return {
    code: newCode
  };
}

// src/index.ts
function vitePluginAutoTestId(options = {}) {
  const {
    viewPatterns = ["/views/"],
    commonPatterns = ["/components/", "/common/"],
    globalPrefix,
    compilePrefix: rawCompilePrefix = "static_",
    ignoreTags = DEFAULT_IGNORE_TAGS,
    ignoreClass = DEFAULT_IGNORE_CLASS,
    onlyInteractive = true
  } = options;
  const compilePrefix = globalPrefix ? `${globalPrefix}_${rawCompilePrefix}` : rawCompilePrefix;
  return {
    name: "vite-plugin-auto-testid",
    enforce: "pre",
    // 在其他 Vue 插件之前执行，尽早处理模板
    /**
     * transform 钩子: 拦截 .vue 文件，对其 <template> 部分注入 testid
     */
    transform(code, id) {
      if (process.env.NODE_ENV === "production") return null;
      if (!id.endsWith(".vue")) return null;
      const isView = viewPatterns.some((p) => id.includes(p));
      const isCommon = commonPatterns.some((p) => id.includes(p));
      if (!isView && !isCommon) return null;
      try {
        const { descriptor, errors } = (0, import_compiler_sfc.parse)(code, {
          filename: id
        });
        if (errors.length > 0) {
          console.warn(`[vite-plugin-auto-testid] SFC parse warnings: ${id}`, errors);
        }
        if (!descriptor.template) return null;
        const result = transformTemplate(descriptor.template.content, {
          isViewComponent: isView,
          compilePrefix,
          filename: id,
          ignoreTags,
          ignoreClass,
          onlyInteractive
        });
        if (!result || result.code === descriptor.template.content) {
          return null;
        }
        const templateStart = descriptor.template.loc.start.offset;
        const templateEnd = descriptor.template.loc.end.offset;
        const newCode = code.slice(0, templateStart) + result.code + code.slice(templateEnd);
        return {
          code: newCode,
          map: result.map || null
        };
      } catch (e) {
        console.warn(
          `[vite-plugin-auto-testid] \u6A21\u677F\u89E3\u6790\u5931\u8D25: ${id}`,
          e instanceof Error ? e.message : e
        );
        return null;
      }
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  vitePluginAutoTestId
});
