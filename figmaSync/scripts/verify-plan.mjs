/**
 * Verify Plan
 *
 * 对 PLAN.md 做反向校验，在 plan 阶段结束前确保契约可验证：
 *   1. §3 CSS 变量映射表的 CSS variable 与 /theme 路径是否存在
 *      - CSS variable 必须存在于 theme/dark CSS 源
 *      - /theme 路径必须能映射到当前变量记录
 *      - 未命中的 → fail
 *
 *   2. §2 组件映射决策的 apex-ui 组件 + props
 *      - 解析形如 `<Button type="primary" size="md" />` 的代码块
 *      - 读 node_modules/@frontend/apex-ui--react/dist/llm/<component>.txt 的 API 表
 *      - prop 不存在 → fail；prop 是枚举型但值不在枚举 → fail
 *
 *   3. §2.5 Icon 资产匹配的缺失项是否已确认
 *      - 缺失 icon 但用户确认仍为待确认 / 空 → fail
 *      - 缺失 icon 已说明导入方案、忽略策略或用户不关心 → pass
 *
 *   4. figma-plan.css 是否存在，且不包含 Panda CSS 相关内容
 *
 * 用法:
 *   pnpm figma:verify-plan path/to/PLAN.md
 *
 * 退出码:
 *   0 = 全通过 / 仅 warning
 *   1 = 有 fail
 */
import fs from 'node:fs'
import path from 'node:path'

import { loadCurrentTokenRecords } from './_shared/token-source.mjs'

const APEX_UI_DIST = 'node_modules/@frontend/apex-ui--react/dist/llm'

function main() {
  const planPath = process.argv[2]
  if (!planPath || !fs.existsSync(planPath)) {
    console.error('[verify-plan] usage: pnpm figma:verify-plan <path/to/PLAN.md>')
    process.exit(1)
  }

  const text = fs.readFileSync(planPath, 'utf-8')
  const failures = []
  const warnings = []
  const infos = []

  try {
    verifyCssVariables(text, failures, infos)
  } catch (err) {
    failures.push({ kind: 'css-variable-engine', message: err.message })
  }

  try {
    verifyApexUi(text, failures, warnings, infos)
  } catch (err) {
    failures.push({ kind: 'apex-ui-engine', message: err.message })
  }

  try {
    verifyIcons(text, failures, warnings, infos)
  } catch (err) {
    failures.push({ kind: 'icon-engine', message: err.message })
  }

  try {
    verifyCssDraft(text, planPath, failures, warnings, infos)
  } catch (err) {
    failures.push({ kind: 'css-draft-engine', message: err.message })
  }

  printReport({ failures, warnings, infos })
  process.exit(failures.length > 0 ? 1 : 0)
}

// ---------- §3 CSS variable 校验 ----------

