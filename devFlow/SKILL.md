---
name: devFlow
description:
  研发工作流入口，覆盖前端与后端。按子命令读取上下文、检查契约、生成方案、创建基建并发布可审核产物。适用于用户要求
  Codex
  编写、审查、改进、标准化或落地研发文档、技术方案、页面开发技术方案、后端技术方案、页面基建、AI
  生成文档模板时。前端子命令：page-tech 生成页面级前端技术方案，contract-check
  检查页面方案可落地性，page-build 根据已审核方案创建页面基建，foundation-freeze
  生成基建事实快照。后端子命令：api-tech 生成后端技术方案文档。共享子命令：lark-read
  读取飞书云文档作为上下文，lark-doc 发布到飞书 Wiki，prepare
  说明飞书环境变量配置。未来可扩展测试、需求分析等 domain。
---

# 研发工作流

本 Skill 是研发工作流统一入口，覆盖前端与后端两个 domain，未来可扩展测试、需求分析等。它负责识别任务类型、判断领域、选择子命令、加载对应规则和模板。具体子命令的详细执行规则不要堆在本文件中，应放入对应
`references/`。

## 目录约定

- `shared/references/`、`shared/scripts/`：跨 domain 共享的规则和脚本（飞书读写、环境准备）。
- `domains/frontend/{references,templates,scripts}/`：前端专属规则、模板、脚本。
- `domains/backend/{references,templates,scripts}/`：后端专属规则、模板、脚本。
- `agents/`：入口 agent 配置。

新增 domain（如 `test`、`requirement`）时按同样结构建 `domains/<name>/{references,templates,scripts}/`。

## 通用原则

- 使用中文输出。
- 文档的主要构建者和审核者是人，AI 只生成结构化、可审核、可修改的初稿。
- 必须基于用户提供的需求、设计、接口、仓库代码或明确说明写作。
- 不得臆想需求、接口字段、路径、组件、权限、指标、交互规则或 coding 细节。
- 代码事实优先：仓库可用时，接口、实体、schema、组件、路由必须基于真实代码；仓库不可用时不写具体路径、不声称某资源存在，缺失部分标记为待确认。
- 必需上下文缺失时，向用户确认，或明确写入待确认项。
- 可选上下文缺失时，可以写"不涉及"或跳过，不要硬写。
- 不写开发排期或任务拆分，除非具体子命令明确要求。
- 如果子命令需要使用产品设计规范，先读取对应规范索引，不要把规范正文写入入口文件。
- 读取或写入飞书云文档时，默认直接使用飞书 Open API 和环境变量，不需要初始化
  `lark-cli`。
- 飞书读写、Markdown 转 Docx blocks、权限检查等重复且易错的操作必须优先使用
  `shared/scripts/` 中的脚本；不要在对话中临时重写大段 Node API 脚本。

## 领域判定

用户请求进入子命令前必须判定领域（frontend / backend）：

- 用户显式带前缀或指定领域（"后端技术方案"、"前端页面方案"）时直接采用。
- 子命令名唯一映射到某个 domain 时直接采用：`page-tech` / `page-build` /
  `contract-check` / `foundation-freeze` → frontend；`api-tech` → backend。
- 子命令名不唯一但用户话语明确（例如"写技术方案"）时，必须先向用户确认前端还是后端，不擅自二选一。
- 共享子命令 `prepare` / `lark-read` / `lark-doc` 不必判定领域；`lark-read` 供哪个下游使用时按下游领域输出对应结构（见 `shared/references/lark-read.md`）。

## 前端专属工作流

- 先根据 `HUMAN_AGENT_WORKFLOW.md` 判断 L0/L1/L2/L3。
- L0/L1 不强制生成 `page-tech.md`、`contract-report.md` 或
  `foundation-summary.md`；只做最小计划、确认、修改、验证和总结。
- L2/L3 才进入
  `page-tech -> contract-check -> page-build -> foundation-freeze -> figmaSync`
  标准链路。

## 验证策略

- 纯 Markdown 或 Skill 文档改动不跑业务代码检查。
- L0 运行与改动直接相关的最小验证。
- L1 优先运行 TypeScript 或相关局部验证；涉及格式时运行格式检查。
- L2/L3 有代码改动后运行：

