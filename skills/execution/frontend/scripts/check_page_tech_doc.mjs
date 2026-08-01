#!/usr/bin/env node

import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const DEFAULT_DATA_FLOW_SOURCE = `flowchart LR
  A["用户操作"] --> B["页面状态"]
  B --> C["接口请求"]
  C --> D["页面展示"]`

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasSection(markdown, title) {
  return new RegExp(`^#{1,6}\\s+${escapeRegExp(title)}\\s*$`, 'm').test(markdown)
}

function getSection(markdown, title) {
  const pattern = new RegExp(`^(#{1,6})\\s+${escapeRegExp(title)}\\s*$`, 'm')
  const match = pattern.exec(markdown)
  if (!match) return ''

  const level = match[1].length
  const start = match.index + match[0].length
  const lines = markdown.slice(start).split('\n')
  const collected = []

  for (const line of lines) {
    const heading = /^(#{1,6})\s+/.exec(line)
    if (heading && heading[1].length <= level) break
    collected.push(line)
  }

  return collected.join('\n')
}

function hasMarkdownTable(section) {
  return /\|.+\|\s*\n\|[\s:|-]+\|/.test(section)
}

function getMermaidBlocks(markdown) {
  const blocks = []
  const pattern = /```mermaid[^\n]*\n([\s\S]*?)```/g
  let match

  while ((match = pattern.exec(markdown)) !== null) {
    blocks.push({
      source: match[1].trim(),
      start: match.index,
      end: pattern.lastIndex
    })
  }

  return blocks
}

function getMermaidType(source) {
  const firstLine = source.split('\n').map((line) => line.trim()).find(Boolean) || ''

  if (/^sequenceDiagram\b/.test(firstLine)) return 'sequenceDiagram'
  if (/^flowchart\s+(?:TD|TB|BT|LR|RL)\b/.test(firstLine)) return 'flowchart'
  if (/^stateDiagram-v2\b/.test(firstLine)) return 'stateDiagram-v2'
  if (/^erDiagram\b/.test(firstLine)) return 'erDiagram'
  return ''
}

function hasStructuralStatement(source, type) {
  const body = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('%%'))
    .slice(1)
    .join('\n')

  if (type === 'sequenceDiagram') return /(?:-{1,2}>>|-{1,2}\))/.test(body)
  if (type === 'flowchart') return /(?:--+>|-{3,}|-\.+->|={2,}>)/.test(body)
  if (type === 'stateDiagram-v2') return /-->/.test(body)
  if (type === 'erDiagram') {
    return /(?:\|\||o\{|o\||\}\||\{o|\|o).*(?:--|\.\.).*(?:\|\||o\{|o\||\}\||\{o|\|o)/.test(body)
  }
  return false
}

function normalizeDiagram(source) {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

function hasNoDiagramReason(section) {
  const match = /\*\*无需配图原因\*\*[ \t]*[：:][ \t]*(\S[^\n]*)/.exec(section)
  if (!match) return false
  return !/^<[^>]+>$/.test(match[1].trim())
}

function hasDiagramGoal(segment) {
  return /\*\*(?:主图)?图示目标\*\*[ \t]*[：:][ \t]*\S[^\n]*/.test(segment)
}

function hasDiagramConclusion(segment) {
  const heading = /\*\*关键结论(?:\s*\/\s*不变量)?\*\*/.exec(segment)
  if (!heading) return false

  const body = segment.slice(heading.index + heading[0].length)
  return /^\s*[-*]\s+\S+/m.test(body)
}

function getPreviousHeadingEnd(markdown, position) {
  const matches = [...markdown.slice(0, position).matchAll(/^#{1,6}\s+.+?\s*$/gm)]
  if (matches.length === 0) return 0
  const match = matches[matches.length - 1]
  return match.index + match[0].length
}

function getNextHeadingStart(markdown, position) {
  const match = /^#{1,6}\s+.+?\s*$/m.exec(markdown.slice(position))
  return match ? position + match.index : markdown.length
}

export function getUniqueApiEndpoints(markdown) {
  const explicit = new Set()
  const explicitPaths = new Set()
  const barePaths = new Set()
  const pattern = /\b(GET|POST|PUT|PATCH|DELETE)\s+`?([/\w.{}:-]+)`?|\b((?:\/)?api\/[\w.{}:/-]+)/gi
  let match

  while ((match = pattern.exec(markdown)) !== null) {
    const method = match[1]?.toUpperCase()
    const rawPath = match[2] || match[3]
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`

    if (method) {
      explicit.add(`${method} ${path}`)
      explicitPaths.add(path)
    } else {
      barePaths.add(path)
    }
  }

  const endpoints = new Set(explicit)
  for (const path of barePaths) {
    if (!explicitPaths.has(path)) endpoints.add(`* ${path}`)
  }
  return endpoints
}

export function checkPageTechDoc(markdown) {
  const issues = []

  const mappingSection = getSection(markdown, '3.1 功能与接口映射')
  if (!mappingSection) {
    issues.push('缺少 3.1 功能与接口映射章节')
  } else if (!hasMarkdownTable(mappingSection)) {
    issues.push('3.1 功能与接口映射必须使用 Markdown 表格')
  }

  const interactionSection = getSection(markdown, '3.3 关键交互')
  if (!interactionSection) {
    issues.push('缺少 3.3 关键交互章节')
  } else if (!hasMarkdownTable(interactionSection) && interactionSection.trim().length < 80) {
    issues.push('3.3 关键交互内容不足，需逐项覆盖 PRD 交互')
  }

  const dataFlowSection = getSection(markdown, '5.6 数据流')
  const endpointCount = getUniqueApiEndpoints(markdown).size
  if (!dataFlowSection) {
    issues.push('缺少 5.6 数据流章节')
  } else {
    const dataFlowDiagrams = getMermaidBlocks(dataFlowSection)
    const noDiagramReason = hasNoDiagramReason(dataFlowSection)

    if (endpointCount >= 2 && dataFlowDiagrams.length === 0) {
      issues.push('检测到两个及以上唯一接口，但 5.6 数据流缺少 Mermaid 数据流转图')
    } else if (endpointCount < 2 && dataFlowDiagrams.length === 0 && !noDiagramReason) {
      issues.push('5.6 数据流必须提供 Mermaid 图或非空的“无需配图原因”')
    }

    if (dataFlowDiagrams.length > 0 && noDiagramReason) {
      issues.push('5.6 数据流不能同时包含 Mermaid 图和“无需配图原因”')
    }
    if (endpointCount >= 2 && noDiagramReason) {
      issues.push('两个及以上唯一接口属于必画场景，不能使用“无需配图原因”替代数据流图')
    }
  }

  const mermaidBlocks = getMermaidBlocks(markdown)
  for (let index = 0; index < mermaidBlocks.length; index += 1) {
    const block = mermaidBlocks[index]
    const type = getMermaidType(block.source)
    const previousEnd = index === 0 ? 0 : mermaidBlocks[index - 1].end
    const nextStart = index === mermaidBlocks.length - 1 ? markdown.length : mermaidBlocks[index + 1].start
    const localStart = Math.max(previousEnd, getPreviousHeadingEnd(markdown, block.start))
    const localEnd = Math.min(nextStart, getNextHeadingStart(markdown, block.end))
    const before = markdown.slice(localStart, block.start)
    const after = markdown.slice(block.end, localEnd)
    const label = `第 ${index + 1} 张 Mermaid 图`

    if (!type) {
      issues.push(`${label}类型不受支持，仅支持 sequenceDiagram、flowchart、stateDiagram-v2、erDiagram`)
    } else if (!hasStructuralStatement(block.source, type)) {
      issues.push(`${label}缺少有效的关系、交互或状态流转，不能只保留图型空壳`)
    }

    if (!hasDiagramGoal(before)) {
      issues.push(`${label}前缺少非空的“图示目标”`)
    }
    if (!hasDiagramConclusion(after)) {
      issues.push(`${label}后缺少非空的“关键结论 / 不变量” bullet`)
    }
    if (normalizeDiagram(block.source) === normalizeDiagram(DEFAULT_DATA_FLOW_SOURCE)) {
      issues.push(`${label}仍是模板默认数据流图，必须替换为当前页面的真实业务节点和关系`)
    }
  }

  if (!hasSection(markdown, '10. 风险与待确认项')) {
    issues.push('缺少 10. 风险与待确认项章节')
  }

  if (!/PRD|prd/.test(markdown)) {
    issues.push('正文未出现 PRD 标识，请确认是否已对齐需求来源和交互项')
  }

  return { ok: issues.length === 0, issues }
}

function main(argv = process.argv.slice(2)) {
  const filePath = argv[0]

  if (!filePath) {
    console.error('Usage: node check_page_tech_doc.mjs <markdown-file>')
    process.exit(2)
  }

  const result = checkPageTechDoc(fs.readFileSync(filePath, 'utf8'))
  const output = JSON.stringify(result, null, 2)

  if (result.ok) {
    console.log(output)
    return
  }

  console.error(output)
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