function verifyCssVariables(text, failures, infos) {
  const section = extractSection(text, /^##\s+4\.\s+CSS\s+变量映射表/m)
  if (!section) {
    infos.push({ kind: 'css-variable', message: '§4 CSS 变量映射表未找到，跳过变量校验' })
    return
  }

  const records = loadTokenRecords()
  const fullPaths = new Set(records.map((r) => `${r.setName}.${r.pathStr}`))
  const cssVariables = new Set(records.map((r) => r.cssVar).filter(Boolean))

  const rows = parseTableRows(section, 8)
  let checked = 0
  for (const row of rows) {
    if (!row) continue
    const cssVariable = stripCodeMarkers(row.cells[2])
    const themePath = stripCodeMarkers(row.cells[3])
    const hitWay = stripCodeMarkers(row.cells[5])
    if (hitWay === '未命中') continue
    if (
      (!cssVariable || cssVariable === '-' || cssVariable === '—') &&
      (!themePath || themePath === '-')
    ) {
      continue
    }
    checked++
    if (!cssVariables.has(cssVariable)) {
      failures.push({
        kind: 'css-variable',
        ref: cssVariable,
        message: `§4 CSS variable "${cssVariable}" 不在 theme/dark CSS 源中`
      })
    }
    if (themePath && themePath !== '-' && themePath !== '—' && !fullPaths.has(themePath)) {
      failures.push({
        kind: 'css-variable',
        ref: themePath,
        message: `§4 /theme 路径 "${themePath}" 不在当前 theme 记录中`
      })
    }
  }
  infos.push({ kind: 'css-variable', message: `§4 CSS variable 校验完成，${checked} 行被检查` })
}

function loadTokenRecords() {
  return loadCurrentTokenRecords().records
}

// ---------- CSS 草案校验 ----------

function verifyCssDraft(text, planPath, failures, warnings, infos) {
  const cssDraftPath = readFrontmatterValue(text, 'cssDraftPath') ?? './figma-plan.css'
  const absolutePath = path.resolve(path.dirname(planPath), cssDraftPath)
  if (!fs.existsSync(absolutePath)) {
    failures.push({
      kind: 'css-draft',
      message: `CSS 草案不存在：${cssDraftPath}`
    })
    return
  }

  const source = fs.readFileSync(absolutePath, 'utf-8')
  const forbidden = source.match(/@pandacss|styled-system|css\(|cva\(|sva\(/g) ?? []
  if (forbidden.length > 0) {
    failures.push({
      kind: 'css-draft',
      message: `CSS 草案包含 Panda 相关内容：${[...new Set(forbidden)].join(', ')}`
    })
  }

  if (!/var\(--[a-zA-Z0-9_-]+/.test(source)) {
    warnings.push({
      kind: 'css-draft',
      message: 'CSS 草案未发现 CSS variable 引用；请确认设计稿是否确实没有可复用 /theme 变量'
    })
  }

  infos.push({ kind: 'css-draft', message: `CSS 草案已检查：${cssDraftPath}` })
}

// ---------- §2 apex-ui 校验 ----------

function verifyApexUi(text, failures, warnings, infos) {
  const section = extractSection(text, /^##\s+2\.\s+组件映射决策/m)
  if (!section) {
    infos.push({ kind: 'apex-ui', message: '§2 组件映射决策未找到，跳过 apex-ui 校验' })
    return
  }
  if (!fs.existsSync(APEX_UI_DIST)) {
    warnings.push({
      kind: 'apex-ui',
      message: `apex-ui llm 文档目录不存在：${APEX_UI_DIST}，跳过校验`
    })
    return
  }

  // 抓代码块中的 JSX 自闭合 / 普通标签，例如 `<Button type="primary" size="md" />` 或 `<Card extra={<X />}>`
  const tagRe = /<([A-Z][A-Za-z0-9]*)((?:\s+[a-zA-Z][\w-]*=(?:"[^"]*"|\{[^}]*\}))*)\s*\/?>/g
  let m
  const seen = new Set()
  while ((m = tagRe.exec(section)) !== null) {
    const tag = m[1]
    const attrs = parseAttrs(m[2])
    const key = `${tag}|${Object.keys(attrs).sort().join(',')}`
    if (seen.has(key)) continue
    seen.add(key)
    checkApexComponent(tag, attrs, { failures, warnings, infos })
  }
}

function parseAttrs(raw) {
  const out = {}
  const re = /([a-zA-Z][\w-]*)=(?:"([^"]*)"|\{([^}]*)\})/g
  let m
  while ((m = re.exec(raw)) !== null) {
    out[m[1]] = m[2] !== undefined ? { kind: 'string', value: m[2] } : { kind: 'expr', value: m[3] }
  }
  return out
}

function checkApexComponent(tag, attrs, { failures, warnings, infos }) {
  const docPath = findApexDoc(tag)
  if (!docPath) {
    warnings.push({
      kind: 'apex-ui',
      message: `§2 提到 <${tag} /> 但 apex-ui llm 文档里找不到，可能不是组件库组件`
    })
    return
  }
  const propTable = parseApiTable(fs.readFileSync(docPath, 'utf-8'))
  if (!propTable) {
    warnings.push({
      kind: 'apex-ui',
      message: `${docPath} 未找到 ## API 表，无法验证 <${tag} /> 的 props`
    })
    return
  }
  for (const [propName, propValue] of Object.entries(attrs)) {
    const meta = propTable[propName]
    if (!meta) {
      failures.push({
        kind: 'apex-ui',
        ref: `<${tag} ${propName}>`,
        message: `${tag} 不存在 prop "${propName}"（参见 ${docPath}）`
      })
      continue
    }
    if (propValue.kind === 'string' && meta.enumValues) {
      if (!meta.enumValues.includes(propValue.value)) {
        failures.push({
          kind: 'apex-ui',
          ref: `<${tag} ${propName}="${propValue.value}">`,
          message: `${tag}.${propName} 不接受 "${propValue.value}"；有效值：${meta.enumValues.join(' | ')}`
        })
      }
    }
  }
  infos.push({ kind: 'apex-ui', message: `<${tag} /> ${Object.keys(attrs).length} props 已校验` })
}

// ---------- §2.5 Icon 校验 ----------

function verifyIcons(text, failures, warnings, infos) {
  const section = extractSection(text, /^##\s+2\.5\s+Icon\s+资产匹配/m)
  if (!section) {
    failures.push({
      kind: 'icon',
      message: '§2.5 Icon 资产匹配未找到；plan 阶段必须输出 icon 清单和确认状态'
    })
    return
  }

  const rows = parseIconRows(section)
  if (rows.length === 0) {
    warnings.push({
      kind: 'icon',
      message: '§2.5 未解析到 icon 表格行；若设计稿无 icon，请明确写一行状态为 `忽略` 的说明'
    })
    return
  }

  let missing = 0
  let available = 0
  let ignored = 0
  for (const row of rows) {
    const figmaNode = stripCodeMarkers(row.cells[0])
    const semantic = stripCodeMarkers(row.cells[2])
    const matchedIcon = stripCodeMarkers(row.cells[3])
    const status = stripCodeMarkers(row.cells[5])
    const confirmation = stripCodeMarkers(row.cells[6])

    if (status === '可用') {
      available++
      if (!matchedIcon || matchedIcon === '-' || matchedIcon === '—') {
        failures.push({
          kind: 'icon',
          message: `§2.5 ${figmaNode || semantic || '未知 icon'} 标记为可用，但未填写匹配仓库 icon`
        })
      }
      continue
    }

    if (status === '缺失') {
      missing++
      if (!confirmation || confirmation === '-' || confirmation === '待确认') {
        failures.push({
          kind: 'icon',
          message: `§2.5 ${figmaNode || semantic || '未知 icon'} 缺失且未获得用户确认`
        })
      }
      continue
    }

    if (status === '忽略') {
      ignored++
      if (!confirmation || confirmation === '-' || confirmation === '待确认') {
        failures.push({
          kind: 'icon',
          message: `§2.5 ${figmaNode || semantic || '未知 icon'} 标记为忽略，但未写明用户确认`
        })
      }
      continue
    }

    warnings.push({
      kind: 'icon',
      message: `§2.5 ${figmaNode || semantic || '未知 icon'} 使用了未知状态 "${status}"`
    })
  }

  infos.push({
    kind: 'icon',
    message: `§2.5 icon 校验完成：可用 ${available} · 缺失 ${missing} · 忽略 ${ignored}`
  })
}

function parseIconRows(section) {
  return parseTableRows(section, 7).filter((row) => {
    const first = stripCodeMarkers(row.cells[0])
    if (!first) return false
    if (first === 'Figma 节点') return false
    if (first.startsWith('<')) return false
    return true
  })
}

function findApexDoc(tagName) {
  const candidates = [
    tagName,
    tagName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
  ]
  for (const c of candidates) {
    const p = path.join(APEX_UI_DIST, `${c}.txt`)
    if (fs.existsSync(p)) return p
  }
  return null
}

function splitMarkdownRow(row) {
  // 表格列的分隔是真 `|`；说明里 `\|` / `<br>` 等不应当切分。
  // 朴素做法：取 `|` 前后非 `\` 的位置作为分隔点。
  const cells = []
  let cur = ''
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '\\' && row[i + 1] === '|') {
      cur += '|'
      i++
      continue
    }
    if (ch === '|') {
      cells.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  cells.push(cur)
  return cells.slice(1, -1).map((c) => c.trim())
}

function parseApiTable(docText) {
  const section = extractSection(docText, /^##\s+API\s*$/m)
  if (!section) return null
  const lineRe = /^\|[^\n]+\|$/gm
  const rows = section.match(lineRe) ?? []
  const out = {}
  for (const row of rows) {
    if (/^\|\s*-+/.test(row)) continue
    if (/^\|\s*属性\s*\|/.test(row)) continue
    const cells = splitMarkdownRow(row)
    if (cells.length < 3) continue
    const name = cells[0].replace(/`/g, '').trim()
    if (!name) continue
    const typeCell = cells[2] ?? ''
    const enumValues = extractEnumValues(typeCell)
    out[name] = { type: typeCell, enumValues }
  }
  return out
}

function extractEnumValues(typeCell) {
  // 形如 `'default' \| 'primary' \| 'danger'`
  const strLits = [...typeCell.matchAll(/'([^']+)'/g)].map((m) => m[1])
  if (strLits.length >= 2 && typeCell.includes('|')) return strLits
  return null
}

// ---------- 公共工具 ----------

function extractSection(text, headRe) {
  const headMatch = headRe.exec(text)
  if (!headMatch) return null
  const start = headMatch.index + headMatch[0].length
  const tail = text.slice(start)
  const nextRe = /^##\s/m
  const nextMatch = nextRe.exec(tail)
  return nextMatch ? tail.slice(0, nextMatch.index) : tail
}

function parseTableRows(section, minCells) {
  const lineRe = /^\|[^\n]+\|$/gm
  const rows = section.match(lineRe) ?? []
  return rows
    .filter((row) => !/^\|\s*-+/.test(row))
    .filter((row) => !/^\|\s*来源|^\|\s*属性|^\|\s*#/.test(row))
    .filter((row) => !/^\|\s*<|^\|\s*\(占位/.test(row))
    .map((row) => {
      const cells = row
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim())
      if (cells.length < minCells) return null
      return { cells }
    })
    .filter(Boolean)
}

function stripCodeMarkers(s) {
  return (s ?? '').replace(/`/g, '').trim()
}

function readFrontmatterValue(text, key) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end === -1) return null
  const frontmatter = text.slice(3, end)
  const line = frontmatter.split('\n').find((item) => item.trim().startsWith(`${key}:`))
  if (!line) return null
  return (
    line
      .slice(line.indexOf(':') + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '') || null
  )
}

function printReport({ failures, warnings, infos }) {
  const groups = [
    ['❌ FAIL', failures],
    ['⚠️  WARN', warnings],
    ['ℹ️  INFO', infos]
  ]
  for (const [label, items] of groups) {
    if (items.length === 0) continue
    console.log(`\n${label}`)
    for (const it of items) {
      console.log(`  · [${it.kind}] ${it.message}`)
    }
  }
  console.log(
    `\n[figma:verify-plan] ${failures.length} fail · ${warnings.length} warn · ${infos.length} info`
  )
  if (failures.length === 0) {
    console.log('✅ PLAN.md passes reverse verification.')
  }
}

main()