```text
pnpm typecheck
pnpm format:check
pnpm lint
```

- 格式问题使用 `pnpm format` 修复后重新检查。
- 无法运行验证时，必须说明原因和剩余风险。

## 脚本优先

`shared/scripts/`（跨 domain）：

- `lark_check_permissions.mjs`：检查飞书文档或 Wiki 父节点访问权限。
- `lark_read_docx.mjs`：读取 Wiki /
  Docx，支持标题章节抽取、多章节一次读取、标题层级自动匹配和 5 分钟临时缓存。
- `markdown_to_lark_blocks.mjs`：将 Markdown 转为飞书 Docx blocks JSON。
- `lark_publish_doc.mjs`：创建 Wiki 子文档并分批写入 Markdown 正文。

`domains/frontend/scripts/`：

- `contract_check_static.mjs`：检查 route、components、service、types、constants 等机械规则，输出 JSON。
- `generate_foundation_summary.mjs`：扫描页面真实基建并生成
  `foundation-summary.md` 机器快照。
- `check_page_tech_doc.mjs`：`page-tech` 生成后的静态自检。

`domains/backend/scripts/`：

- `check_api_tech_doc.mjs`：`api-tech` 生成后的静态自检。

脚本只从环境变量读取密钥，不输出 secret。脚本输出 JSON，最终回复只摘取必要状态和链接。

## 图表工作流

技术文档需要图文并茂时，使用 Mermaid 作为图的源码，使用外部画图 Skill 落地渲染。

通用规则：

- 文档正文负责说明为什么需要这张图、图表达什么结论。
- Mermaid 代码负责描述图结构，必须保留在文档中，便于后续修改。
- 复杂图、需要飞书落地的图，交给 `design-lark-chart`
  渲染到飞书画板或飞书文档可用产物。
- `devFlow` 不直接承担复杂图渲染，不把图做成不可维护的纯图片。
- 图必须服务于内容，不为了装饰而画图。
- 每张图都要有明确用途：流程、数据流、状态流转、接口链路、组件关系、权限判断或异常处理。

Mermaid 类型选择：

- 前端场景：
  - 用户流程、权限判断、异常处理：优先 `flowchart`
  - 页面结构、组件拆分、资源关系：优先 `flowchart LR`，模拟从左到右的 XMind 阅读方式。
  - 前后端交互、提交链路：优先 `sequenceDiagram`
  - 页面状态流转：优先 `stateDiagram-v2`
- 后端场景：
  - 接口调用链路、多服务调用时序：优先 `sequenceDiagram`
  - 业务流程、事务/幂等分支：优先 `flowchart`
  - 数据实体关系：优先 `erDiagram`
  - 领域对象或订单状态流转：优先 `stateDiagram-v2`
- 开发排期类内容：仅在对应子命令要求时使用 `gantt`。

飞书交付规则：

- 需要粘贴到飞书文档时，正文保留 Mermaid 源码，另用 `design-lark-chart`
  生成图形产物。
- 如果用户只需要纯 Markdown 文档，可以只输出 Mermaid 代码块，不调用外部画图 Skill。
- 如果用户明确要求"画到飞书""同步到飞书""生成飞书画板"，必须使用
  `design-lark-chart`。
- `lark-cli` 只在 `design-lark-chart` 或飞书画板链路需要时再初始化；`lark-read`
  和 `lark-doc` 不要求初始化。

## 子命令路由

每个子命令块只列 **用途 + 触发方式 + 规则/模板/脚本索引**；具体执行规则见对应 references，agent 应在进入子命令后立即读取。

### prepare（共享）

用途：说明 `devFlow` 使用飞书读写能力前需要配置的环境变量和权限准备。

触发方式：

- 用户显式输入 `$devFlow prepare`
- 用户要求"初始化 devFlow" / "配置 devFlow 飞书环境变量"
- 用户询问"devFlow 需要配置哪些飞书变量"
- 用户第一次使用 `lark-read` 或 `lark-doc` 前需要准备环境

规则：`shared/references/prepare.md`

### lark-read（共享）

