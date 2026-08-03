import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

import { checkApiTechDoc } from './check_api_tech_doc.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  Option: { value: dom.window.Option, configurable: true }
})
const { default: mermaid } = await import('mermaid')

const API_DTO = '```typescript\ninterface ListDto { page: number }\n```'
const API_RESP = '```typescript\ninterface ListData { total: number }\n```'
const MODEL_TS = '```typescript\ninterface Entity { id: string }\n```'
const MERMAID_REFERENCE = readFileSync(new URL('../references/mermaid.md', import.meta.url), 'utf8')

function getMermaidSources(markdown) {
  return [...markdown.matchAll(/```mermaid[^\n]*\n([\s\S]*?)```/g)].map((match) => match[1].trim())
}

function getH2Section(markdown, title) {
  const heading = `## ${title}`
  const start = markdown.indexOf(heading)
  if (start < 0) return ''

  const contentStart = start + heading.length
  const rest = markdown.slice(contentStart)
  const nextHeading = rest.search(/\n## /)
  return nextHeading < 0 ? rest : rest.slice(0, nextHeading)
}

const GOOD = `# 核心流程 / 时序

**图示目标**：说明请求如何从服务 A 到达服务 B。

\`\`\`mermaid
sequenceDiagram
  A->>B: x
\`\`\`

**关键结论 / 不变量**

- 服务 A 负责发起请求，服务 B 负责处理。

# 数据模型 / 数据库设计

## Entity

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 主键 |

${MODEL_TS}

# 接口设计

> 统一约定：POST，返回体 { code, data }。

### 列表查询 · POST /api/x

**用途**：查询分页列表。

**入参**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| page | number | 否 | 页码 |

${API_DTO}

**出参**

${API_RESP}

**说明**

- 无副作用。

**错误码**：\`40001\` 参数校验失败

# 边界与异常

- 空数据返回空列表。

# 风险与待确认项

- 待确认 X 字段来源。
`

test('合规文档通过', () => {
  const r = checkApiTechDoc(GOOD)
  assert.equal(r.ok, true, JSON.stringify(r.issues))
})

test('Mermaid 参考文件保留六类可复用模板', () => {
  const expected = [
    ['模块边界图', 'flowchart LR', 1],
    ['调用时序图', 'sequenceDiagram', 1],
    ['状态图', 'stateDiagram-v2', 1],
    ['ER 图', 'erDiagram', 2],
    ['表数据流转图', 'flowchart LR', 1],
    ['业务分支流程图', 'flowchart TD', 1]
  ]

  for (const [sectionTitle, diagramType, minimum] of expected) {
    const section = getH2Section(MERMAID_REFERENCE, sectionTitle)
    const count = section.split(diagramType).length - 1
    assert.ok(section, `缺少 Mermaid 章节：${sectionTitle}`)
    assert.ok(count >= minimum, `${sectionTitle} 缺少 ${diagramType} 可复用模板`)
  }
})

test('Mermaid 参考文件的全部模板通过官方 parser', async () => {
  const sources = getMermaidSources(MERMAID_REFERENCE)
  assert.equal(sources.length, 8)

  for (const source of sources) {
    await assert.doesNotReject(() => mermaid.parse(source), source)
  }
})

test('缺必写章节报错', () => {
  const md = GOOD.replace('# 边界与异常', '# 其他')
  const r = checkApiTechDoc(md)
  assert.equal(r.ok, false)
  assert.ok(r.issues.some((i) => i.includes('边界与异常')))
})

test('标题手写序号报错', () => {
  const md = GOOD.replace('# 接口设计', '# 2. 接口设计')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('手写序号')))
})

test('数据模型缺 TS 报错', () => {
  const md = GOOD.replace(MODEL_TS, '')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('实体 / 表「Entity」') && i.includes('TypeScript')))
})

test('接口缺 TS 报错', () => {
  const md = GOOD.replace(API_DTO, '').replace(API_RESP, '')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('接口「列表查询') && i.includes('TypeScript')))
})

