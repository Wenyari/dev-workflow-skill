/**
 * Token Resolver
 *
 * 把 DTCG 别名引用（如 `{grey.1}`、`{fill.neutral.primary}`）解析成最终原始值。
 * 支持跨 set 引用（component 引用 foundation，foundation 引用 palette）。
 *
 * 使用：
 *   const loaded = loadTokens('./tokens')
 *   const records = flattenTokens(loaded)
 *   const resolver = createResolver(records)
 *   resolver.resolve('foundation', ['fill', 'neutral', 'primary'])  // -> '#090a0b'
 *   resolver.resolveAliasString('{grey.1}')                          // -> '#090a0b'
 *
 * 同名 token 跨 set 解析顺序（按 tokenSetOrder 反序优先）：
 *   componentUsage > component > baseValue > foundation > palette
 * 即下游 set 内若定义了同名 token，优先用下游的；用于 component 覆盖 palette 的能力。
 */

const ALIAS_RE = /^\{([^}]+)\}$/

export function createResolver(records, order = []) {
  // 索引：'setName.a.b.c' -> record
  const bySetPath = new Map()
  // 跨 set 索引：'a.b.c' -> record[]（按 set 顺序排）
  const byPathAcrossSets = new Map()

  for (const rec of records) {
    bySetPath.set(`${rec.setName}.${rec.pathStr}`, rec)
    const list = byPathAcrossSets.get(rec.pathStr) ?? []
    list.push(rec)
    byPathAcrossSets.set(rec.pathStr, list)
  }

  // 跨 set 命中时的优先级：tokenSetOrder 越靠后越优先
  const setPriority = new Map()
  order.forEach((setName, i) => setPriority.set(setName, i))

  for (const list of byPathAcrossSets.values()) {
    list.sort((a, b) => (setPriority.get(b.setName) ?? -1) - (setPriority.get(a.setName) ?? -1))
  }

  function findRecord(setName, pathArr) {
    const key = `${setName}.${pathArr.join('.')}`
    return bySetPath.get(key) ?? null
  }

  function findRecordByPath(pathStr) {
    const list = byPathAcrossSets.get(pathStr)
    return list && list.length > 0 ? list[0] : null
  }

  function resolveAliasString(value, seen = new Set()) {
    if (typeof value !== 'string') return value
    const match = value.match(ALIAS_RE)
    if (!match) return value

    const innerPath = match[1]
    if (seen.has(innerPath)) {
      throw new Error(`circular alias detected at {${innerPath}}`)
    }
    seen.add(innerPath)

    const target = findRecordByPath(innerPath)
    if (!target) {
      // 引用悬空：返回 null 标记，让上层报告影响
      return { __unresolved: true, alias: innerPath }
    }
    return resolveAliasString(target.$value, seen)
  }

  function resolve(setName, pathArr) {
    const rec = findRecord(setName, pathArr)
    if (!rec) return null
    return resolveAliasString(rec.$value)
  }

  return {
    resolve,
    resolveAliasString,
    findRecord,
    findRecordByPath,
    allRecords: records,
    order
  }
}

/**
 * 反向查询：给定一个原始值（如 '#202226'），列出所有最终解析到该值的 token 路径。
 * 返回数组按层级优先级排序：componentUsage > component > foundation > palette > baseValue。
 */
export function findTokensByValue(resolver, targetValue) {
  const cleanTarget = normalizeValue(targetValue)
  const matches = []

  for (const rec of resolver.allRecords) {
    const resolved = resolver.resolveAliasString(rec.$value)
    if (resolved && typeof resolved === 'object' && resolved.__unresolved) continue
    if (normalizeValue(resolved) === cleanTarget) {
      matches.push({
        setName: rec.setName,
        path: rec.pathStr,
        fullPath: `${rec.setName}.${rec.pathStr}`,
        $type: rec.$type,
        $value: rec.$value,
        resolvedValue: resolved
      })
    }
  }

  return matches.sort((a, b) => layerPriority(a.setName) - layerPriority(b.setName))
}

// 数字越小越优先推荐
const LAYER_PRIORITY = {
  componentUsage: 0,
  component: 1,
  foundation: 2,
  baseValue: 3,
  palette: 4
}

function layerPriority(setName) {
  return LAYER_PRIORITY[setName] ?? 99
}

function normalizeValue(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return String(v)
  const str = String(v).toLowerCase().trim()
  const pxMatch = /^(-?\d+(?:\.\d+)?)px$/.exec(str)
  return pxMatch ? pxMatch[1] : str
}
