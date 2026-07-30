#!/usr/bin/env node

import fs from 'node:fs'

const filePath = process.argv[2]

if (!filePath) {
  console.error('Usage: node check_workload_plan_doc.mjs <markdown-file>')
  process.exit(2)
}

const markdown = fs.readFileSync(filePath, 'utf8')
const issues = []

const REQUIRED_SECTIONS = [
  '1. 总体规模',
  '2. 功能拆分',
  '3. 开发链路',
  '4. 交付里程碑',
  '5. 前置确认与阻塞项'
]

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getSection(title) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(title)}\\s*$`, 'm')
  const match = pattern.exec(markdown)
  if (!match) return ''

  const start = match.index + match[0].length
  const rest = markdown.slice(start)
  const next = /^##\s+/m.exec(rest)
  return next ? rest.slice(0, next.index) : rest
}

function getMermaidBlocks(section) {
  return [...section.matchAll(/```mermaid\s*([\s\S]*?)```/g)].map((match) => match[1])
}

function countLaneNodes(block) {
  const lanes = [...block.matchAll(/subgraph\s+[^\n]+\n([\s\S]*?)\n\s*end/g)]
  return lanes.map((lane) => {
    const definitions = lane[1].match(/^\s*[A-Za-z][\w-]*\s*(?:\[|\{|\()/gm)
    return definitions ? definitions.length : 0
  })
}

for (const section of REQUIRED_SECTIONS) {
  if (!getSection(section)) issues.push(`缺少 ${section} 章节`)
}

const summary = getSection('1. 总体规模')
for (const marker of ['页面', 'Drawer', 'Modal', '核心开发单元', 'API', 'UI']) {
  if (!summary.includes(marker)) issues.push(`总体规模缺少 ${marker} 数字或说明`)
}
if (!/\d+\s*个页面/.test(summary)) issues.push('总体规模必须写出具体页面数量')
if (!/\d+\s*个核心开发单元/.test(summary)) issues.push('总体规模必须写出核心开发单元数量')
if (!/\d+\s*\/\s*\d+/.test(summary)) issues.push('总体规模必须写出 API 或 UI 完整度比例')

const splitSection = getSection('2. 功能拆分')
const splitBlocks = getMermaidBlocks(splitSection)
if (splitBlocks.length !== 1) issues.push('功能拆分必须且只能包含一张 Mermaid 图')
if (!/基础建设/.test(splitSection)) issues.push('功能拆分缺少基础建设')
if (!/Service/i.test(splitSection)) issues.push('功能拆分的基础建设缺少 Service')
if (!/Permission/i.test(splitSection)) issues.push('功能拆分的基础建设缺少 Permission')

const chainSection = getSection('3. 开发链路')
const chainBlocks = getMermaidBlocks(chainSection)
if (chainBlocks.length !== 1) {
  issues.push('开发链路必须且只能包含一张 Mermaid 图')
} else {
  const graph = chainBlocks[0]
  if (!/flowchart\s+LR/.test(graph)) issues.push('开发链路必须使用 flowchart LR')
  if (/sequenceDiagram/.test(graph)) issues.push('开发链路不得使用 sequenceDiagram')

  const laneCount = (graph.match(/\bsubgraph\b/g) ?? []).length
  if (laneCount === 0 || laneCount > 5) {
    issues.push(`开发链路必须包含 1～5 条开发线，当前为 ${laneCount} 条`)
  }

  const nodeCounts = countLaneNodes(graph)
  nodeCounts.forEach((count, index) => {
    if (count > 10) issues.push(`开发线 ${index + 1} 超过 10 个节点，当前为 ${count} 个`)
  })
}

const milestoneSection = getSection('4. 交付里程碑')
if (!/\|\s*里程碑\s*\|\s*交付内容\s*\|\s*前置状态\s*\|\s*单人工时评估\s*\|/.test(milestoneSection)) {
  issues.push('交付里程碑表头必须为：里程碑、交付内容、前置状态、单人工时评估')
}
if (/验收条件|联调对象/.test(milestoneSection)) {
  issues.push('交付里程碑不得包含验收条件或联调对象')
}

const blockerSection = getSection('5. 前置确认与阻塞项')
if (!/\|\s*事项\s*\|\s*当前状态\s*\|\s*证据\s*\|\s*影响里程碑\s*\|\s*处理要求\s*\|/.test(blockerSection)) {
  issues.push('前置确认与阻塞项缺少固定表头')
}
if (!/API/.test(blockerSection)) issues.push('阻塞项必须说明 API 契约现状')
if (!/UI/.test(blockerSection)) issues.push('阻塞项必须说明 UI 完整度现状')

if (/\d+(?:\.\d+)?\s*(?:人日|工作日|小时|周)/.test(markdown)) {
  issues.push('报告不得填写具体人日、工作日、小时或周数')
}

if (issues.length > 0) {
  console.error(JSON.stringify({ ok: false, issues }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, issues: [] }, null, 2))
