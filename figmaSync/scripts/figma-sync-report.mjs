/**
 * Figma Sync Report
 *
 * 把本次 figmaSync 任务的「AI 做了什么」与「产物长什么样」交叉量化输出。
 *
 * 用法:
 *   pnpm figma:report                                # 默认 plan 命令、写到 .agent/skills/figmaSync/
 *   pnpm figma:report --command=plan|apply           # 报告文件名前缀：session-report-<command>.md
 *   pnpm figma:report --target-dir=src/foo           # 同时把报告复制一份到指定目录
 *   pnpm figma:report --plan=src/foo/PLAN.md         # 解析该 PLAN.md §4 表格，统计 variables 来源
 *   pnpm figma:report --reset                        # 清空 session log（任务开始时调）
 *
 * 主指标（新版排序）：
 *   1. 硬编码计数（产物侧）—— 需要解释
 *   2. CSS variables 命中数（解析 PLAN §4 表格）
 *   3. 脚本调用率 lookupVar / matchToken —— 辅助参考
 *
 * 告警条件：
 *   - 硬编码 > 0 → ⚠️
 *   - Fast Path 覆盖率 < 50% 且 PLAN.md §4 无 variables 来源 → ⚠️
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { readSessionLog, resetSessionLog } from './_shared/session-log.mjs'

const DEFAULT_REPORT_DIR = '.agent/skills/figmaSync'
const FAST_PATH_LOW_THRESHOLD = 0.5

function parseArgs(argv) {
  const out = { reset: false, command: 'plan', targetDir: null, plan: null }
  for (const arg of argv.slice(2)) {
    if (arg === '--reset') out.reset = true
    else if (arg.startsWith('--command=')) out.command = arg.slice('--command='.length)
    else if (arg.startsWith('--target-dir=')) out.targetDir = arg.slice('--target-dir='.length)
    else if (arg.startsWith('--plan=')) out.plan = arg.slice('--plan='.length)
  }
  if (!['plan', 'apply'].includes(out.command)) out.command = 'plan'
  return out
}

function getChangedFiles() {
  try {
    const out = execSync('git status --porcelain', { encoding: 'utf-8' })
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => ({
        status: line.slice(0, 2).trim(),
        file: line.slice(3).replace(/^"|"$/g, '')
      }))
      .filter((c) => /\.(ts|tsx|css|md)$/.test(c.file))
      .filter((c) => fs.existsSync(c.file))
  } catch {
    return []
  }
}

function auditFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8')
  const apexImports = []
  const apexImportRe = /import\s+\{([^}]+)\}\s+from\s+['"]@frontend\/apex-ui--react['"]/g
  let m
  while ((m = apexImportRe.exec(source)) !== null) {
    const names = m[1]
      .split(',')
      .map((n) => n.replace(/\bas\s+\w+/, '').trim())
      .filter(Boolean)
    apexImports.push(...names)
  }

  const cssVariables = {}
  const cssVarRe = /var\(\s*(--[a-zA-Z0-9_-]+)/g
  while ((m = cssVarRe.exec(source)) !== null) {
    cssVariables[m[1]] = (cssVariables[m[1]] ?? 0) + 1
  }

  const hardcodedRe = /(['"`])(#[0-9a-fA-F]{3,8})\1|\b(\d{2,4})px\b/g
  const hardcoded = []
  while ((m = hardcodedRe.exec(source)) !== null) {
    const raw = m[2] ?? m[3] + 'px'
    const before = source.lastIndexOf('\n', m.index)
    const lineIdx = source.slice(0, m.index).split('\n').length
    const snippet = source.slice(before + 1, source.indexOf('\n', m.index)).trim()
    hardcoded.push({ value: raw, line: lineIdx, snippet })
  }

  const commonRefs = []
  const commonImportRe = /from\s+['"]([^'"]*src\/common[^'"]*|[^'"]*\/common\/[^'"]*)['"]/g
  while ((m = commonImportRe.exec(source)) !== null) commonRefs.push(m[1])

  const pandaForbidden = []
  const forbiddenRe = /@pandacss|styled-system|css\(|cva\(|sva\(/g
  while ((m = forbiddenRe.exec(source)) !== null) {
    const lineIdx = source.slice(0, m.index).split('\n').length
    pandaForbidden.push({ value: m[0], line: lineIdx })
  }

  return { apexImports, cssVariables, hardcoded, commonRefs, pandaForbidden }
}

function aggregate(files) {
  const acc = {
    apexImports: {},
    cssVariables: {},
    hardcoded: [],
    commonRefs: {},
    pandaForbidden: [],
    files: []
  }
  for (const file of files) {
    const r = auditFile(file)
    if (
      r.apexImports.length === 0 &&
      Object.keys(r.cssVariables).length === 0 &&
      r.hardcoded.length === 0 &&
      r.commonRefs.length === 0 &&
      r.pandaForbidden.length === 0
    )
      continue
    acc.files.push(file)
    for (const name of r.apexImports) acc.apexImports[name] = (acc.apexImports[name] ?? 0) + 1
    for (const [k, v] of Object.entries(r.cssVariables))
      acc.cssVariables[k] = (acc.cssVariables[k] ?? 0) + v
    for (const h of r.hardcoded) acc.hardcoded.push({ ...h, file })
    for (const ref of r.commonRefs) acc.commonRefs[ref] = (acc.commonRefs[ref] ?? 0) + 1
    for (const hit of r.pandaForbidden) acc.pandaForbidden.push({ ...hit, file })
  }
  return acc
}

function auditForbiddenFiles(changedFiles) {
  const forbidden = [
    'src/routeTree.gen.ts',
    'src/services/request.ts',
    'src/shared/wujie-bridge.ts',
    'src/stores/shell-store.ts'
  ]
  return changedFiles
    .map((c) => c.file)
    .filter((file) => forbidden.includes(file) || file.startsWith('src/common/'))
}

function tallyLog(log) {
  const summary = {
    lookupVar: { hit: 0, miss: 0, byLayer: {} },
    matchToken: { hit: 0, miss: 0, byLayer: {} },
    misses: []
  }
  for (const entry of log) {
    const target =
      entry.script === 'lookup-var'
        ? summary.lookupVar
        : entry.script === 'match-token'
          ? summary.matchToken
          : null
    if (!target) continue
    if (entry.hit) {
      target.hit++
      const layer = entry.layer ?? 'unknown'
      target.byLayer[layer] = (target.byLayer[layer] ?? 0) + 1
    } else {
      target.miss++
      summary.misses.push({ script: entry.script, input: entry.input })
    }
  }
  return summary
}

/**
 * 解析 PLAN.md §4 「CSS 变量映射表」，统计「命中方式」列里 variables 来源出现次数。
 * 表格契约（PLAN.md.tpl 强制）：列顺序为 来源 | 类型 | CSS variable | /theme 路径 | 原始值 | 命中方式 | nodeId | designContextStatus。
 * 命中方式取值约定：
 *   - "Fast Path 0 (variables)" → MCP get_variable_defs 直接命中
 *   - "Fast Path 1"              → lookup-var 命中
 *   - "Slow Path"                → match-token 命中
 *   - "未命中"                   → 降级
 */
