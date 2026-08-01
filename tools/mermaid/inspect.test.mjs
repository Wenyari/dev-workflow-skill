import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  extractMermaidBlocks,
  getMermaidType,
  hasMermaidStructure,
  inspectMermaidMarkdown,
  normalizeMermaidSource,
  SUPPORTED_MERMAID_TYPES
} from './inspect.mjs'

test('提取 Mermaid fenced block 并保留源码位置', () => {
  const markdown = `before

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`

middle

\`\`\`mermaid
sequenceDiagram
  A->>B: request
\`\`\``

  const blocks = extractMermaidBlocks(markdown)
  assert.equal(blocks.length, 2)
  assert.equal(blocks[0].source, 'flowchart LR\n  A --> B')
  assert.equal(markdown.slice(blocks[0].start, blocks[0].end).startsWith('```mermaid'), true)
  assert.equal(blocks[1].source, 'sequenceDiagram\n  A->>B: request')
})

test('只识别约定支持的四类 Mermaid 图', () => {
  const examples = [
    ['sequenceDiagram\n  A->>B: x', 'sequenceDiagram'],
    ['flowchart TD\n  A --> B', 'flowchart'],
    ['stateDiagram-v2\n  A --> B', 'stateDiagram-v2'],
    ['erDiagram\n  A ||--o{ B : owns', 'erDiagram']
  ]

  assert.deepEqual(SUPPORTED_MERMAID_TYPES, examples.map(([, type]) => type))
  for (const [source, type] of examples) assert.equal(getMermaidType(source), type)
  assert.equal(getMermaidType('gantt\n  title x'), null)
})

test('区分有效结构、空壳图和伪造连线', () => {
  assert.equal(hasMermaidStructure('sequenceDiagram\n  A->>B: x'), true)
  assert.equal(hasMermaidStructure('flowchart LR\n  A --> B'), true)
  assert.equal(hasMermaidStructure('stateDiagram-v2\n  A --> B'), true)
  assert.equal(hasMermaidStructure('erDiagram\n  A ||--o{ B : owns'), true)
  assert.equal(hasMermaidStructure('flowchart LR'), false)
  assert.equal(hasMermaidStructure('flowchart LR\n  A -x-> B'), false)
  assert.equal(hasMermaidStructure('gantt\n  title x'), false)
})

test('检查结果使用稳定诊断码且不决定文档是否必须配图', () => {
  const empty = inspectMermaidMarkdown('没有 Mermaid 图。')
  assert.deepEqual(empty, { ok: true, diagramCount: 0, diagrams: [], issues: [] })

  const result = inspectMermaidMarkdown(`\`\`\`mermaid
gantt
  title x
\`\`\`

\`\`\`mermaid
flowchart LR
\`\`\``)

  assert.equal(result.ok, false)
  assert.deepEqual(result.issues, [
    { code: 'unsupported_type', diagram: 1 },
    { code: 'missing_structure', diagram: 2, type: 'flowchart' }
  ])
})

test('源码归一化只移除空行和行首尾空白', () => {
  assert.equal(
    normalizeMermaidSource('  flowchart LR\n\n    A --> B  \n'),
    'flowchart LR\nA --> B'
  )
})
