import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

import { checkPageTechDoc, getUniqueApiEndpoints } from './check_page_tech_doc.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }
})
const { default: mermaid } = await import('mermaid')

const MERMAID_REFERENCE = readFileSync(new URL('../references/mermaid.md', import.meta.url), 'utf8')
const PAGE_TECH_TEMPLATE = readFileSync(new URL('../templates/page-tech.md', import.meta.url), 'utf8')

const REAL_DATA_FLOW = `flowchart LR
  FILTER[筛选条件] -->|生成参数| LIST[GET /api/items]
  LIST -->|选择 itemId| DETAIL[GET /api/items/:id]
  DETAIL -->|详情数据| DRAWER[详情抽屉]
  DRAWER -->|保存后刷新| LIST`

const DEFAULT_DATA_FLOW = `flowchart LR
  A["用户操作"] --> B["页面状态"]
  B --> C["接口请求"]
  C --> D["页面展示"]`

function getMermaidSources(markdown) {
  return [...markdown.matchAll(/```mermaid[^\n]*\n([\s\S]*?)```/g)].map((match) => match[1].trim())
}

function createDocument(dataFlow, mappingRows = `| 查询列表 | PRD-1 | GET /api/items | filters | items | 展示列表 | loading → ready | 不涉及 | 错误提示 |
| 查看详情 | PRD-2 | GET /api/items/:id | itemId | item | 打开抽屉 | closed → open | 刷新详情 | 保留列表 |`) {
  return `# 页面开发技术方案：事项管理

本方案基于 PRD 交互清单生成。

## 3. 需求拆解

### 3.1 功能与接口映射

| 功能 | PRD 交互项 | 接口 | 入参 | 响应数据 | 页面展示 / 行为 | 状态变化 | 成功后刷新 | 异常反馈 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${mappingRows}

### 3.3 关键交互

| PRD 交互项 | 触发条件 | 前端行为 | 接口或状态影响 | 用户反馈 | 待确认 |
| --- | --- | --- | --- | --- | --- |
| PRD-1 | 进入页面 | 加载列表 | 更新查询状态 | 展示 loading 或列表 | 无 |

## 5. 前端实现方案

### 5.6 数据流

${dataFlow}

## 10. 风险与待确认项

- 暂无明确待确认项。
`
}

const GOOD_COMPLEX = createDocument(`**图示目标**：说明列表和详情接口如何依赖用户选择并触发刷新。

\`\`\`mermaid
${REAL_DATA_FLOW}
\`\`\`

**关键结论 / 不变量**

- 详情保存后只刷新列表和当前详情。`)

const SINGLE_API_ROWS = `| 查询列表 | PRD-1 | GET /api/items | filters | items | 展示列表 | loading → ready | 不涉及 | 错误提示 |
| 刷新列表 | PRD-2 | GET /api/items | filters | items | 更新列表 | ready → loading | 刷新当前列表 | 保留旧数据 |`

const GOOD_SIMPLE = createDocument(
  '**无需配图原因**：页面只重复调用一个列表接口，表格已完整表达参数、状态和刷新范围。',
  SINGLE_API_ROWS
)

test('两个唯一接口且数据流图完整时通过', () => {
  const result = checkPageTechDoc(GOOD_COMPLEX)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
})

test('单接口页面可以提供无需配图原因', () => {
  const result = checkPageTechDoc(GOOD_SIMPLE)
  assert.equal(result.ok, true, JSON.stringify(result.issues))
})

test('无需配图原因不能保留模板占位符', () => {
  const markdown = createDocument(
    '**无需配图原因**：<说明为什么正文和表格已经足以完成数据流评审>',
    SINGLE_API_ROWS
  )
  const result = checkPageTechDoc(markdown)
  assert.ok(result.issues.some((issue) => issue.includes('Mermaid 图或非空的“无需配图原因”')))
})

