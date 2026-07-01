# dev-workflow-skill

研发工作流 Skill 集合，覆盖前端、后端与 Figma 视觉落地。**核心思想：AI
只生成结构化、可审核、可修改的初稿，人是文档与代码的最终决策者。**

- `devFlow` — 研发工作流统一入口。按 domain 组织，共享飞书读写与环境准备能力。
- `figmaSync` — Figma 设计稿 → 原生 CSS 落地工作流。

Skill 详细规则见各目录下的 `SKILL.md`。

---

## 目录结构

```
dev-workflow-skill/
├── README.md
├── devFlow/
│   ├── SKILL.md                          # 统一入口：领域判定、通用原则、子命令路由
│   ├── agents/
│   │   └── openai.yaml
│   ├── shared/                           # 跨 domain 共享
│   │   ├── references/                   # prepare / lark-read / lark-doc
│   │   └── scripts/                      # 飞书读写脚本
│   └── domains/
│       ├── frontend/                     # 前端（admin-fe）
│       │   ├── references/               # page-tech / contract-check / page-build /
│       │   │                             # foundation-freeze / lightweight-flow /
│       │   │                             # product-design-specs/
│       │   ├── templates/                # page-tech / page-build/ / contract-report /
│       │   │                             # mini-plan-l0 / mini-plan-l1
│       │   └── scripts/                  # check_page_tech_doc / contract_check_static /
│       │                                 # generate_foundation_summary
│       └── backend/                      # 后端技术方案
│           ├── references/               # api-tech
│           ├── templates/                # api-tech
│           └── scripts/                  # check_api_tech_doc
├── figmaSync/                            # Figma → CSS
│   ├── SKILL.md
│   ├── chapters/
│   ├── templates/
│   ├── scripts/
│   ├── examples/
│   └── snapshots/
└── docs/
```

### 目录约定

- **`shared/`**：跨 domain 复用的规则和脚本。当前放飞书三件套（`prepare` /
  `lark-read` / `lark-doc`）及 `lark_*.mjs` 脚本。新增跨领域能力（例如统一的
  Apifox 读取）也放这里。
- **`domains/<name>/`**：某个研发角色专属的子命令、模板、脚本。目录内部固定三层：
  - `references/`：子命令详细规则（每个子命令一个 md）。
  - `templates/`：文档骨架 / 文件占位。
  - `scripts/`：领域专属自检、扫描、落地脚本。
- **`agents/`**：入口 agent 配置。

### 脚本路径规约

所有脚本绝对路径以 `.agent/skills/devFlow/` 为前缀：

- 共享：`.agent/skills/devFlow/shared/scripts/<name>.mjs`
- 前端：`.agent/skills/devFlow/domains/frontend/scripts/<name>.mjs`
- 后端：`.agent/skills/devFlow/domains/backend/scripts/<name>.mjs`

脚本只从环境变量读取密钥，不打印 secret；输出 JSON，最终回复只摘取必要状态。

---

## 前端工作流链路

**面向 admin-fe 项目**。分层级触发不同链路，避免小需求也走重流程。

### 分层触发

先按 `HUMAN_AGENT_WORKFLOW.md` 判断 L0 / L1 / L2 / L3：

- **L0 / L1（小需求 / 局部改动）**：走 `lightweight-flow`，只做最小计划 →
  确认 → 修改 → 验证 → 总结。不强制生成 `page-tech.md` / `contract-report.md` /
  `foundation-summary.md`。
- **L2 / L3（页面级新建 / 视觉重构）**：进入标准链路。

### 标准链路（L2 / L3）

```
lark-read (可选)
    │
    ▼
page-tech ──► contract-check ──► page-build ──► foundation-freeze ──► figmaSync
    │              │                  │                  │                  │
    │       检查方案可落地       创建 route/         生成基建事实         视觉/CSS
    │       性、生成            components/         快照，冻结          落地（
    │       contract-report     service/types/      修改范围            plan+apply）
    │                           constants 占位
    │
    └──► lark-doc (发布到飞书 Wiki，任意阶段可选)
```

