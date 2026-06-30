/**
 * Match Token
 *
 * 用法:
 *   node .agent/skills/figmaSync/scripts/match-token.mjs "<value>" [--type=color|number]
 *
 * 行为:
 *   1. 加载 theme/dark CSS token 源
 *   2. 反向查找：哪些 /theme CSS variables 最终解析后等于 <value>
 *   3. 按层级优先级排序：foundation > baseValue > palette
 *   4. 默认推荐 foundation 层（语义稳定 + 跨组件可复用）
 *
 * 推荐策略（按 $type 分流）:
 *   - color  : foundation > palette
 *              （foundation 语义稳定 + 跨组件复用；palette 是最差选择）
 *   - number : baseValue
 *              （baseValue 的 spacing.8 / radius.4 已是语义化最稳定的层）
 *
 * 输出示例（命中）:
 *   {
 *     "success": true,
 *     "matches": [...],
 *     "recommend": {
 *       "layer": "foundation",
 *       "themePath": "foundation.fill.neutral.tertiary",
 *       "cssVariable": "--fill-neutral-tertiary",
 *       "cssValue": "{grey.12}"
 *     },
 *     "recommendReason": "color variables default to foundation layer..."
 *   }
 *
 * 输出示例（未命中）:
 *   { "success": false, "message": "No match found.", "originalValue": "..." }
 */
import { appendSessionLog } from './_shared/session-log.mjs'
import { createResolver, findTokensByValue } from './_shared/token-resolver.mjs'
import { loadCurrentTokenRecords } from './_shared/token-source.mjs'

const RECOMMEND_LAYER_ORDER_BY_TYPE = {
  color: ['foundation', 'component', 'componentUsage', 'palette'],
  number: ['baseValue', 'componentUsage', 'component']
}

const RECOMMEND_REASON_BY_TYPE = {
  color:
    'color variables default to foundation layer for semantic stability and cross-component reuse',
  number:
    'number variables default to baseValue layer (spacing/radius/size) as the most stable semantic source'
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const out = { value: null, type: null }
  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      out.type = arg.slice('--type='.length)
    } else if (!out.value) {
      out.value = arg
    }
  }
  return out
}

/**
 * 把用户输入规范化为可比对的字面量：
 *   - "8px" / "8.5px" → "8" / "8.5"（字符串，与 CSS token 记录输出对齐）
 *   - "0.8" / "8" → 同上
 *   - "#abcdef" / "rgb(...)" 保留小写
 *   - 其余原样返回
 * 返回值始终是 string，避免 sonar 多类型返回告警，也方便日志去重。
 */
function normalizeQuery(raw) {
  if (raw === undefined || raw === null) return ''
  const trimmed = String(raw).trim()
  const pxMatch = /^(-?\d+(?:\.\d+)?)px$/i.exec(trimmed)
  if (pxMatch) return pxMatch[1]
  const numMatch = /^(-?\d+(?:\.\d+)?)$/.exec(trimmed)
  if (numMatch) return numMatch[1]
  return trimmed.toLowerCase()
}

function isNumericQuery(value) {
  return /^-?\d+(?:\.\d+)?$/.test(String(value))
}

function main() {
  const { value, type } = parseArgs(process.argv)

  if (!value) {
    console.log(
      JSON.stringify({
        success: false,
        message: 'Missing value argument. Usage: node match-token.mjs <value> [--type=color|number]'
      })
    )
    process.exit(0)
  }

  let loaded
  try {
    loaded = loadTokenRecords()
  } catch (err) {
    console.log(JSON.stringify({ success: false, message: err.message }))
    process.exit(0)
  }

  const records = loaded.records
  const resolver = createResolver(records, loaded.order)

  const normalized = normalizeQuery(value)
  let matches = findTokensByValue(resolver, normalized)
  if (type) {
    matches = matches.filter((m) => m.$type === type)
  } else if (isNumericQuery(normalized)) {
    const numberMatches = matches.filter((m) => m.$type === 'number')
    if (numberMatches.length > 0) matches = numberMatches
  }

  if (matches.length === 0) {
    appendSessionLog({ script: 'match-token', input: value, hit: false })
    console.log(
      JSON.stringify({
        success: false,
        message: 'No match found. Proceed with Fallback Levels (Level 1/2/3).',
        originalValue: value,
        normalizedValue: normalized
      })
    )
    process.exit(0)
  }

  const simplifiedMatches = matches.map((m) => ({
    layer: m.setName,
    themePath: `${m.setName}.${m.path}`,
    cssVariable: m.cssVar ?? toCssVariable(m.path.split('.')),
    cssValue: m.$value,
    resolvedValue: m.resolvedValue,
    $type: m.$type
  }))

  const primaryType = simplifiedMatches[0].$type
  const layerOrder = RECOMMEND_LAYER_ORDER_BY_TYPE[primaryType] ?? ['foundation']
  let recommend = pickRecommendedMatch(simplifiedMatches, primaryType)
  for (const layer of layerOrder) {
    const hit = simplifiedMatches.find((m) => m.layer === layer)
    if (hit) {
      recommend = pickRecommendedMatch(
        simplifiedMatches.filter((m) => m.layer === layer),
        primaryType
      )
      break
    }
  }

  appendSessionLog({
    script: 'match-token',
    input: value,
    hit: true,
    token: recommend.themePath,
    cssVariable: recommend.cssVariable,
    layer: recommend.layer,
    type: primaryType
  })

  console.log(
    JSON.stringify({
      success: true,
      matches: simplifiedMatches,
      recommend,
      recommendReason:
        RECOMMEND_REASON_BY_TYPE[primaryType] ?? 'no recommendation rule for this token type'
    })
  )
}

function pickRecommendedMatch(matches, primaryType) {
  if (primaryType !== 'number') return matches[0]

  const pathPriority = [
    'spacing.',
    'radius.',
    'size.',
    'border.',
    'icon.',
    'fontsize.',
    'fontheight.',
    'fontspacing.'
  ]
  return [...matches].sort((a, b) => {
    const aPriority = priorityForPath(a.themePath, pathPriority)
    const bPriority = priorityForPath(b.themePath, pathPriority)
    return aPriority - bPriority
  })[0]
}

function priorityForPath(path, prefixes) {
  const shortPath = path.split('.').slice(1).join('.')
  const index = prefixes.findIndex((prefix) => shortPath.startsWith(prefix))
  return index === -1 ? prefixes.length : index
}

function loadTokenRecords() {
  return loadCurrentTokenRecords()
}

function toCssVariable(pathParts) {
  return `--${pathParts.join('-')}`
}

main()