test('第二个数据实体不完整时逐条报错', () => {
  const md = GOOD.replace('# 接口设计', '## Audit\n\n只有文字说明。\n\n# 接口设计')
  const r = checkApiTechDoc(md)

  assert.ok(r.issues.some((i) => i.includes('实体 / 表「Audit」') && i.includes('字段表格')))
  assert.ok(r.issues.some((i) => i.includes('实体 / 表「Audit」') && i.includes('TypeScript')))
})

test('第二个接口不完整时逐条报错', () => {
  const md = GOOD.replace('# 边界与异常', '### 删除 · POST /api/x/delete\n\n**用途**：删除记录。\n\n# 边界与异常')
  const r = checkApiTechDoc(md)

  assert.ok(r.issues.some((i) => i.includes('接口「删除') && i.includes('入参表格')))
  assert.ok(r.issues.some((i) => i.includes('接口「删除') && i.includes('错误码')))
})

test('更新类接口缺少并发控制时报错', () => {
  const md = GOOD.replace('列表查询 · POST /api/x', '更新记录 · PATCH /api/x/{id}')
  const r = checkApiTechDoc(md)

  assert.ok(r.issues.some((i) => i.includes('更新类接口') && i.includes('并发控制')))
})

test('POST 状态变更路径也按更新类接口检查', () => {
  const md = GOOD.replace('列表查询 · POST /api/x', '状态操作 · POST /api/x/changeStatus')
  const r = checkApiTechDoc(md)

  assert.ok(r.issues.some((i) => i.includes('更新类接口') && i.includes('并发控制')))
})

test('更新类接口使用 expectedUpdatedAt 时通过', () => {
  const md = GOOD
    .replace('列表查询 · POST /api/x', '更新记录 · PATCH /api/x/{id}')
    .replace('- 无副作用。', '- 更新名称。\n\n**并发控制**：请求携带 expectedUpdatedAt，数据库条件更新失败时返回并发冲突。')
  const r = checkApiTechDoc(md)

  assert.equal(r.ok, true, JSON.stringify(r.issues))
})

test('更新类接口可以说明不采用乐观锁的依据与替代保护', () => {
  const md = GOOD
    .replace('列表查询 · POST /api/x', '启用记录 · POST /api/x/enable')
    .replace('- 无副作用。', '- 切换启用状态。\n\n**并发控制**：不采用乐观锁；操作按目标状态幂等写入，并通过数据库行锁串行化同一记录。')
  const r = checkApiTechDoc(md)

  assert.equal(r.ok, true, JSON.stringify(r.issues))
})

test('核心流程、数据模型、接口设计必须按顺序出现', () => {
  const flowStart = GOOD.indexOf('# 核心流程 / 时序')
  const modelStart = GOOD.indexOf('# 数据模型 / 数据库设计')
  const apiStart = GOOD.indexOf('# 接口设计')
  const flowSection = GOOD.slice(flowStart, modelStart)
  const modelSection = GOOD.slice(modelStart, apiStart)
  const apiSection = GOOD.slice(apiStart, GOOD.indexOf('# 边界与异常'))
  const md = GOOD.replace(`${flowSection}${modelSection}${apiSection}`, `${apiSection}${modelSection}${flowSection}`)
  const r = checkApiTechDoc(md)

  assert.ok(r.issues.some((i) => i.includes('章节顺序错误')))
})

test('核心流程缺少主图和无需配图原因时报错', () => {
  const md = GOOD.replace(/\*\*图示目标\*\*[\s\S]*?\*\*关键结论 \/ 不变量\*\*[\s\S]*?- 服务 A 负责发起请求，服务 B 负责处理。/, '仅用文字描述流程。')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('Mermaid 主图或非空的“无需配图原因”')))
})

test('简单方案可以只提供无需配图原因', () => {
  const md = GOOD.replace(
    /\*\*图示目标\*\*[\s\S]*?\*\*关键结论 \/ 不变量\*\*[\s\S]*?- 服务 A 负责发起请求，服务 B 负责处理。/,
    '**无需配图原因**：单表无状态 CRUD，字段表和接口契约已足以完成评审。'
  )
  const r = checkApiTechDoc(md)
  assert.equal(r.ok, true, JSON.stringify(r.issues))
})

