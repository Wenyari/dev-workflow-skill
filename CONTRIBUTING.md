# 贡献指南

本仓库承载研发协作 AI 工具库。所有 skill 和 tool 的新增、修改都必须遵守本指南。

分层、命名、依赖和交付约束以本指南为准；L0/L1/L2/L3 协作分级以 [`HUMAN_AGENT_WORKFLOW.md`](./HUMAN_AGENT_WORKFLOW.md) 为准；架构例外必须通过 `docs/adr/` 记录，不在单个 skill 内私自定义。

---

## 1. 在动手之前：分层决策

先回答三个问题，再动手：

1. **新需求是新建 skill，还是给现有 skill 加子命令？**
   - 新增能力属于现有 skill 的职责边界、且不改变核心输出产物 → 加子命令
   - 服务新的评审或执行对象、或改变输出产物结构 → 新建 skill

2. **新建 skill 属于哪一层？**

   | 层 | 判断 |
   |---|---|
   | `skills/review/` | 服务评审环节，例如 PRD 完整性、PRD↔UI、产品规范和代码结构 Review |
   | `skills/execution/` | 服务开发环节（写方案、写代码、视觉还原） |

3. **能否复用现有 tools/，还是要新增 tool？**
   - 至少两个 skill 会用到 → 抽为 tool
   - 仅一个 skill 用 → 留在 skill 内的 `scripts/`

---

## 2. 新建 skill 的六步流程

**步骤 1：对齐边诊断**

先按模板中的受控值填写五段式头部的"对齐边诊断"表格。现有值无法表达职责时，先提交 ADR 讨论，不在新 skill 内自行扩展词表。

**步骤 2：检查仓库边界**

确认：

- 该职责是否已有稳定工具化契约（如 Apifox）？有 → 优先复用，不新建重复 skill
- 该问题是否已有 review、execution 或 tools 能力覆盖？有 → 扩展现有入口或共享工具
- 该环节 ROI 是否已被验证？未验证 → 建 skill 时明确"投产验证策略"

**步骤 3：复制模板**

```bash
cp -r docs/skill-template skills/<layer>/<skill-name>
```

**步骤 4：填五段式 SKILL.md 头部**

五段式硬约束（见第 4 章）。

**步骤 5：定义产物 schema**

前置产物、输出产物必须写明：
- 产物文件名（或数据结构名）
- 位置（相对路径）
- 来源 skill / 下游消费者

**步骤 6：更新导航文档**

必更新：
- `CHEATSHEET.md`：加一行命令
- `DECISION_TREE.md`：加一条决策分支

如属高频路径（预计月使用 ≥5 次），加更新：
- `QUICKSTART.md`：加为完整命令序列

---

## 3. 新建 tool 的四步流程

**步骤 1：判断是否值得抽为 tool**

- 至少两个 skill 会调用 → 抽
- 单 skill 使用 → 留在 skill 内 `scripts/`
- 通用能力但仅一个 skill 用 → 留在 skill 内，等第二个 skill 用时再抽

**步骤 2：定义输入输出 JSON schema**

tool 是纯能力层，必须有稳定的输入输出契约。schema 写在 tool 目录的 `README.md`。

**步骤 3：安全约束**

- 只从环境变量读密钥，不写死
- 不输出 secret 到 stdout / 日志
- 错误信息不泄露内部路径

**步骤 4：提供最小自检脚本**

每个 tool 必须有 `*.test.mjs` 或等价的自检，能一键验证 tool 是否可用。

---

## 4. SKILL.md 五段式硬规则

五段式全部**必填**：

1. **对齐边诊断** —— 4 项全填，工具型 skill 填"不适用"，不允许省略
2. **这个 skill 解决什么问题** —— 一句话，30-80 字
3. **什么时候用** —— 至少 1 条显式命令 + 2 条用户话术触发场景
4. **前置产物** —— 无前置写"无"，不留空
5. **输出产物** —— 至少 1 条，必须指明下游消费者
6. **下一步** —— 至少 1 条推荐路径
7. **明确不做** —— 至少 2 条，每条写清"不做什么 + 理由"