阶段说明：

1. **`lark-read`**（可选）：如果 PRD / 设计说明在飞书 Wiki，先用 `lark-read`
   抽取「前端上下文」结构化内容，避免只凭链接标题猜测。
2. **`page-tech`**：基于 PRD、设计、仓库代码生成页面级前端技术方案初稿；仓库不可用时字段一律标为待确认。
3. **`contract-check`**：v1 人工 checklist + `contract_check_static.mjs`
   辅助，逐条核对路由 / 目录命名 / 接口契约 / 页面状态 / 组件映射；不通过则回到
   `page-tech` 修正。
4. **`page-build`**：contract-report 通过后，按方案落地 route / components /
   service / types / constants 占位文件；不写完整业务逻辑，不改
   `src/routeTree.gen.ts`。
5. **`foundation-freeze`**：自动扫描页面目录生成
   `foundation-summary.md` 机器快照，用于约束 `figmaSync` 只改视觉 / 布局 / Apex UI
   / CSS，不改动路由和 service 契约。
6. **`figmaSync plan` / `apply`**：视觉落地（在 `figmaSync/` skill 中）。

任意阶段可插入 **`lark-doc`** 将 Markdown 产物发布到飞书 Wiki 父节点。

### 验证策略

- 纯 Markdown / Skill 文档改动不跑业务代码检查。
- L0 只跑与改动直接相关的最小验证。
- L1 优先 TypeScript 或局部验证。
- L2 / L3 改动代码后必须跑：

  ```bash
  pnpm typecheck
  pnpm format:check
  pnpm lint
  ```

  格式问题用 `pnpm format` 修复后重新检查。

---

## 后端工作流链路

**面向后端技术方案文档**。核心产出是文档，**不生成 controller / service / dto /
entity 代码骨架**。

```
lark-read (可选)
    │
    ▼
api-tech ──► check_api_tech_doc.mjs 自检
    │
    └──► lark-doc (发布到飞书 Wiki，可选)
```

阶段说明：

1. **`lark-read`**（可选）：PRD / 需求在飞书时先抽取「后端上下文」结构化内容（服务
   / 模块目标、接口需求、字段 / 数据结构、业务流程、错误与边界、待确认项）。
2. **`api-tech`**：按选择式骨架生成后端技术方案：
   - 必写章节：接口设计、数据模型 / 数据库设计、核心流程 / 时序、边界与异常、风险与待确认项。
   - 可选章节：背景与目标、范围与非目标、依赖与非功能性、完成标准（用户勾选）。
   - 硬规则：接口必含四要素（入参 path/query/body 区分、出参 `{ code, data,
     message }`、必填/默认/校验、错误码）；数据结构「字段表格 + TypeScript
     interface」双给；标题 `#`/`##`/`###` 三级最多、不手写序号。
3. **自检**：生成后跑
   `node .agent/skills/devFlow/domains/backend/scripts/check_api_tech_doc.mjs
   --file <md> --optional "<选中的可选章节>"`，覆盖章节齐全、数据模型含表格 +
   TS、接口含 TS 代码块、核心流程含 Mermaid、风险非空、标题无手写序号。
4. **`lark-doc`**（可选）：发布到飞书 Wiki。

### 代码事实优先

- 后端仓库可用时：接口 / 实体 / schema 必须基于真实代码，写清具体文件路径与关键片段引用。
- 后端仓库不可用时：不写具体路径、不声称某资源存在，涉及字段一律标为待确认。
- 飞书 PRD 与仓库代码冲突时：保留冲突并写入「风险与待确认项」，不擅自二选一。

---

## 如何贡献

### 触发方式的两种形态

Skill 通过 SKILL.md 的「子命令路由」识别触发词。改动 SKILL.md 时保持两种形态：

