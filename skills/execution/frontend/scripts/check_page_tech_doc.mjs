#!/usr/bin/env node

import fs from 'node:fs'

const filePath = process.argv[2]

if (!filePath) {
  console.error('Usage: node check_page_tech_doc.mjs <markdown-file>')
  process.exit(2)
}

const markdown = fs.readFileSync(filePath, 'utf8')
const issues = []

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasSection(title) {
  return new RegExp(`^#{2,4}\\s+${escapeRegExp(title)}\\s*$`, 'm').test(markdown)
}

function getSection(title) {
  const pattern = new RegExp(`^(#{2,4})\\s+${escapeRegExp(title)}\\s*$`, 'm')
  const match = pattern.exec(markdown)
  if (!match) return ''

  const start = match.index + match[0].length
  const rest = markdown.slice(start)
  const headingLevel = match[1].length

  // 子章节属于当前章节，遇到同级或更高级标题时才结束截取。
  const next = new RegExp(`^#{2,${headingLevel}}\\s+`, 'm').exec(rest)
  return next ? rest.slice(0, next.index) : rest
}

function hasMarkdownTable(section) {
  return /\|.+\|\s*\n\|[\s|:-]+\|/.test(section)
}

function getTableHeader(section) {
  return section
    .split('\n')
    .find((line) => line.trim().startsWith('|'))
    ?.split('|')
    .map((cell) => cell.trim())
    .filter(Boolean) ?? []
}

function getMermaidBlocks() {
  return [...markdown.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)].map((match) => match[1])
}

const requiredSections = [
  '目标与范围',
  '功能与接口',
  '前端实现方案',
  '非功能性需求与埋点监控',
  '风险与待确认项',
]

for (const title of requiredSections) {
  if (!hasSection(title)) {
    issues.push(`缺少 ${title} 章节`)
  }
}

const mappingSection = getSection('功能与接口')
const requiredHeaders = ['页面能力', '接口', '关键入参', '使用的响应数据', '状态或刷新影响']

if (mappingSection && !hasMarkdownTable(mappingSection)) {
  issues.push('功能与接口必须使用 Markdown 表格')
} else if (mappingSection) {
  // 固定表头保证页面能力、接口契约和状态影响在同一处完成映射。
  const headers = getTableHeader(mappingSection)
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header))

  if (missingHeaders.length > 0) {
    issues.push(`功能与接口缺少表头：${missingHeaders.join('、')}`)
  }
}

const requiredImplementationSections = [
  '目录结构与产物路径',
  '组件与复用方案',
  '状态设计',
  '数据流',
]

for (const title of requiredImplementationSections) {
  if (!hasSection(title)) {
    issues.push(`缺少 ${title} 章节`)
  }
}

const requiredDecisionSections = ['非功能性需求', '埋点与监控']

for (const title of requiredDecisionSections) {
  if (!hasSection(title)) {
    issues.push(`缺少 ${title} 章节`)
  }
}

const nonFunctionalSection = getSection('非功能性需求与埋点监控')

// 本章必须留下用户确认状态，避免生成器静默替用户决定是否建设。
if (nonFunctionalSection && !nonFunctionalSection.includes('用户确认')) {
  issues.push('非功能性需求与埋点监控缺少用户确认记录')
}

for (const [index, block] of getMermaidBlocks().entries()) {
  const diagramNumber = index + 1
  const isFlowchart = /^\s*(flowchart|graph)\b/m.test(block)
  const isStateDiagram = /^\s*stateDiagram-v2\b/m.test(block)
  const isSequenceDiagram = /^\s*sequenceDiagram\b/m.test(block)

  // flowchart 必须显式选择方向，避免依赖默认布局产生不稳定结果。
  if (isFlowchart && !/^\s*(flowchart|graph)\s+(TB|TD|BT|LR|RL)\b/m.test(block)) {
    issues.push(`第 ${diagramNumber} 个 Mermaid flowchart 未声明方向`)
  }

  if (isStateDiagram && !/^\s*direction\s+(TB|BT|LR|RL)\b/m.test(block)) {
    issues.push(`第 ${diagramNumber} 个 Mermaid stateDiagram-v2 未声明方向`)
  }

  if (isFlowchart || isStateDiagram) {
    const hasClassDefinition = /\bclassDef\s+\w+\s+/.test(block)
    const hasClassBinding = /:::\w+|\bclass\s+[\w,\s-]+\s+\w+/.test(block)

    if (!hasClassDefinition || !hasClassBinding) {
      issues.push(`第 ${diagramNumber} 个 Mermaid 图缺少 classDef 或语义颜色绑定`)
    }
  }

  if (isSequenceDiagram) {
    const hasTheme = /%%\{init:\s*\{[\s\S]*themeVariables/.test(block)
    const hasSemanticBlock = /\brect\s+(rgb|rgba)\s*\(/.test(block)

    if (!hasTheme && !hasSemanticBlock) {
      issues.push(`第 ${diagramNumber} 个 Mermaid sequenceDiagram 缺少主题或语义色块`)
    }
  }
}

if (issues.length > 0) {
  console.error(JSON.stringify({ ok: false, issues }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, issues: [] }, null, 2))
