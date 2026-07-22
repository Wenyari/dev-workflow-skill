---
name: frontend-code-review
description: 检查已写完的前端业务代码是否遵循 `tools/product-design-specs/` 中的产品设计规范。用户按目录、文件或 PR diff 声明范围，分批 review 字段布局、必填标识、校验触发、错误提示、只读态、列表操作、交互反馈等语义级约束，最终一次性输出问题清单。适用于 page-build 完成后补充完业务代码、PR 合入前的自查、要求细致 review 场景。
---

# 前端代码 Review

## 对齐边诊断

| 项 | 值 |
|---|---|
| 服务对齐边 | 不涉及对齐边 |
| 现状分级 | 弱兜底 |
| AI 形态 | 不适用 |
| 主战场 | 开发中 → 自测联调前 |

> 本 skill 是工程质量兜底工具，不服务方法论定义的 6 条对齐边，按 CONTRIBUTING §4 允许工具型 skill 填「不涉及/不适用」。

## 这个 skill 解决什么问题

在前端业务代码写完后、自测联调前，按产品设计规范逐项检查代码是否遵循字段、交互、反馈的语义级约束，提前发现 ESLint / Prettier / TypeScript 覆盖不了的规范违规。

## 什么时候用

- 用户显式输入 `$frontend-code-review start <scope>` / `$frontend-code-review batch <n>` / `$frontend-code-review finalize`
- 用户话术：「帮我 review 一下这些页面代码符不符合产品设计规范」
- 用户话术：「page-build 完的代码我补了业务逻辑，帮我细致 review 一下」
- PR 合入前的自查场景，或补充完 5000-10000 行业务代码后统一检查

## 前置产物

| 产物 | 来源 | 是否必需 |
|---|---|---|
| 已写完的前端业务代码 | 用户指定目录 / 文件 / PR diff | 必需 |
| `tools/product-design-specs/` | 仓库内共享 tool（PR1 已抽出） | 必需 |
| `foundation-summary.md` | `$devFlow foundation-freeze` | 可选，帮助确认组件库上下文 |

## 输出产物

| 产物 | 位置 | 下游消费者 |
|---|---|---|
| `code-review-report.md` | 用户在 `start` 阶段指定的目录 | 人工修改代码；未闭环问题可进入 `artifact/open-issues` |
| 批次中间记录 | 用户在 `start` 阶段指定的工作目录 | 本 skill 的 `finalize` 阶段消费 |

## 下一步

- 报告中的问题由人工修改代码后自测；不由 Agent 自动改代码。
- 未闭环问题进入 `artifact/open-issues`。
- 误报、漏报及人工修正结果可进入 `artifact/calibration`。

## 明确不做

- 不做自动修复：Agent 只出报告，改由人；自动改代码会破坏业务逻辑或隐藏真实问题。
- 不做 ESLint / Prettier / TypeScript 覆盖的机械规则：命名、格式、类型这些工具更快更准；本 skill 只做语义级 review。
- 不做单元测试生成：测试属于开发环节其他工具的范畴，不塞进 review。
- 不做架构级重构建议：如「应该拆组件」「应该改状态管理」，属于设计决策而非规范 review。
- 不做后端代码 review：backend 规范集不同，需另开独立 skill。
- 不做视觉还原、像素、颜色、字号检查：属于 `figmaSync` 的范畴。
- 不做 PRD ↔ 代码语义对齐：属于 `prd-ui-check` 的范畴。
- 不自动打 P0 / P1 / P2 优先级：报告描述影响，由开发者与评审者确定处理时机。

---

## 命令路由

### `$frontend-code-review start <scope>`

用途：声明 review 范围、扫描代码识别字段类型和交互能力、生成批次计划。

进入命令后立即读取 [references/review-flow.md](./references/review-flow.md) 的 **start 阶段** 与 [references/field-mapping.md](./references/field-mapping.md)，严格按流程推进。

用户必须在 `start` 阶段声明：
1. **review 范围**：目录路径、文件列表或 PR diff
2. **工作目录**：批次中间记录和最终报告的存放位置

### `$frontend-code-review batch <n>`

用途：跑第 n 批的比对，产出批次中间记录。可续跑、可回顾。

进入命令后读取 [references/review-flow.md](./references/review-flow.md) 的 **batch 阶段**。**按需 lazy load** 该批次涉及的规范分册（`tools/product-design-specs/` 内），不要一次性加载全部规范。

### `$frontend-code-review finalize`

用途：合并所有批次记录，输出最终 `code-review-report.md`。

进入命令后读取 [references/review-flow.md](./references/review-flow.md) 的 **finalize 阶段**、[references/report-conventions.md](./references/report-conventions.md) 与报告模板 [templates/code-review-report.md](./templates/code-review-report.md)。

## 通用原则

- 使用中文输出。
- 产品设计规范是判断依据；ESLint / Prettier / TypeScript 已覆盖的规则一律不查。
- 字段类型必须区分「代码可观察的事实」和「根据命名、props、上下文推测的语义」。
- 字段类型无法判断时**不套用规范**，写入待确认清单（对齐 `tools/product-design-specs/index.md` 硬约束）。
- 默认批量记录问题和证据，不逐条打断用户；仅当歧义会阻断后续判断时提问。
- 用户主动提供的人工判断优先于 AI 的推测，并在报告中标记为「人工确认」。
- 全部批次跑完后，一次性输出最终报告。
- 每条问题必须引用 `文件:行号` 和对应规范分册的具体条目，附代码片段作为证据。
- 不建立正则驱动的通用规则库；语义判断由 Agent 完成，人工确认负责校正。
- 严重度只用 🔴 阻塞 / 🟡 建议 / 🟢 提示 三档，不用 P0 / P1 / P2。

## 输入约束

- **代码范围**：只对用户显式声明的 scope 内文件做 review，不主动扩散到未声明范围。
- **规范来源**：只引用 `tools/product-design-specs/` 内分册；不引入外部规范。
- **批次划分**：单批约 500-1000 行代码，避免上下文过载；具体划分策略见 `references/review-flow.md`。
- **续跑**：批次中间记录必须落盘，允许 `batch n` 与 `batch n+1` 分开跑。

## 交付约束

- 默认输出 `code-review-report.md`，落盘前确认存放目录。
- 已有同名报告时不覆盖，先询问用户改名或明确覆盖。
- 用户尚未声明「全部批次跑完」前，仅在用户主动询问时输出简短进度，不提前输出最终报告。
- 最终报告必须保留检查范围、字段清单、问题清单、已确认合规项、待确认字段类型五个板块，不能只列问题。
