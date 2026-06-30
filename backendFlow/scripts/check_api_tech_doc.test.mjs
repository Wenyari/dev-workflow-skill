import { test } from 'node:test'
import assert from 'node:assert/strict'

import { checkApiTechDoc } from './check_api_tech_doc.mjs'

const GOOD = `# 接口设计

## 列表查询
\`POST /api/x\`

| 位置 | 参数 | 类型 | 必填 | 默认 | 校验 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| body | page | number | 否 | 1 | ≥1 | 页码 |

\`\`\`json
{ "code": 0, "data": {}, "message": "ok" }
\`\`\`

| code | 含义 | 触发条件 |
| --- | --- | --- |
| 0 | 成功 | — |

# 数据模型 / 数据库设计

| 字段 | 类型 | 必填 | 默认 / 约束 | 说明 |
| --- | --- | --- | --- | --- |
| id | string | 是 | — | 主键 |

\`\`\`typescript
interface E { id: string }
\`\`\`

# 核心流程 / 时序

\`\`\`mermaid
sequenceDiagram
  A->>B: x
\`\`\`

# 边界与异常

- 空数据返回空列表。

# 风险与待确认项

- 待确认 X 字段来源。
`

test('合规文档通过', () => {
  const r = checkApiTechDoc(GOOD)
  assert.equal(r.ok, true, JSON.stringify(r.issues))
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
  const md = GOOD.replace(/```typescript[\s\S]*?```/, '')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('TypeScript')))
})

test('接口缺错误码报错', () => {
  const md = GOOD.replace('触发条件', '说明')
  const r = checkApiTechDoc(md)
  assert.ok(r.issues.some((i) => i.includes('错误码')))
})

test('已选可选章节缺失报错，未选的不报', () => {
  const missing = checkApiTechDoc(GOOD, { optional: ['完成标准'] })
  assert.ok(missing.issues.some((i) => i.includes('完成标准')))
  const none = checkApiTechDoc(GOOD)
  assert.equal(none.ok, true, JSON.stringify(none.issues))
})
