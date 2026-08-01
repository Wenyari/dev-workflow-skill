import { readFileSync } from 'node:fs'

import {
  extractMermaidBlocks,
  inspectMermaidMarkdown,
  SUPPORTED_MERMAID_TYPES
} from '../../../../tools/mermaid/inspect.mjs'

const REQUIRED_SECTIONS = [
  '核心流程 / 时序',
  '数据模型 / 数据库设计',
  '接口设计',
  '边界与异常',
  '风险与待确认项'
]

const ORDERED_DESIGN_SECTIONS = ['核心流程 / 时序', '数据模型 / 数据库设计', '接口设计']

const OPTIONAL_SECTIONS = ['背景与目标', '范围与非目标', '依赖与非功能性', '完成标准']

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasSection(markdown, title) {
  return new RegExp(`^#{1,3}\\s+${escapeRegExp(title)}\\s*$`, 'm').test(markdown)
}

function getSectionStart(markdown, title) {
  const match = new RegExp(`^#{1,3}\\s+${escapeRegExp(title)}\\s*$`, 'm').exec(markdown)
  return match ? match.index : -1
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

function countTsBlocks(section) {
  return (section.match(/```(?:typescript|ts)[^\n]*\n[\s\S]*?```/g) || []).length
}

function getHeadingEntries(section, level) {
  const marker = '#'.repeat(level)
  const pattern = new RegExp(`^${marker}\\s+(.+?)\\s*$`, 'gm')
  const matches = [...section.matchAll(pattern)]

  return matches.map((match, index) => {
    const next = matches[index + 1]
    return {
      title: match[1].trim(),
      content: section.slice(match.index + match[0].length, next ? next.index : section.length)
    }
  })
}

function hasBoldLabel(section, label) {
  return new RegExp(`\\*\\*${escapeRegExp(label)}\\*\\*`).test(section)
}

function hasNonemptyErrorCodes(section) {
  return /\*\*错误码\*\*\s*[\uff1a:]\s*\S+/.test(section)
}

function isUpdateApiEntry(title) {
  if (/\b(?:PUT|PATCH)\b/i.test(title)) return true

  const displayName = title.split('·')[0].trim()
  if (/^(?:更新|编辑|修改|变更|启用|禁用|调整|切换)/.test(displayName)) return true

  return /\bPOST\b.*\/(?:update|edit|modify|change[-_]?status|set[-_]?status|enable|disable)(?:\/|\b)/i.test(
    title
  )
}

function hasConcurrencyControl(section) {
  const match = /\*\*并发控制\*\*\s*[\uff1a:]\s*([^\n]+)/.exec(section)
  if (!match) return false

  const statement = match[1].trim()
  if (!statement || /^<[^>]+>$/.test(statement) || statement === '无') return false

  return /expectedUpdatedAt|expectedVersion|\bversion\b|版本号|乐观锁|If-Match|ETag|\bCAS\b|compare-and-swap|条件更新|行锁|悲观锁|串行化|serializable|不采用乐观锁|无需乐观锁/i.test(
    statement
  )
}

function getProseWithoutFences(markdown) {
  return markdown.replace(/```[^\n]*\n[\s\S]*?```/g, '')
}

function hasDiagramGoal(segment) {
  return /\*\*(?:主图)?图示目标\*\*\s*[：:]\s*\S+/.test(segment)
}

function hasDiagramConclusion(segment) {
  const heading = /\*\*关键结论(?:\s*\/\s*不变量)?\*\*/.exec(segment)
  if (!heading) return false

  const body = segment.slice(heading.index + heading[0].length)
  return /^\s*[-*]\s+\S+/.test(body)
}

function hasNoDiagramReason(section) {
  return /\*\*无需配图原因\*\*\s*[\uff1a:]\s*\S+/.test(section)
}

function getPreviousHeadingEnd(markdown, position) {
  const prefix = markdown.slice(0, position)
  const matches = [...prefix.matchAll(/^#{1,6}\s+.+?\s*$/gm)]
  if (matches.length === 0) return 0
  const match = matches[matches.length - 1]
  return match.index + match[0].length
}

function getNextHeadingStart(markdown, position) {
  const suffix = markdown.slice(position)
  const match = /^#{1,6}\s+.+?\s*$/m.exec(suffix)
  return match ? position + match.index : markdown.length
}

export function checkApiTechDoc(markdown, options = {}) {
  const optional = options.optional || []
  const issues = []

  for (const title of REQUIRED_SECTIONS) {
    if (!hasSection(markdown, title)) {
      issues.push(`缺少必写章节：${title}`)
    }
  }

  const orderedStarts = ORDERED_DESIGN_SECTIONS.map((title) => ({
    title,
    start: getSectionStart(markdown, title)
  })).filter((item) => item.start >= 0)

  for (let index = 1; index < orderedStarts.length; index += 1) {
    const previous = orderedStarts[index - 1]
    const current = orderedStarts[index]
    if (previous.start > current.start) {
      issues.push(`章节顺序错误：${previous.title} 应早于 ${current.title}`)
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
    const apiEntries = getHeadingEntries(apiSection, 3)
    if (apiEntries.length === 0) {
      issues.push('接口设计缺少三级标题接口条目')
    }

    for (const entry of apiEntries) {
      const prefix = `接口「${entry.title}」`
      if (!hasBoldLabel(entry.content, '用途')) issues.push(`${prefix}缺少“用途”`)
      if (!hasBoldLabel(entry.content, '入参')) issues.push(`${prefix}缺少“入参”`)
      if (!hasTable(entry.content)) issues.push(`${prefix}缺少入参表格`)
      if (!hasBoldLabel(entry.content, '出参')) issues.push(`${prefix}缺少“出参”`)
      if (countTsBlocks(entry.content) < 2) {
        issues.push(`${prefix}缺少入参 DTO 或出参 data 的 TypeScript 代码块`)
      }
      if (!hasBoldLabel(entry.content, '说明')) issues.push(`${prefix}缺少“说明”`)
      if (isUpdateApiEntry(entry.title) && !hasConcurrencyControl(entry.content)) {
        issues.push(
          `${prefix}属于更新类接口，缺少可复核的“并发控制”；请说明 expectedUpdatedAt / version 等冲突检测语义，或不采用乐观锁的依据与替代保护`
        )
      }
      if (!hasNonemptyErrorCodes(entry.content)) issues.push(`${prefix}缺少非空的“错误码”`)
    }
  }

  const modelSection = getSection(markdown, '数据模型 / 数据库设计')
  if (modelSection) {
    const modelEntries = getHeadingEntries(modelSection, 2)
    if (modelEntries.length === 0) {
      issues.push('数据模型缺少二级标题实体 / 表条目')
    }

    for (const entry of modelEntries) {
      const prefix = `实体 / 表「${entry.title}」`
      if (!hasTable(entry.content)) issues.push(`${prefix}缺少字段表格`)
      if (!hasTsBlock(entry.content)) issues.push(`${prefix}缺少 TypeScript 代码块`)
    }
  }

  const flowSection = getSection(markdown, '核心流程 / 时序')
  if (flowSection) {
    const flowMermaidCount = extractMermaidBlocks(flowSection).length
    const noDiagramReason = hasNoDiagramReason(flowSection)
    if (flowMermaidCount === 0 && !noDiagramReason) {
      issues.push('核心流程 / 时序必须提供 Mermaid 主图或非空的“无需配图原因”')
    }
    if (flowMermaidCount > 0 && noDiagramReason) {
      issues.push('核心流程 / 时序不能同时包含 Mermaid 图和“无需配图原因”')
    }
  }

  const mermaidBlocks = inspectMermaidMarkdown(markdown).diagrams
  for (let index = 0; index < mermaidBlocks.length; index += 1) {
    const block = mermaidBlocks[index]
    const previousEnd = index === 0 ? 0 : mermaidBlocks[index - 1].end
    const nextStart = index === mermaidBlocks.length - 1 ? markdown.length : mermaidBlocks[index + 1].start
    const localStart = Math.max(previousEnd, getPreviousHeadingEnd(markdown, block.start))
    const localEnd = Math.min(nextStart, getNextHeadingStart(markdown, block.end))
    const before = markdown.slice(localStart, block.start)
    const after = markdown.slice(block.end, localEnd)
    const label = `第 ${index + 1} 张 Mermaid 图`

    if (!block.supported) {
      issues.push(`${label}类型不受支持，仅支持 ${SUPPORTED_MERMAID_TYPES.join('、')}`)
    } else if (!block.hasStructure) {
      issues.push(`${label}缺少有效的关系、交互或状态流转，不能只保留图型空壳`)
    }

    if (!hasDiagramGoal(before)) {
      issues.push(`${label}前缺少非空的“图示目标”`)
    }
    if (!hasDiagramConclusion(after)) {
      issues.push(`${label}后缺少非空的“关键结论 / 不变量” bullet`)
    }
  }

  const riskSection = getSection(markdown, '风险与待确认项')
  if (riskSection && riskSection.trim().length < 10) {
    issues.push('风险与待确认项为空')
  }

  const prose = getProseWithoutFences(markdown)
  if (/<!--[\s\S]*?-->/.test(prose)) {
    issues.push('正式文档不得保留 HTML 模板注释')
  }
  const proseWithoutComments = prose.replace(/<!--[\s\S]*?-->/g, '')
  const placeholder = /<(?:这张|事务|本方案|实体|表名|name|模块|接口|module|action)[^>\n]{0,120}>/.exec(proseWithoutComments)
  if (placeholder) {
    issues.push(`正式文档仍包含模板占位符：${placeholder[0]}`)
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
