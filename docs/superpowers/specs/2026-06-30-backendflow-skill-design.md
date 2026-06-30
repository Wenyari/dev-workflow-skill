# backendFlow Skill 设计

- 日期：2026-06-30
- 状态：待评审
- 作者：与用户协作 brainstorming 产出

## 1. 背景与目标

仓库现有两个研发工作流 skill：

- `devFlow`：前端（admin-fe）研发文档工作流，按子命令路由生成可审核初稿，复用飞书读写脚本。
- `figmaSync`：Figma 设计稿 → 原生 CSS 落地工作流。

目前缺少**后端研发**对应的工作流。本设计新增一个独立 skill `backendFlow`，定位是
**生成可审核的后端技术方案文档**，与 `devFlow` 平级、风格对称，但不混入 `devFlow`。

目标：

- 后端同学输入需求（主要是 PRD），由 AI 产出结构化、可审核、可修改的后端技术方案初稿。
- 复用 `devFlow` 已有的飞书读写脚本，不重复造轮子。
- 文档可发布到飞书 Wiki，分节使用飞书原生标题自动编号。

非目标：

- 不生成 controller / service / dto / entity 代码骨架（核心是文档，不是脚手架）。
- 不承担前端页面方案（那是 `devFlow page-tech`）。
- 不复制一套独立的飞书读写脚本。

## 2. 技术与约束前提

- 后端技术栈：Node.js（NestJS / Express）。
- 核心产出：后端技术方案**文档**。
- 主输入：PRD / 需求文档（经 `lark-read` 读取飞书文档）。
- 条件输入：现有后端仓库代码（可用时作为「代码事实优先」依据）。
- 飞书读写：复用 `devFlow/scripts/` 下的 `lark_read_docx.mjs` 与 `lark_publish_doc.mjs`，
  环境变量沿用同一套 `FEISHU_*`。

## 3. 文件布局

```text
backendFlow/
  SKILL.md                      # 入口：通用原则 + 子命令路由
  references/
    prepare.md                  # 飞书环境变量说明（同一套 FEISHU_*）
    api-tech.md                 # 核心：后端方案章节规则 + 选择式骨架机制
    lark-read.md                # 读 PRD：调用 devFlow 的 lark_read_docx.mjs
    lark-doc.md                 # 发布到 Wiki：调用 devFlow 的 lark_publish_doc.mjs
  assets/templates/
    api-tech.md                 # 后端方案文档骨架（标注【必写】/【可选】）
  scripts/
    check_api_tech_doc.mjs      # 文档结构 + 标题格式自检（新增脚本）
```

飞书读写**只引用** `devFlow/scripts/lark_read_docx.mjs` 和 `lark_publish_doc.mjs`，不复制。
唯一新增脚本是 `check_api_tech_doc.mjs`。脚本调用路径沿用仓库现有约定
`node .agent/skills/devFlow/scripts/<script>.mjs`。

## 4. 子命令路由

| 用户输入                | 跳到                      | 用途                                                   |
| ----------------------- | ------------------------- | ------------------------------------------------------ |
| `backendFlow prepare`   | `references/prepare.md`   | 说明飞书环境变量（复用 devFlow 同一套），可跑权限检查   |
| `backendFlow api-tech`  | `references/api-tech.md`  | **核心**：生成后端技术方案文档                          |
| `backendFlow lark-read` | `references/lark-read.md` | 读飞书 PRD，调 `devFlow/scripts/lark_read_docx.mjs`     |
| `backendFlow lark-doc`  | `references/lark-doc.md`  | 发布方案到飞书 Wiki，调 `devFlow/scripts/lark_publish_doc.mjs` |

未实现的子命令（组件、重构等）不临时发挥，先说明未定义再与用户确认是否扩展。

## 5. api-tech 文档骨架（选择式）

### 5.1 必写章节（`api-tech` 总是生成）