用途：读取飞书云文档或 Wiki 文档链接，提取内容作为后续研发工作流上下文。

触发方式：

- 用户显式输入 `$devFlow lark-read`
- 用户提供飞书文档链接并要求"读取文档"
- 用户要求"根据这个飞书文档生成技术方案"
- 用户要求"先读 PRD / 设计说明 / 接口文档"
- 用户要求"把这个飞书文档作为上下文"

规则：`shared/references/lark-read.md`
脚本：`shared/scripts/lark_read_docx.mjs`

### lark-doc（共享）

用途：将已生成或即将生成的技术文档发布到飞书 Wiki 父节点下。

触发方式：

- 用户显式输入 `$devFlow lark-doc`
- 用户要求"发布到飞书" / "写入飞书文档"
- 用户要求"落地到我的飞书个人笔记"
- 用户要求"在这个飞书 Wiki 节点下创建文档"

规则：`shared/references/lark-doc.md`
脚本：`shared/scripts/lark_publish_doc.mjs`

### page-tech（前端）

用途：生成页面级前端技术方案（页面开发落地方案）。

触发方式：

- 用户显式输入 `$devFlow page-tech`
- 用户要求"写页面开发技术方案" / "写页面落地方案"
- 用户要求"根据前端仓库生成页面技术文档"
- 用户要求"让 AI 先生成页面方案，我再审核"

规则：`domains/frontend/references/page-tech.md`
模板：`domains/frontend/templates/page-tech.md`

### page-build（前端）

用途：根据已审核页面方案或可验证上下文，为 admin-fe 创建页面基建文件。

触发方式：

- 用户显式输入 `$devFlow page-build`
- 用户要求"根据页面方案创建页面基建"
- 用户要求"根据 page-tech / 飞书文档 / API 文档落地页面骨架"
- 用户要求"先搭页面 route、components、service、types、constants"

规则：`domains/frontend/references/page-build.md`
模板：`domains/frontend/templates/page-build/`

### contract-check（前端）

用途：在 `page-tech` 和 `page-build` 之间检查页面方案是否具备落地条件，避免直接生成错误骨架。

触发方式：

- 用户显式输入 `$devFlow contract-check`
- 用户要求"检查页面方案是否能落地"
- 用户要求"检查 page-tech 能不能进入 page-build"
- 用户要求"生成 contract-report"

规则：`domains/frontend/references/contract-check.md`
模板：`domains/frontend/templates/contract-report.md`
脚本：`domains/frontend/scripts/contract_check_static.mjs`（辅助机械规则检查，不替代业务语义判断）

### foundation-freeze（前端）

用途：在 `page-build` 后、`figmaSync plan` 前生成页面基建事实快照，明确后续视觉阶段可修改范围。

触发方式：

- 用户显式输入 `$devFlow foundation-freeze`
- 用户要求"生成 foundation-summary" / "冻结页面基建事实"
- `figmaSync plan` 前发现目标页面已有基建但缺少最新快照

规则：`domains/frontend/references/foundation-freeze.md`
脚本：`domains/frontend/scripts/generate_foundation_summary.mjs`

### api-tech（后端）

用途：生成后端技术方案文档（接口设计、数据模型 / 数据库设计、核心流程时序、边界与异常、风险与待确认项）。不生成 controller / service / dto / entity 代码骨架。

触发方式：

- 用户显式输入 `$devFlow api-tech`
- 用户要求"写后端技术方案" / "写接口设计文档"
- 用户要求"根据 PRD 生成后端落地方案"

规则：`domains/backend/references/api-tech.md`
模板：`domains/backend/templates/api-tech.md`
脚本：`domains/backend/scripts/check_api_tech_doc.mjs`（生成后自检）

## 未实现子命令

当前实现：
`prepare`、`lark-read`、`lark-doc`（共享）；`page-tech`、`contract-check`、`page-build`、`foundation-freeze`（前端）；`api-tech`（后端）。

如果用户要求组件开发、重构方案、测试方案、需求分析或其他技术文档类型，不要临时发挥。先说明当前
`devFlow` 尚未定义对应子命令或 domain，再与用户确认是否要扩展。