test('同一接口重复出现只计为一个接口', () => {
  const endpoints = getUniqueApiEndpoints('GET /api/items、GET /api/items，以及 api/items')
  assert.deepEqual([...endpoints], ['GET /api/items'])

  const result = checkPageTechDoc(GOOD_SIMPLE)
  assert.ok(!result.issues.some((issue) => issue.includes('两个及以上唯一接口')))
})

test('相同路径的不同 HTTP 方法算两个接口', () => {
  const endpoints = getUniqueApiEndpoints('GET /api/items\nPOST /api/items')
  assert.equal(endpoints.size, 2)
})

test('两个唯一接口不能用无需配图原因替代数据流图', () => {
  const markdown = createDocument('**无需配图原因**：正文已经说明。')
  const result = checkPageTechDoc(markdown)

  assert.ok(result.issues.some((issue) => issue.includes('缺少 Mermaid 数据流转图')))
  assert.ok(result.issues.some((issue) => issue.includes('属于必画场景')))
})

test('数据流图和无需配图原因不能同时存在', () => {
  const markdown = GOOD_COMPLEX.replace(
    '**关键结论 / 不变量**',
    '**无需配图原因**：不需要图。\n\n**关键结论 / 不变量**'
  )
  const result = checkPageTechDoc(markdown)
  assert.ok(result.issues.some((issue) => issue.includes('不能同时包含')))
})

test('模板默认数据流图不得原样交付', () => {
  const markdown = GOOD_COMPLEX.replace(REAL_DATA_FLOW, DEFAULT_DATA_FLOW)
  const result = checkPageTechDoc(markdown)
  assert.ok(result.issues.some((issue) => issue.includes('模板默认数据流图')))
})

test('Mermaid 空壳图和非法连线不能通过结构检查', () => {
  const empty = checkPageTechDoc(GOOD_COMPLEX.replace(REAL_DATA_FLOW, 'flowchart LR'))
  assert.ok(empty.issues.some((issue) => issue.includes('图型空壳')))

  const invalid = checkPageTechDoc(GOOD_COMPLEX.replace(REAL_DATA_FLOW, 'flowchart LR\n  A -x-> B'))
  assert.ok(invalid.issues.some((issue) => issue.includes('图型空壳')))
})

test('不支持的 Mermaid 图型报错', () => {
  const result = checkPageTechDoc(GOOD_COMPLEX.replace(REAL_DATA_FLOW, 'gantt\n  title x'))
  assert.ok(result.issues.some((issue) => issue.includes('类型不受支持')))
})

test('Mermaid 图必须有紧邻的图示目标和关键结论', () => {
  const noGoal = checkPageTechDoc(GOOD_COMPLEX.replace('**图示目标**：说明列表和详情接口如何依赖用户选择并触发刷新。\n\n', ''))
  assert.ok(noGoal.issues.some((issue) => issue.includes('缺少非空的“图示目标”')))

  const noConclusion = checkPageTechDoc(GOOD_COMPLEX.replace(/\*\*关键结论 \/ 不变量\*\*[\s\S]*?- 详情保存后只刷新列表和当前详情。/, ''))
  assert.ok(noConclusion.issues.some((issue) => issue.includes('缺少非空的“关键结论 / 不变量”')))
})

test('下一章节的关键结论不能被数据流图借用', () => {
  const markdown = GOOD_COMPLEX
    .replace(/\*\*关键结论 \/ 不变量\*\*[\s\S]*?- 详情保存后只刷新列表和当前详情。/, '')
    .replace('## 10. 风险与待确认项', '## 10. 风险与待确认项\n\n**关键结论 / 不变量**\n\n- 这是下一章的结论。')
  const result = checkPageTechDoc(markdown)
  assert.ok(result.issues.some((issue) => issue.includes('缺少非空的“关键结论 / 不变量”')))
})

test('前端规范和页面模板中的全部 Mermaid 示例通过官方 parser', async () => {
  const sources = [
    ...getMermaidSources(MERMAID_REFERENCE),
    ...getMermaidSources(PAGE_TECH_TEMPLATE)
  ]
  assert.equal(sources.length, 7)

  for (const source of sources) {
    await assert.doesNotReject(() => mermaid.parse(source), source)
  }
})
