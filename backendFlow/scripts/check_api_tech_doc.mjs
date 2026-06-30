import { readFileSync } from 'node:fs'

const REQUIRED_SECTIONS = [
  '接口设计',
  '数据模型 / 数据库设计',
  '核心流程 / 时序',
  '边界与异常',
  '风险与待确认项'
]

const OPTIONAL_SECTIONS = ['背景与目标', '范围与非目标', '依赖与非功能性', '完成标准']

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasSection(markdown, title) {
  return new RegExp(`^#{1,3}\\s+${escapeRegExp(title)}\\s*$`, 'm').test(markdown)
}

function getSection(markdown, title) {
  const pattern = new RegExp(`^(#{1,3})\\s+${escapeRegExp(title)}\\s*$`, 'm')
  const match = pattern.exec(markdown)
  if (!match) return ''

  const level = match[1].length
  const start = match.index + match[0].length
  const rest = markdown.slice(start)
  const lines = rest.split('\n')
  const collected = []

  // 收集到下一个同级或更高级标题为止，保留章节内的 ## / ### 子节内容。
  for (const line of lines) {
    const heading = /^(#{1,6})\s+/.exec(line)
    if (heading && heading[1].length <= level) break
    collected.push(line)
  }

  return collected.join('\n')
}

function hasTable(section) {
  return /\|.+\|\s*\n\|[\s:|-]+\|/.test(section)
}

function hasTsBlock(section) {
  return /```(typescript|ts)[\s\S]*?```/.test(section)
}

function hasMermaid(section) {
  return /```mermaid[\s\S]*?```/.test(section)
}

export function checkApiTechDoc(markdown, options = {}) {
  const optional = options.optional || []
  const issues = []

  for (const title of REQUIRED_SECTIONS) {
    if (!hasSection(markdown, title)) {
      issues.push(`缺少必写章节：${title}`)
    }
  }

  for (const title of optional) {
    if (!OPTIONAL_SECTIONS.includes(title)) {
      issues.push(`未知可选章节名：${title}`)
      continue
    }
    if (!hasSection(markdown, title)) {
      issues.push(`已选可选章节缺失：${title}`)
    }
  }

  const apiSection = getSection(markdown, '接口设计')
  if (apiSection) {
    if (!/\|\s*位置\s*\|/.test(apiSection)) {
      issues.push('接口设计缺少入参表「位置」列（需区分 path/query/body）')
    }
    if (!/"code"/.test(apiSection) || !/"data"/.test(apiSection)) {
      issues.push('接口设计出参未使用 { code, data, message } 统一包裹')
    }
    if (!/触发条件/.test(apiSection)) {
      issues.push('接口设计缺少错误码清单（含「触发条件」列）')
    }
  }

  const modelSection = getSection(markdown, '数据模型 / 数据库设计')
  if (modelSection) {
    if (!hasTable(modelSection)) {
      issues.push('数据模型缺少字段表格')
    }
    if (!hasTsBlock(modelSection)) {
      issues.push('数据模型缺少 TypeScript 代码块')
    }
  }

  const flowSection = getSection(markdown, '核心流程 / 时序')
  if (flowSection && !hasMermaid(flowSection)) {
    issues.push('核心流程 / 时序缺少 Mermaid 图')
  }

  const riskSection = getSection(markdown, '风险与待确认项')
  if (riskSection && riskSection.trim().length < 10) {
    issues.push('风险与待确认项为空')
  }

  const lines = markdown.split('\n')
  let inFence = false
  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
    if (!heading) continue

    if (heading[1].length > 3) {
      issues.push(`标题层级超过三级（飞书仅支持 H1-H3）：${line.trim()}`)
    }
    if (/^\s*\d+\s*[.、)]/.test(heading[2])) {
      issues.push(`标题不得手写序号：${heading[2]}`)
    }
  }

  return { ok: issues.length === 0, issues }
}

function parseFlags(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (!item.startsWith('--')) continue
    const key = item.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    index += 1
  }
  return args
}

function main() {
  const args = parseFlags(process.argv.slice(2))
  if (!args.file || args.file === true) {
    console.error('Usage: node check_api_tech_doc.mjs --file <markdown> [--optional "背景与目标,完成标准"]')
    process.exit(2)
  }

  const optional =
    typeof args.optional === 'string'
      ? args.optional.split(',').map((value) => value.trim()).filter(Boolean)
      : []

  const markdown = readFileSync(args.file, 'utf8')
  const result = checkApiTechDoc(markdown, { optional })

  if (result.ok) {
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  }

  console.error(JSON.stringify(result, null, 2))
  process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