- **接口设计**：API 清单（接口、方法、路径、入参、响应、鉴权、错误码、对应 PRD 交互项），优先表格。
- **数据模型 / 数据库设计**：实体 / 表、字段、类型、约束、索引、关系、migration 影响。
- **核心流程 / 时序**：业务流程图 + 关键接口时序图 + 事务边界 + 幂等 / 并发。
- **边界与异常**：错误处理、回滚、重试、降级、并发冲突。
- **风险与待确认项**：收敛 PRD / 接口 / 仓库代码冲突，每条具体到可直接问产品或前端。

### 5.2 可选章节（使用时由使用者勾选）

- 背景与目标
- 范围与非目标
- 依赖与非功能性（中间件、第三方、MQ、缓存、限流、性能、安全 / 权限）
- 完成标准

### 5.3 运行机制

1. `api-tech` 启动时先列出章节清单：必写自动纳入，可选逐项让使用者勾选。
2. 使用者确认要包含的可选章节后，才生成对应章节。
3. 未选中的可选章节**不出现**在文档里，不写「不涉及」占位。
4. 模板 `assets/templates/api-tech.md` 用标题层级表达每章，并以 HTML 注释或紧邻说明
   标注【必写】/【可选】，标注不混进标题文字。

### 5.4 数据结构展示格式（硬规则）

实体 / 表结构、接口出入参的数据结构统一用「**字段表格 + TypeScript 代码块**」双给：

- **字段表格**用于审核，列固定为：字段、类型、必填、默认 / 约束、说明。
- **TypeScript interface / DTO 代码块**用于落地参考，贴合 Nest；可空字段用 `?`，
  时间等需注明单位（如 `// epoch ms`）。
- 复杂嵌套结构在表格 + TS 之外，可补一段 JSON 示例，但不替代表格。

字段表格示例：

| 字段 | 类型 | 必填 | 默认 / 约束 | 说明 |
| --- | --- | --- | --- | --- |
| id | string | 是 | — | 供方唯一 ID |
| name | string | 是 | 长度 1–64 | 供方名称 |
| status | enum | 是 | ACTIVE / FROZEN | 供方状态 |
| createdAt | number | 是 | epoch ms | 创建时间 |

TS 代码块示例：

```typescript
interface Supplier {
  id: string
  name: string
  status: 'ACTIVE' | 'FROZEN'
  ownerId?: string
  createdAt: number // epoch ms
}
```

### 5.5 接口要素格式（硬规则）

接口设计章节中，每个接口条目必须包含以下四项要素，缺项即视为不合格：

1. **入参区分 path / query / body**：用入参表，列固定为：位置、参数、类型、必填、默认、校验、说明。
   位置取值 `path` / `query` / `body`。
2. **出参统一包裹**：响应用 `{ code, data, message }` 统一结构，`data` 再展开业务字段，
   `data` 内的对象结构遵循 5.4 的「表格 + TS」格式。
3. **参数标注必填 / 默认 / 校验**：体现在入参表的「必填 / 默认 / 校验」三列，
   校验写长度 / 范围 / 枚举等。
4. **错误码清单**：表格列为 code、含义、触发条件。有业务错误码时必写；
   纯 CRUD 无专属错误码时，至少列通用码（如成功、参数校验失败、登录态失效）。

接口入参表示例：

| 位置 | 参数 | 类型 | 必填 | 默认 | 校验 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| body | tab | enum | 否 | ALL | ALL / MINE | 列表范围 |
| body | keyword | string | 否 | — | ≤ 64 | 名称模糊搜索 |
| body | page | number | 否 | 1 | ≥ 1 | 页码 |
| body | pageSize | number | 否 | 20 | 1–100 | 每页条数 |

出参示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "total": 128, "list": [ /* Supplier[]，结构见数据模型 */ ] }
}
```

错误码示例：

| code | 含义 | 触发条件 |
| --- | --- | --- |
| 0 | 成功 | — |
| 40001 | 参数校验失败 | pageSize 超范围等 |
| 40301 | 登录态失效 | 无有效 Admin 登录态 |

## 6. 标题与编号格式（硬规则）

贯穿模板、生成输出与自检：

- 所有分节一律用原生 Markdown 标题层级：章 = `#`、节 = `##`、小节 = `###`，最多三级，
  分别映射飞书 heading1 / heading2 / heading3。
