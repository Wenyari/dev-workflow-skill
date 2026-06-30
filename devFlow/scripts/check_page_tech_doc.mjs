#!/usr/bin/env node

import fs from 'node:fs'

const filePath = process.argv[2]

if (!filePath) {
  console.error('Usage: node check_page_tech_doc.mjs <markdown-file>')
  process.exit(2)
}

const markdown = fs.readFileSync(filePath, 'utf8')
const issues = []

function hasSection(title) {
  return new RegExp(`^#{2,4}\\s+${escapeRegExp(title)}\\s*$`, 'm').test(markdown)
}

function getSection(title) {
  const pattern = new RegExp(`^#{2,4}\\s+${escapeRegExp(title)}\\s*$`, 'm')
  const match = pattern.exec(markdown)
  if (!match) return ''

  const start = match.index + match[0].length
  const rest = markdown.slice(start)
  const next = /^#{2,4}\s+/m.exec(rest)
  return next ? rest.slice(0, next.index) : rest
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countApiMentions() {
  const matches = markdown.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+[\w./:-]+|\bapi\/[\w./:-]+/g)
  return matches ? matches.length : 0
}

function hasMarkdownTable(section) {
  return /\|.+\|\s*\n\|[\s:-]+\|/.test(section)
}

function hasMermaid(section) {
  return /```mermaid[\s\S]*?```/.test(section)
}

const mappingSection = getSection('3.1 功能与接口映射')
if (!mappingSection) {
  issues.push('缺少 3.1 功能与接口映射章节')
} else if (!hasMarkdownTable(mappingSection)) {
  issues.push('3.1 功能与接口映射必须使用 Markdown 表格')
}

const interactionSection = getSection('3.3 关键交互')
if (!interactionSection) {
  issues.push('缺少 3.3 关键交互章节')
} else if (!hasMarkdownTable(interactionSection) && interactionSection.trim().length < 80) {
  issues.push('3.3 关键交互内容不足，需逐项覆盖 PRD 交互')
}

const dataFlowSection = getSection('5.6 数据流')
const apiCount = countApiMentions()
if (!dataFlowSection) {
  issues.push('缺少 5.6 数据流章节')
} else if (apiCount >= 2 && !hasMermaid(dataFlowSection)) {
  issues.push('检测到多个接口，但 5.6 数据流缺少 Mermaid 数据流转图')
}

if (!hasSection('10. 风险与待确认项')) {
  issues.push('缺少 10. 风险与待确认项章节')
}

if (!/PRD|prd/.test(markdown)) {
  issues.push('正文未出现 PRD 标识，请确认是否已对齐需求来源和交互项')
}

if (issues.length > 0) {
  console.error(JSON.stringify({ ok: false, issues }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, issues: [] }, null, 2))