不合规的 SKILL.md 视为不合格，PR 不予合入。

---

## 5. 命名规范

| 对象 | 规范 | 示例 |
|---|---|---|
| skill 目录 | kebab-case | `prd-ui-check` |
| tool 目录 | kebab-case | `figma-mcp` |
| 子命令 | kebab-case，动宾结构 | `page-tech`, `contract-check` |
| 产物文件 | kebab-case + `.md` | `contract-report.md` |
| 脚本文件 | snake_case + `.mjs` | `lark_publish_doc.mjs` |

代码内命名遵循用户全局 frontend / backend 规则（见 `~/.claude/rules/`）。

---

## 6. 目录结构约定

**skill 内部结构**：

```
skills/<layer>/<skill-name>/
├── SKILL.md              # 必需，五段式头部 + 索引
├── references/           # 可选，详细规则
├── templates/            # 可选，产物模板
└── scripts/              # 可选，skill 私有脚本
```

**tool 内部结构**：

```
tools/<tool-name>/
├── README.md             # 必需，输入输出 schema、使用说明
├── *.mjs                 # 能力脚本
└── *.test.mjs            # 自检
```

**分层依赖硬规则**：

- **禁止跨层反向依赖**：`tools/` 不引用 `skills/`
- **禁止 skill 之间直接调用**：review / execution skill 只能通过**产物文件**传递数据，不允许 A skill 内部脚本读 B skill 目录
- **导航例外**：分类导航和迁移期兼容导航可以选择并加载目标 `SKILL.md`，但不得代替目标 skill 执行业务脚本、修改文件或绕过其确认门禁
- **共享能力必须走 tools/**：多个 skill 用到同一能力时，抽到 tools/
- **tools/ 内资源被引用时，路径统一从仓库根开始写**：如 `tools/product-design-specs/index.md`，不用相对路径

---

## 7. 产物 schema 变更规则

- 规划中的 artifact 能力见 `docs/roadmap/artifact.md`；投产前必须先用 ADR 定义 schema 和读写边界
- 输出产物 schema 变更必须同步更新所有下游 skill 的"前置产物"声明
- 破坏性 schema 变更需在 `CHANGELOG.md` 明确标注

---

## 8. 提交前自检清单

提交前逐条勾选：

- [ ] SKILL.md 五段式头部完整（对齐边诊断 4 项都填）
- [ ] "明确不做"至少 2 条，每条有理由
- [ ] 前置产物 / 输出产物写明下游消费者
- [ ] 已更新 `CHEATSHEET.md`（如新增/改子命令）
- [ ] 已更新 `DECISION_TREE.md`（如新增 skill）
- [ ] 已更新 `QUICKSTART.md`（如属高频路径）
- [ ] 无硬编码密钥
- [ ] 无跨层反向依赖
- [ ] 涉及架构变更时有对应 `docs/adr/` 记录

---

## 9. 已有 skill 的改动规则

- **五段式头部变更**：同步更新 `CHEATSHEET.md` / `QUICKSTART.md` / `DECISION_TREE.md`
- **输出产物 schema 变更**：显式通知所有下游 skill 维护者，并在 PR 描述列出受影响 skill
- **迁移路径变更**（如 skill 改名 / 移层）：在 `CHANGELOG.md` 记录，保留至少 1 个版本的旧路径 alias

---

## 10. 提交规范

**Commit message**（Conventional Commits）：

- `feat(<scope>): <描述>` —— 新增 skill / tool / 子命令
- `fix(<scope>): <描述>` —— 修复 bug
- `refactor(<scope>): <描述>` —— 重构（不改变外部行为）
- `docs(<scope>): <描述>` —— 文档
- `chore(<scope>): <描述>` —— 杂项

`<scope>` 用 skill / tool 目录名，如 `feat(prd-ui-check): add semantic workflow`。

**分支**：

```
<type>/<scope>/<description>
```

如 `feat/prd-ui-check/semantic-workflow`。

**涉及架构边界**的改动，commit body 必须引用对应 ADR，如 `refs: docs/adr/0001-split-execution-by-domain.md`。