- 标题文本里**禁止手写序号**：写 `## 接口设计`，绝不写 `## 2. 接口设计`。
- 蓝色序号（`2` / `2.1` / `2.1.1`）由飞书原生标题自动编号生成，不由文本承载。
- 因此「选择式骨架」不手写任何编号；可选章节被跳过也不影响——飞书按实际存在的标题重新自动编号。
- 依据：`devFlow/scripts/markdown_to_lark_blocks.mjs` 已把 `#`/`##`/`###` 转为飞书原生标题块。

已知限制 / 待确认：飞书文档标题序号依赖文档的「标题自动序号」显示能力。若通过 API
创建的文档未显示自动序号，可能需要在文档设置中开启；该限制写入 prepare / lark-doc 说明，
不通过手写序号绕过。

## 7. 自检脚本 check_api_tech_doc.mjs

参照 `devFlow/scripts/check_page_tech_doc.mjs`，对生成的 Markdown 做结构与格式校验，
输出 JSON，最终回复只摘必要状态。

校验项：

- 必写章节齐全：接口设计、数据模型 / 数据库设计、核心流程 / 时序、边界与异常、风险与待确认项。
- 本次选中的可选章节存在（未选的不报）。
- 接口设计章节包含表格（不是纯 bullet）。
- **数据模型章节**同时包含字段表格和 TypeScript 代码块（落实 5.4「表格 + TS」双给）。
- **接口要素**：接口设计章节存在入参表（含 `path`/`query`/`body` 位置列）、
  出参 JSON（含 `code`/`data`）和错误码表（落实 5.5 四要素）。
- 核心流程 / 时序包含 Mermaid 代码块。
- 风险与待确认项非空。
- **标题格式**：所有分节是 `#`/`##`/`###` 标题；标题文本不以「数字 + `.`/`、`/`)`」开头
  （拦截手写序号）。

脚本只从环境变量读密钥（本脚本不涉及密钥），不输出 secret。

## 8. 通用原则（沿用 devFlow 纪律）

- 中文输出。
- AI 只产出可审核初稿，人是最终构建者和审核者。
- **代码事实优先**：后端仓库可用时，接口 / 实体 / schema 必须基于真实代码；
  仓库不可用时不写具体路径、不声称某资源存在。
- **不臆想**接口字段、表字段、路径、错误码、权限码；必需上下文缺失 → 确认或写「待确认项」。
- 飞书读写复用 devFlow 脚本，环境变量同一套，不在 skill / 仓库写密钥、不回显 secret。
- 图用 Mermaid：接口时序 `sequenceDiagram`、业务流程 `flowchart`、数据实体 `erDiagram`、
  状态流转 `stateDiagram-v2`；要落地飞书时交 `design-lark-chart` 渲染，正文保留 Mermaid 源码。

## 9. 与 devFlow 的衔接

- 前端 `page-tech`（接口需求方）与后端 `api-tech`（接口设计方）可互为上下文。
- `backendFlow` **不强依赖** `page-tech`：主输入是 PRD，仓库代码为条件输入。
- 飞书脚本依赖 `devFlow` 存在；`backendFlow` 文档中明确这一依赖关系。

## 10. 完成标准

- 新增 `backendFlow/` 目录，含 SKILL.md、四个 references、api-tech 模板、自检脚本。
- `api-tech` 能按必写 + 选中可选章节生成符合标题格式硬规则的 Markdown。
- `lark-read` / `lark-doc` 正确调用 devFlow 脚本完成读取与发布。
- `check_api_tech_doc.mjs` 能校验结构与标题格式并输出 JSON。
- README 补充对 `backendFlow` 的简述（与现有两个 skill 并列）。

## 11. 风险与待确认项

- 飞书「标题自动序号」是否需文档级开启，需在真实环境验证；未验证前作为已知限制说明。
- `markdown_to_lark_blocks.mjs` 仅支持三级标题；后端方案若需更深嵌套需做取舍（当前限制在三级内）。
- `check_api_tech_doc.mjs` 的「选中可选章节」如何传入（参数或读取生成约定）需在实现时定具体接口。
