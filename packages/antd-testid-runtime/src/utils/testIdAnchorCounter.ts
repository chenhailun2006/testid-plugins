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

// ============================================================
// 核心数据结构
// ============================================================

/**
 * 锚点局部计数器 Map
 *
 * key 格式: ${anchorTestId}__${componentName}__${tagName}
 * value: 当前计数器值 (已分配过的最大索引 + 1)
 */
const anchorCounterMap = new Map<string, number>();

// ============================================================
// 私有工具函数
// ============================================================

/**
 * 构建局部计数器 key
 */
function buildAnchorKey(
  anchorTestId: string,
  componentName: string,
  tagName: string
): string {
  return `${anchorTestId}__${componentName}__${tagName}`;
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 获取锚点下某组件某标签的下一个局部索引 (自增)
 *
 * @param anchorTestId - 锚点 testid (findAnchor 返回)
 * @param componentName - 组件名称 (从 base-key 解析)
 * @param tagName - 标签名 (从 base-key 解析)
 * @returns 局部索引 (从 0 开始)
 */
export function getNextAnchorLocalIndex(
  anchorTestId: string,
  componentName: string,
  tagName: string
): number {
  const key = buildAnchorKey(anchorTestId, componentName, tagName);
  const current = anchorCounterMap.get(key) ?? 0;
  anchorCounterMap.set(key, current + 1);
  return current;
}

/**
 * 重置所有锚点计数器 (路由切换时调用)
 */
export function resetAllAnchorCounters(): void {
  anchorCounterMap.clear();
}

/**
 * 获取当前锚点计数器映射（仅用于调试）
 */
export function getAnchorCounterMap(): ReadonlyMap<string, number> {
  return anchorCounterMap;
}

// ============================================================
// base-key 解析
// ============================================================

/**
 * base-key 解析结果
 */
export interface ParsedBaseKey {
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
export function parseBaseKey(baseKey: string): ParsedBaseKey | null {
  // baseKey 格式: common_comp_BaseSearch_tag_button_0
  //
  // 关键: tagName 使用贪婪捕获 (+)，而非非贪婪 (+?)。
  //   非贪婪会在遇到 "menu-item_0" 时错误匹配为 tagName="m", index="0"
  //   (因为余下 "enu-item_0" 末尾的 _0 满足 _(\d+)$)。
  //   贪婪模式会先吞入全量再回溯，确保找到最后一个 _数字 边界。
  //
  // componentName 用非贪婪 (+?)，确保精确停在第一个 _tag_ 分隔符。
  const match = baseKey.match(
    /^common_comp_(.+?)_tag_(.+)_(\d+)$/
  );
  if (!match) {
    console.warn(
      '[antd-testid-runtime] parseBaseKey 失败，baseKey 格式不匹配:',
      baseKey,
      '期望格式: common_comp_{componentName}_tag_{tagName}_{index}'
    );
    return null;
  }
  return {
    componentName: match[1],
    tagName: match[2],
    templateIndex: match[3],
  };
}

// ============================================================
// testid 拼接
// ============================================================

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
export function buildAnchorTestId(
  anchorTestId: string,
  componentName: string,
  tagName: string,
  localIndex: number
): string {
  return `${anchorTestId}__${componentName}_${tagName}_${localIndex}`;
}