function parsePlanTokenTable(planPath) {
  if (!planPath || !fs.existsSync(planPath)) {
    return { source: 'none', stats: null }
  }
  const text = fs.readFileSync(planPath, 'utf-8')
  // 切 §4 整段：从 "## 4. CSS 变量映射表" 到下一个 "## " 之间（不含下一个标题）
  const headRe = /^##\s+4\.\s+CSS\s+变量映射表\s*$/m
  const headMatch = headRe.exec(text)
  if (!headMatch) return { source: planPath, stats: null }
  const start = headMatch.index + headMatch[0].length
  const tail = text.slice(start)
  const nextRe = /^##\s/m
  const nextMatch = nextRe.exec(tail)
  const section = nextMatch ? tail.slice(0, nextMatch.index) : tail

  const lineRe = /^\|[^\n]+\|$/gm
  const rows = section.match(lineRe) ?? []
  const stats = {
    'Fast Path 0 (variables)': 0,
    'Fast Path 1 (lookup-var)': 0,
    'Slow Path (value-match)': 0,
    未命中: 0
  }
  for (const row of rows) {
    if (/^\|\s*-+/.test(row)) continue
    if (/来源(Figma|（Figma）)|命中方式|CSS variable/.test(row)) continue
    if (/^\|\s*<|^\|\s*\(占位/.test(row)) continue
    const cells = row
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
    const hitWay = cells[5] ?? ''
    for (const key of Object.keys(stats)) {
      if (hitWay.includes(key)) stats[key]++
    }
  }
  return { source: planPath, stats }
}

function renderReport({
  log,
  audit,
  planTokens,
  generatedAt,
  command,
  changedFiles,
  forbiddenFiles
}) {
  const lines = []
  lines.push(`# figmaSync Session Report (${command}) — ${generatedAt}`)
  lines.push('')

  lines.push('## Review 摘要')
  lines.push('')
  lines.push(`- 改动文件：${changedFiles.length} 个`)
  lines.push(
    `- 禁止 / 高风险文件命中：${forbiddenFiles.length} 个${forbiddenFiles.length === 0 ? ' ✅' : ' ⚠️'}`
  )
  lines.push(
    `- Panda / styled-system 禁用内容：${audit.pandaForbidden.length} 处${audit.pandaForbidden.length === 0 ? ' ✅' : ' ⚠️'}`
  )
  lines.push(
    `- 硬编码嫌疑：${audit.hardcoded.length} 处${audit.hardcoded.length === 0 ? ' ✅' : ' ⚠️'}`
  )
  lines.push('')

  lines.push('## 改动文件')
  lines.push('')
  if (changedFiles.length === 0) {
    lines.push('- 未检测到工作树改动')
  } else {
    for (const file of changedFiles) lines.push(`- ${file.status || '??'} ${file.file}`)
  }
  lines.push('')

  lines.push('## 成功项 / 跳过项 / 风险项')
  lines.push('')
  const success = []
  const skipped = []
  const risks = []
  if (Object.keys(audit.cssVariables).length > 0) success.push('使用 CSS variables')
  else skipped.push('未检测到 CSS variable 引用')
  if (Object.keys(audit.apexImports).length > 0) success.push('复用 Apex UI 组件')
  else skipped.push('未检测到 Apex UI import')
  if (Object.keys(audit.commonRefs).length > 0) success.push('复用 common module')
  if (audit.hardcoded.length > 0) risks.push('存在硬编码嫌疑，需要解释或确认')
  if (audit.pandaForbidden.length > 0) risks.push('存在 Panda / styled-system 禁用内容')
  if (forbiddenFiles.length > 0) risks.push('命中禁止或高风险文件，需要 Human 再确认')
  lines.push(`- 成功项：${success.length > 0 ? success.join('；') : '无自动识别项'}`)
  lines.push(`- 跳过项：${skipped.length > 0 ? skipped.join('；') : '无'}`)
  lines.push(`- 风险项：${risks.length > 0 ? risks.join('；') : '无'}`)
  lines.push('')

  if (forbiddenFiles.length > 0) {
    lines.push('## 禁止 / 高风险文件')
    lines.push('')
    for (const file of forbiddenFiles) lines.push(`- ${file}`)
    lines.push('')
  }

  // ---------- 主指标 ----------
  lines.push('## 🎯 主指标')
  lines.push('')
  const hardcodedCount = audit.hardcoded.length
  lines.push(`- 硬编码嫌疑：${hardcodedCount} ${hardcodedCount === 0 ? '✅' : '⚠️ 需解释'}`)

  let variablesHits = 0
  if (planTokens.stats) {
    variablesHits = planTokens.stats['Fast Path 0 (variables)'] ?? 0
    const total = Object.values(planTokens.stats).reduce((a, b) => a + b, 0)
    lines.push(`- PLAN §4 CSS variable 命中分布（共 ${total} 行）：`)
    for (const [key, n] of Object.entries(planTokens.stats)) {
      lines.push(`    - ${key}: ${n}`)
    }
  } else if (planTokens.source !== 'none') {
    lines.push(`- PLAN §4 CSS variable 表格解析失败（${planTokens.source}）`)
  } else {
    lines.push('- PLAN §4 CSS variable 表格：未指定 --plan 路径，跳过解析')
  }

  const fastTotal = log.lookupVar.hit + log.lookupVar.miss
  const allLookupTotal = fastTotal + log.matchToken.hit + log.matchToken.miss
  const fastCoverage = allLookupTotal > 0 ? log.lookupVar.hit / allLookupTotal : null
  if (fastCoverage !== null) {
    const pct = Math.round(fastCoverage * 100)
    lines.push(`- 脚本调用率（辅助参考）：lookup-var ${pct}% / 总查询 ${allLookupTotal}`)
    if (fastCoverage < FAST_PATH_LOW_THRESHOLD && variablesHits === 0) {
      lines.push(
        '    - ⚠️ 调用率 < 50% 且 PLAN §4 无 variables 来源；AI 既没查脚本也没标 variables 命中'
      )
    }
  } else {
    lines.push('- 脚本调用率（辅助参考）：本 session 未触发匹配脚本')
  }
  lines.push('')

  // ---------- AI 行为 ----------
  lines.push('## 🔎 AI 调用轨迹')
  lines.push('')
  const total = log.lookupVar.hit + log.lookupVar.miss + log.matchToken.hit + log.matchToken.miss
  if (total === 0) {
    lines.push('- 本 session 未调用 lookup-var / match-token')
  } else {
    lines.push(`- lookup-var 命中：${log.lookupVar.hit} / ${fastTotal}`)
    for (const [layer, n] of Object.entries(log.lookupVar.byLayer)) {
      lines.push(`    - ${layer}.* × ${n}`)
    }
    const slowTotal = log.matchToken.hit + log.matchToken.miss
    if (slowTotal > 0) {
      lines.push(`- match-token 命中：${log.matchToken.hit} / ${slowTotal}`)
      for (const [layer, n] of Object.entries(log.matchToken.byLayer)) {
        lines.push(`    - 推荐 ${layer} 层 × ${n}`)
      }
    } else {
      lines.push('- match-token 本次未触发')
    }
    if (log.misses.length > 0) {
      lines.push('- 未命中输入：')
      for (const miss of log.misses) {
        lines.push(`    - \`${miss.script}\`  ← \`${miss.input}\``)
      }
    }
  }
  lines.push('')

  // ---------- 产物审计 ----------
  lines.push('## 📦 产物审计')
  lines.push('')
  if (audit.files.length === 0) {
    lines.push('- 未在工作树中检测到相关 ts/tsx 改动')
  } else {
    lines.push(`改动文件：${audit.files.length} 个`)
    for (const f of audit.files) lines.push(`  - ${f}`)
    lines.push('')

    const apexEntries = Object.entries(audit.apexImports)
    if (apexEntries.length > 0) {
      lines.push(`apex-ui 组件复用：${apexEntries.length} 种`)
      for (const [name, n] of apexEntries) lines.push(`  - ${name} × ${n}`)
      lines.push('')
    } else {
      lines.push('apex-ui 组件复用：0  ⚠️ 检查是否漏用组件库')
      lines.push('')
    }

    const variableEntries = Object.entries(audit.cssVariables)
    if (variableEntries.length > 0) {
      lines.push('CSS variable 引用：')
      for (const [name, n] of variableEntries) lines.push(`  - ${name} × ${n}`)
      lines.push('')
    }

    const commonEntries = Object.entries(audit.commonRefs)
    if (commonEntries.length > 0) {
      lines.push('common component / common module 复用：')
      for (const [ref, n] of commonEntries) lines.push(`  - ${ref} × ${n}`)
      lines.push('')
    }

    if (audit.hardcoded.length > 0) {
      lines.push(`硬编码嫌疑：${audit.hardcoded.length} 处`)
      for (const h of audit.hardcoded) {
        lines.push(`  - ${h.file}:${h.line}  \`${h.value}\`  — ${h.snippet}`)
      }
      lines.push('')
    } else {
      lines.push('硬编码嫌疑：0 ✅')
      lines.push('')
    }

    if (audit.pandaForbidden.length > 0) {
      lines.push(`Panda 禁用内容：${audit.pandaForbidden.length} 处 ⚠️`)
      for (const hit of audit.pandaForbidden) {
        lines.push(`  - ${hit.file}:${hit.line}  \`${hit.value}\``)
      }
      lines.push('')
    }
  }

  return lines.join('\n') + '\n'
}

function writeReport({ report, command, targetDir }) {
  const fileName = `session-report-${command}.md`
  const primary = path.join(DEFAULT_REPORT_DIR, fileName)
  fs.mkdirSync(DEFAULT_REPORT_DIR, { recursive: true })
  fs.writeFileSync(primary, report)
  const written = [primary]

  if (targetDir) {
    fs.mkdirSync(targetDir, { recursive: true })
    const copy = path.join(targetDir, fileName)
    fs.writeFileSync(copy, report)
    written.push(copy)
  }
  return written
}

function main() {
  const args = parseArgs(process.argv)
  if (args.reset) {
    resetSessionLog()
    console.log('[figma:report] session log reset.')
    return
  }

  const log = tallyLog(readSessionLog())
  const changedFiles = getChangedFiles()
  const audit = aggregate(
    changedFiles.filter((c) => /\.(ts|tsx|css)$/.test(c.file)).map((c) => c.file)
  )
  const planTokens = parsePlanTokenTable(args.plan)
  const forbiddenFiles = auditForbiddenFiles(changedFiles)
  const report = renderReport({
    log,
    audit,
    planTokens,
    command: args.command,
    changedFiles,
    forbiddenFiles,
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  })

  const written = writeReport({ report, command: args.command, targetDir: args.targetDir })
  console.log(report)
  for (const w of written) console.log(`[figma:report] saved -> ${w}`)
}

main()