- **显式触发**：`$devFlow <sub-command>`（例如 `$devFlow page-tech`）。
- **语义触发**：自然语言（例如 "写页面开发技术方案"、"根据 PRD 生成后端落地方案"）。

新增子命令时至少给一种显式触发词和 2–3 条覆盖典型说法的语义触发词。

### 新增子命令（在已有 domain 内）

以「在 frontend 新增 `component-tech`」为例：

1. 在 `devFlow/domains/frontend/references/` 新建
   `component-tech.md`，写详细执行规则（工作流程、必需 / 可选上下文、硬规则、失败处理、输出格式）。
2. 如果需要独立骨架，在
   `devFlow/domains/frontend/templates/component-tech.md` 建模板；HTML 注释标
   `【必写】` / `【可选】`，生成正式文档时删除注释。
3. 如果需要静态自检脚本，在 `devFlow/domains/frontend/scripts/` 新建
   `check_component_tech_doc.mjs` 和 `*.test.mjs`；脚本输出 JSON，测试用 `node
   --test` 组织。
4. 修改 `devFlow/SKILL.md`：
   - 在「子命令路由」加一节，说明用途、触发方式、执行规则（引用
     reference / template / script 相对路径）。
   - 在「未实现子命令」段更新已实现列表。
5. 修改本 README 前端链路图，插入新子命令位置。

### 新增 domain（例如 test / requirement）

1. 建目录：`devFlow/domains/<name>/{references,templates,scripts}/`。
2. 至少建一个 reference（例如 `test-plan.md`）和对应模板。
3. 修改 `devFlow/SKILL.md`：
   - 「目录约定」段列出新 domain。
   - 「领域判定」段补入子命令 → domain 的映射；如与已有子命令重名，触发词冲突时必须先让用户确认领域。
   - 「子命令路由」按 `### <sub-command>（<domain>）` 加节。
4. 更新本 README 的目录结构树和顶部 skill 说明。

### 修改 shared 资源

`shared/` 改动会同时影响前后端所有子命令，需要格外小心：

- 修改 `shared/references/lark-read.md` 时，务必保留「前端上下文」和「后端上下文」两种输出结构；后续新增
  domain 时按需追加。
- 修改 `shared/scripts/` 中脚本时：
  - 脚本互相 import 用相对路径（`./lark_api.mjs`），迁移或改名要同步更新调用方。
  - 修改后跑 `node --test devFlow/shared/scripts/lark_api.test.mjs`
    确认基础能力不回退。

### 脚本路径引用

在 reference / SKILL.md 中引用脚本必须用完整绝对路径：

```
.agent/skills/devFlow/shared/scripts/<name>.mjs
.agent/skills/devFlow/domains/<domain>/scripts/<name>.mjs
```

不写相对路径（`scripts/xxx.mjs`），避免 skill 被不同工作目录加载时失效。

### 提交约定

分支和 commit 遵循全局规范：

- 分支：`<type>[/<scope>]/<description>`（例：`feat/devflow/component-tech`、`refactor/devflow/merge-backend`）。
- Commit：`<type>: <description>`（例：`feat: add component-tech subcommand`、`refactor: merge backendFlow into devFlow domains`）。

改动 skill 后必须验证：

- Markdown / SKILL.md 改动：跑
  `grep -rn "devFlow/scripts/\|backendFlow" devFlow/`
  确认没有旧路径残留。
- 脚本改动：跑相关 `*.test.mjs`。
- 触发词改动：SKILL.md 的 `description:`
  字段同步更新，让 skill 索引能命中新触发词。

### 不做的事

- 不在 SKILL.md 里堆子命令详细规则，规则永远放
  `references/<sub-command>.md`。
- 不在对话中临时重写飞书 API 脚本，能力沉淀回 `shared/scripts/`。
- 不为了"完整性"给可选章节写"不涉及"占位；用户没勾选就不生成。
- 不臆想接口 / 字段 / 路径 / 组件；缺就标待确认。