test('不能同时提供 Mermaid 图和无需配图原因', () => {
  const md = GOOD.replace('# 数据模型 / 数据库设计', '**无需配图原因**：不需要图。\n\n# 数据模型 / 数据库设计')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('不能同时包含')))
})

test('一张有效主图即可通过，不强制附加图', () => {
  const r = checkApiTechDoc(GOOD)
  assert.equal(r.ok, true, JSON.stringify(r.issues))
})

test('不支持的 Mermaid 图型报错', () => {
  const md = GOOD.replace('sequenceDiagram\n  A->>B: x', 'gantt\n  title x')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('类型不受支持')))
})

test('Mermaid 空壳图报错', () => {
  const md = GOOD.replace('sequenceDiagram\n  A->>B: x', 'flowchart LR')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('不能只保留图型空壳')))
})

test('Mermaid 非法连线不能冒充有效结构', () => {
  const md = GOOD.replace('sequenceDiagram\n  A->>B: x', 'flowchart LR\n  A -x-> B')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('不能只保留图型空壳')))
})

test('支持场景化选择 flowchart、stateDiagram-v2 和 erDiagram', () => {
  const variants = [
    'flowchart LR\n  A --> B',
    'stateDiagram-v2\n  [*] --> ACTIVE',
    'erDiagram\n  MASTER ||--o{ REQUEST : owns'
  ]

  for (const diagram of variants) {
    const md = GOOD.replace('sequenceDiagram\n  A->>B: x', diagram)
    const r = checkApiTechDoc(md)
    assert.equal(r.ok, true, `${diagram}: ${JSON.stringify(r.issues)}`)
  }
})

test('Mermaid 图缺少图示目标报错', () => {
  const md = GOOD.replace('**图示目标**：说明请求如何从服务 A 到达服务 B。\n\n', '')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('缺少非空的“图示目标”')))
})

test('Mermaid 图的图示目标不能为空', () => {
  const md = GOOD.replace('**图示目标**：说明请求如何从服务 A 到达服务 B。', '**图示目标**：')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('缺少非空的“图示目标”')))
})

test('Mermaid 图缺少关键结论报错', () => {
  const md = GOOD.replace('**关键结论 / 不变量**\n\n- 服务 A 负责发起请求，服务 B 负责处理。\n', '')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('缺少非空的“关键结论 / 不变量” bullet')))
})

test('Mermaid 关键结论不能跨章节借用', () => {
  const md = GOOD
    .replace('**关键结论 / 不变量**\n\n- 服务 A 负责发起请求，服务 B 负责处理。\n', '')
    .replace('# 数据模型 / 数据库设计', '# 数据模型 / 数据库设计\n\n**关键结论 / 不变量**\n\n- 这是下一章的结论。')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('缺少非空的“关键结论 / 不变量”')))
})

test('Mermaid 图的关键结论必须包含非空 bullet', () => {
  const md = GOOD.replace('- 服务 A 负责发起请求，服务 B 负责处理。', '暂无。')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('缺少非空的“关键结论 / 不变量” bullet')))
})

test('已选可选章节缺失报错，未选的不报', () => {
  const missing = checkApiTechDoc(GOOD, { optional: ['完成标准'] })
  assert.ok(missing.issues.some((i) => i.includes('完成标准')))
  const none = checkApiTechDoc(GOOD)
  assert.equal(none.ok, true, JSON.stringify(none.issues))
})

test('正式文档不得保留模板占位符或 HTML 注释', () => {
  const placeholder = checkApiTechDoc(GOOD.replace('查询分页列表', '<接口名>'))
  assert.ok(placeholder.issues.some((i) => i.includes('模板占位符')))

  const comment = checkApiTechDoc(GOOD.replace('# 边界与异常', '<!-- TODO -->\n\n# 边界与异常'))
  assert.ok(comment.issues.some((i) => i.includes('HTML 模板注释')))
})
