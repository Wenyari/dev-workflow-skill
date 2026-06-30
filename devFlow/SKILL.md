---
name: devFlow
description:
  按子命令读取上下文、检查契约、生成方案、创建基建并发布可审核产物。适用于用户要求
  Codex
  编写、审查、改进、标准化或落地研发文档、技术方案、页面开发技术方案、页面基建、AI
  生成文档模板时。当前支持 page-tech 子命令生成页面级前端技术方案，支持
  contract-check 子命令检查页面方案可落地性，支持 page-build
  子命令根据已审核方案或文档上下文创建页面基建计划和占位文件，支持 lark-read
  子命令读取飞书云文档作为上下文，支持 lark-doc 子命令将文档落地到飞书 Wiki
  文档，支持 prepare 子命令说明飞书环境变量配置；未来可扩展组件开发、接口落地、重构方案等子命令。
---

# 研发工作流

本 Skill 是研发工作流入口。它负责识别任务类型、选择子命令、加载对应规则和模板。具体子命令的详细执行规则不要堆在本文件中，应放入
`references/`。

## 通用原则

- 使用中文输出。
- 文档的主要构建者和审核者是人，AI 只生成结构化、可审核、可修改的初稿。
- 必须基于用户提供的需求、设计、接口、仓库代码或明确说明写作。
- 不得臆想需求、接口字段、路径、组件、权限、指标、交互规则或 coding 细节。
- 必需上下文缺失时，向用户确认，或明确写入待确认项。
- 可选上下文缺失时，可以写“不涉及”或跳过，不要硬写。
- 不写开发排期或任务拆分，除非具体子命令明确要求。
- 如果子命令需要使用产品设计规范，先读取对应规范索引，不要把规范正文写入入口文件。
- 读取或写入飞书云文档时，默认直接使用飞书 Open API 和环境变量，不需要初始化
  `lark-cli`。
- 飞书读写、Markdown 转 Docx blocks、权限检查等重复且易错的操作必须优先使用
  `scripts/` 中的脚本；不要在对话中临时重写大段 Node API 脚本。
- 执行 admin-fe 任务时必须读取或内化项目根目录 `ADMIN_FE_WORKFLOW.md`；先根据
  `HUMAN_AGENT_WORKFLOW.md` 判断 L0/L1/L2/L3。
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

可直接执行的脚本：

- `scripts/lark_check_permissions.mjs`：检查飞书文档或 Wiki 父节点访问权限。
- `scripts/lark_read_docx.mjs`：读取 Wiki /
  Docx，支持标题章节抽取、多章节一次读取、标题层级自动匹配和 5 分钟临时缓存。
- `scripts/markdown_to_lark_blocks.mjs`：将 Markdown 转为飞书 Docx blocks JSON。
- `scripts/lark_publish_doc.mjs`：创建 Wiki 子文档并分批写入 Markdown 正文。
- `scripts/contract_check_static.mjs`：检查 route、components、service、types、constants 等机械规则，输出 JSON。
- `scripts/generate_foundation_summary.mjs`：扫描页面真实基建并生成
  `foundation-summary.md` 机器快照。

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

- 用户流程、权限判断、异常处理：优先 `flowchart`
- 页面结构、组件拆分、资源关系：优先
  `flowchart LR`，模拟从左到右的 XMind 阅读方式。
- 接口调用链路、提交链路、前后端交互：优先 `sequenceDiagram`
- 页面状态流转：优先 `stateDiagram-v2`
- 数据实体关系：优先 `erDiagram`
- 开发排期类内容：仅在对应子命令要求时使用 `gantt`

飞书交付规则：

- 需要粘贴到飞书文档时，正文保留 Mermaid 源码，另用 `design-lark-chart`
  生成图形产物。
- 如果用户只需要纯 Markdown 文档，可以只输出 Mermaid 代码块，不调用外部画图 Skill。
- 如果用户明确要求“画到飞书”“同步到飞书”“生成飞书画板”，必须使用
  `design-lark-chart`。
- `lark-cli` 只在 `design-lark-chart` 或飞书画板链路需要时再初始化；`lark-read`
  和 `lark-doc` 不要求初始化。

## 子命令路由

### prepare

用途：说明 `devFlow` 使用飞书读写能力前需要配置的环境变量和权限准备。

触发方式：

- 用户显式输入 `$devFlow prepare`
- 用户要求“初始化 devFlow”
- 用户要求“配置 devFlow 飞书环境变量”
- 用户询问“devFlow 需要配置哪些飞书变量”
- 用户第一次使用 `lark-read` 或 `lark-doc` 前需要准备环境

执行规则：

1. 读取 `references/prepare.md`。
2. 告诉用户必须配置 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。
3. 如果用户需要发布到飞书 Wiki，说明还必须配置
   `FEISHU_WIKI_PARENT_NODE_TOKEN`。
4. 说明普通飞书文档读写直接使用飞书 Open API，不需要初始化 `lark-cli`。
5. 不要求用户把 secret 写入仓库文件，不在回复中回显 secret。

### page-tech

用途：生成页面级前端技术方案，也就是页面开发落地方案。

触发方式：

- 用户显式输入 `$devFlow page-tech`
- 用户要求“写页面开发技术方案”
- 用户要求“写页面落地方案”
- 用户要求“根据前端仓库生成页面技术文档”
- 用户要求“让 AI 先生成页面方案，我再审核”

执行规则：

1. 读取 `references/page-tech.md`。
2. 使用 `assets/templates/page-tech.md` 作为输出骨架。
3. 严格按 `page-tech` 规则处理必需上下文、条件上下文和待确认项。
4. 如果前置上下文来自飞书文档，先用 `lark-read` 脚本抽取结构化内容，再写方案。

