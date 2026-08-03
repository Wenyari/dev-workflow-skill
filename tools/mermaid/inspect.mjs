#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const SUPPORTED_MERMAID_TYPES = Object.freeze([
  'sequenceDiagram',
  'flowchart',
  'stateDiagram-v2',
  'erDiagram'
])

export function extractMermaidBlocks(markdown) {
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

function getMermaidDefinitionLines(source) {
  const lines = source.split('\n')
  let index = 0

  while (index < lines.length && !lines[index].trim()) index += 1

  if (lines[index]?.trim() === '---') {
    index += 1
    while (index < lines.length && lines[index].trim() !== '---') index += 1
    if (index >= lines.length) return []
    index += 1
  }

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) {
      index += 1
      continue
    }
    if (/^%%\{/.test(line)) {
      do {
        const directiveLine = lines[index].trim()
        index += 1
        if (/%%\s*$/.test(directiveLine)) break
      } while (index < lines.length)
      continue
    }
    if (line.startsWith('%%')) {
      index += 1
      continue
    }
    break
  }

  return lines.slice(index)
}

export function getMermaidType(source) {
  const firstLine = getMermaidDefinitionLines(source).map((line) => line.trim()).find(Boolean) || ''

  if (/^sequenceDiagram\b/.test(firstLine)) return 'sequenceDiagram'
  if (/^flowchart\s+(?:TD|TB|BT|LR|RL)\b/.test(firstLine)) return 'flowchart'
  if (/^stateDiagram-v2\b/.test(firstLine)) return 'stateDiagram-v2'
  if (/^erDiagram\b/.test(firstLine)) return 'erDiagram'
  return null
}

export function hasMermaidStructure(source, type = getMermaidType(source)) {
  if (!type) return false

  const body = getMermaidDefinitionLines(source)
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

export function normalizeMermaidSource(source) {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

export function inspectMermaidMarkdown(markdown) {
  const diagrams = extractMermaidBlocks(markdown).map((block, index) => {
    const type = getMermaidType(block.source)
    return {
      index: index + 1,
      ...block,
      type,
      supported: type !== null,
      hasStructure: hasMermaidStructure(block.source, type)
    }
  })

  const issues = []
  for (const diagram of diagrams) {
    if (!diagram.supported) {
      issues.push({ code: 'unsupported_type', diagram: diagram.index })
    } else if (!diagram.hasStructure) {
      issues.push({ code: 'missing_structure', diagram: diagram.index, type: diagram.type })
    }
  }

  return {
    ok: issues.length === 0,
    diagramCount: diagrams.length,
    diagrams,
    issues
  }
}

function main(argv = process.argv.slice(2)) {
  const filePath = argv[0]
  if (!filePath) {
    console.error('Usage: node tools/mermaid/inspect.mjs <markdown-file>')
    process.exit(2)
  }

  const result = inspectMermaidMarkdown(readFileSync(filePath, 'utf8'))
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
