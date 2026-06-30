/**
 * Lookup Var (Fast Path 1)
 *
 * 把 CSS 变量名映射到 /theme 路径——专为「设计稿 CSS 已含 var() 引用」的快路径。
 * 不做反向哈希搜索，只做查表。
 *
 * 用法:
 *   node .agent/skills/figmaSync/scripts/lookup-var.mjs "--fill-neutral-primary"
 *   node .agent/skills/figmaSync/scripts/lookup-var.mjs "var(--fill-neutral-primary, #090A0B)"
 *   node .agent/skills/figmaSync/scripts/lookup-var.mjs "--apex-spacing-8"
 *
 * 支持的变量命名:
 *   --apex-fill-neutral-primary   (apex-ui 实际产出)
 *   --fill-neutral-primary        (设计师在 Figma 里常写的简写)
 *   var(--xxx, fallback)          (整段 CSS 表达式也接受)
 *
 * 输出（命中）:
 *   {
 *     "success": true,
 *     "cssVariable": "--fill-neutral-primary",            // ✅ 直接写入 CSS: var(--fill-neutral-primary)
 *     "themePath": "foundation.fill.neutral.primary",     // ✅ 写入 PLAN.md 供审核
 *     "cssValue": "{grey.14}",
 *     "usage": ["color"],
 *     "$type": "color",
 *     "layer": "foundation",
 *     "shortRef": "fill.neutral.primary"
 *   }
 *
 * 输出（未命中）:
 *   { "success": false, "message": "...", "candidates": [...top-5 模糊建议...] }
 */
import { appendSessionLog } from './_shared/session-log.mjs'
import { loadCurrentTokenRecords } from './_shared/token-source.mjs'

const ALIAS_LAYER_ORDER = ['foundation', 'baseValue', 'palette']

function parseArg(raw) {
  if (!raw) return null
  const varMatch = raw.match(/var\(\s*(--[a-zA-Z0-9_-]+)/)
  if (varMatch) return varMatch[1]
  const trimmed = raw.trim()
  if (trimmed.startsWith('--')) return trimmed
  return null
}

function buildVarIndex(records) {
  // 一个变量记录同时支持两种 var 写法（带/不带 apex- 前缀），并支持 path 后缀命中
  const map = new Map()
  for (const rec of records) {
    const segments = rec.path
    const dashJoined = segments.join('-').toLowerCase()
    const variants = new Set([
      `--${dashJoined}`,
      `--apex-${dashJoined}`,
      // 部分设计师会把 setName 也写进 var 名（罕见，但兼容）
      `--${rec.setName.toLowerCase()}-${dashJoined}`
    ])
    if (rec.cssVar) variants.add(rec.cssVar.toLowerCase())
    for (const v of variants) {
      if (!map.has(v)) map.set(v, [])
      map.get(v).push(rec)
    }
  }
  return map
}

function pickRecommended(records) {
  // var 命中可能多 set 同名（foundation 与 component 都叫 fill.neutral.primary 很少见，但允许）
  // 推荐顺序：foundation > baseValue > component > componentUsage > palette
  for (const layer of ALIAS_LAYER_ORDER) {
    const hit = records.find((r) => r.setName === layer)
    if (hit) return hit
  }
  return records[0]
}

function fuzzyCandidates(varName, varIndex, limit = 5) {
  const clean = varName.replace(/^(--apex-|--)/, '')
  const keys = [...varIndex.keys()].map((k) => k.replace(/^(--apex-|--)/, ''))
  // 简单子串排序
  const ranked = keys
    .map((k) => ({ k, score: similarity(clean, k) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  return ranked.map((r) => `--${r.k}`)
}

function similarity(a, b) {
  if (a === b) return 1
  if (b.includes(a) || a.includes(b)) return 0.7
  const tokensA = a.split('-')
  const tokensB = b.split('-')
  const common = tokensA.filter((t) => tokensB.includes(t)).length
  return common / Math.max(tokensA.length, tokensB.length)
}

function main() {
  const arg = process.argv[2]
  const varName = parseArg(arg)
  if (!varName) {
    console.log(
      JSON.stringify({
        success: false,
        message: 'Provide a CSS variable like "--fill-neutral-primary" or "var(--xxx, fallback)"'
      })
    )
    process.exit(0)
  }

  let records
  try {
    records = loadRecords()
  } catch (err) {
    console.log(JSON.stringify({ success: false, message: err.message }))
    process.exit(0)
  }

  const varIndex = buildVarIndex(records)

  const hits = varIndex.get(varName.toLowerCase())
  if (!hits || hits.length === 0) {
    appendSessionLog({ script: 'lookup-var', input: varName, hit: false })
    console.log(
      JSON.stringify({
        success: false,
        message: `No token mapped to ${varName}. If the value is hardcoded, run match-token.mjs instead.`,
        candidates: fuzzyCandidates(varName, varIndex)
      })
    )
    process.exit(0)
  }

  const recommended = pickRecommended(hits)
  const themePath = `${recommended.setName}.${recommended.pathStr}`
  const cssVariable = recommended.cssVar ?? toCssVariable(recommended.path)
  const usage = collectUsage(recommended)
  appendSessionLog({
    script: 'lookup-var',
    input: varName,
    hit: true,
    token: themePath,
    cssVariable,
    layer: recommended.setName,
    type: recommended.$type
  })
  console.log(
    JSON.stringify({
      success: true,
      cssVariable,
      themePath,
      cssValue: recommended.$value,
      usage,
      $type: recommended.$type,
      layer: recommended.setName,
      shortRef: recommended.pathStr
    })
  )
}

function loadRecords() {
  return loadCurrentTokenRecords().records
}

function collectUsage(record) {
  if (record.$type === 'color')
    return ['color', 'background-color', 'border-color', 'fill', 'stroke']
  if (record.$type === 'number') {
    const first = record.path[0]
    if (first === 'spacing') return ['gap', 'padding', 'margin', 'inset']
    if (first === 'radius') return ['border-radius']
    if (first === 'border') return ['border-width']
    if (first === 'size') return ['width', 'height', 'min-width', 'min-height']
    if (first?.startsWith('font'))
      return ['font-size', 'font-weight', 'line-height', 'letter-spacing']
  }
  return []
}

function toCssVariable(pathParts) {
  return `--${pathParts.join('-')}`
}

main()