### page-build

用途：根据已审核页面方案或可验证上下文，为 admin-fe 创建页面基建文件。

触发方式：

- 用户显式输入 `$devFlow page-build`
- 用户要求“根据页面方案创建页面基建”
- 用户要求“根据 page-tech / 飞书文档 / API 文档落地页面骨架”
- 用户要求“先搭页面 route、components、service、types、constants”

执行规则：

1. 读取 `references/page-build.md`。
2. 如果存在
   `contract-report.md`，先读取报告结论；如果报告不通过或存在阻塞项，不进入 page-build。
3. 如果没有 `contract-report.md`，提示先执行
   `contract-check`，或让 Human 明确确认跳过检查。
4. 根据输入来源收集上下文：本地 Markdown、飞书文档链接、API 文档或可用 MCP 工具读取的 Apifox 项目。
5. 使用 `assets/templates/page-build/` 下的模板作为文件占位参考。
6. 创建文件前必须复述文件清单、每个文件的具体改动内容和待确认项，并等待 Human 明确确认。
7. 只创建可 review 的基建占位，不写完整业务逻辑，不写最终视觉样式。
8. API 落地只基于已确认文档或工具读取结果；上下文缺失时写
   `TODO(api)`，不得补造接口字段。
9. 不修改 `src/routeTree.gen.ts`，不创建不必要的全局状态。

### contract-check

用途：在 `page-tech` 和 `page-build`
之间检查页面方案是否具备落地条件，避免直接生成错误骨架。

触发方式：

- 用户显式输入 `$devFlow contract-check`
- 用户要求“检查页面方案是否能落地”
- 用户要求“检查 page-tech 能不能进入 page-build”
- 用户要求“生成 contract-report”

执行规则：

1. 读取 `references/contract-check.md`。
2. 使用 `assets/templates/contract-report.md` 作为报告骨架。
3. 采用 v1 人工 checklist 模式，不承诺自动化脚本能力。
4. 可运行 `scripts/contract_check_static.mjs`
   辅助检查机械规则；脚本结果不能替代业务语义判断。
5. 逐条检查路由、目录命名、接口契约、页面状态、组件映射和待确认项。
6. 每条结论必须引用真实证据：文件路径、代码片段、文档章节、飞书读取内容、API 文档或 Apifox
   MCP 结果。
7. 检查失败时明确回到 `page-tech` 修正；检查通过时允许进入 `page-build`。

### foundation-freeze

用途：在 `page-build` 后、`figmaSync plan`
前生成页面基建事实快照，明确后续视觉阶段可修改范围。

触发方式：

- 用户显式输入 `$devFlow foundation-freeze`
- 用户要求“生成 foundation-summary”
- 用户要求“冻结页面基建事实”
- `figmaSync plan` 前发现目标页面已有基建但缺少最新快照

执行规则：

1. 读取 `references/foundation-freeze.md`。
2. 默认使用 `scripts/generate_foundation_summary.mjs` 扫描目标页面目录。
3. `foundation-summary.md` 必须机器生成，禁止人工编辑。
4. 快照不是唯一事实；真实代码仍是最终事实。
5. 如果重新生成后与上一次内容不一致，必须提示 Human 确认影响。
6. 快照用于约束 `figmaSync` 只改视觉、布局、Apex UI 选型、CSS 和局部展示细节。

### lark-doc

用途：将已生成或即将生成的技术文档发布到飞书 Wiki 父节点下。

触发方式：

- 用户显式输入 `$devFlow lark-doc`
- 用户要求“发布到飞书”
- 用户要求“写入飞书文档”
- 用户要求“落地到我的飞书个人笔记”
- 用户要求“在这个飞书 Wiki 节点下创建文档”

执行规则：

1. 读取 `references/lark-doc.md`。
2. 默认使用 `scripts/lark_publish_doc.mjs` 发布 Markdown 正文。
3. 使用环境变量读取飞书应用配置，不要在 Skill 或仓库中写入密钥。
4. 默认使用 `FEISHU_WIKI_PARENT_NODE_TOKEN` 作为父节点。
5. 创建 Wiki 子文档并写入正文后，返回飞书文档链接。

### lark-read

用途：读取飞书云文档或 Wiki 文档链接，提取内容作为后续研发工作流上下文。

触发方式：

- 用户显式输入 `$devFlow lark-read`
- 用户提供飞书文档链接并要求“读取文档”
- 用户要求“根据这个飞书文档生成技术方案”
- 用户要求“先读 PRD / 设计说明 / 接口文档”
- 用户要求“把这个飞书文档作为上下文”

执行规则：

1. 读取 `references/lark-read.md`。
2. 默认使用 `scripts/lark_read_docx.mjs` 读取 Wiki / Docx 内容。
3. 使用环境变量读取飞书应用配置，不要在 Skill 或仓库中写入密钥。
4. 判断链接类型：Wiki 节点、Docx 文档、旧版 Docs 文档或云盘文件夹。
5. 读取文档内容并整理成结构化上下文。
6. 如果读取结果要供 `page-tech`
   使用，必须输出页面名称、页面目标、页面范围、字段信息、接口信息、交互规则和待确认项。

## 未实现子命令

当前仅实现
`prepare`、`page-tech`、`contract-check`、`page-build`、`foundation-freeze`、`lark-read`
和 `lark-doc`。

如果用户要求组件开发、重构方案或其他技术文档类型，不要临时发挥。先说明当前
`devFlow` 尚未定义对应子命令，再与用户确认是否要扩展。
