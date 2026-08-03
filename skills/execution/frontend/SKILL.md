---
name: frontend
description: 前端研发执行工作流。适用于根据 PRD、UI、API 和目标仓库生成工作量拆分报告或页面技术方案，或把已确认方案经过契约检查、人工确认、页面基建生成、最小验证和基建 Review 落成可交接给视觉还原的前端代码。
---

# 前端研发工作流

## 对齐边诊断

| 项 | 值 |
|---|---|
| 服务对齐边 | PM↔前端、后端↔前端、UI↔前端 |
| 现状分级 | 结构性不健康 |
| AI 形态 | 兜底+校准 |
| 主战场 | 开发中 |

## 这个 skill 解决什么问题

把 PRD、UI、API 和代码事实整理为工作量拆分报告或页面技术方案，并将已确认方案通过门禁、写入、验证与基建 Review 落成可审核、可继续视觉还原的页面基建。

## 什么时候用

- 用户显式输入 `$frontend workload-plan`、`$frontend page-tech`、`$frontend page-build` 或 `$frontend page-build check`
- 用户要求“拆分前端工作量”“评估页面和组件复杂度”“规划并行开发链路和交付里程碑”
- 用户要求“生成前端页面技术方案”或“根据需求写页面落地方案”
- 用户要求“检查方案后创建页面基建”或“把已审核方案落到前端代码”

## 前置产物

| 产物 | 来源 | 是否必需 |
|---|---|---|
| PRD / 需求说明 | 用户或共享文档读取工具 | 必需 |
| 目标前端仓库 | 用户指定或当前工作区 | `workload-plan` 必需 |
| PRD Review 报告 | 独立 Review 流程 | L3 必需，L2 推荐 |
| 后端接口清单 | Apifox、后端仓库或用户确认 | `workload-plan` 用于判断就绪度；`page-tech` 与 `page-build` 必需 |
| `page-tech.md` | `$frontend page-tech` 或人工方案 | L2/L3 的 `page-build` 必需 |
| Figma 设计稿或等价 UI | 用户提供 | `workload-plan` 用于判断就绪度；`page-tech` 可选，视觉交接推荐 |

## 输出产物

| 产物 | 位置 | 下游消费者 |
|---|---|---|
| `workload-plan.md` | 用户确认的项目文档目录 | 开发负责人 / 排期评审 |
| `page-tech.md` | 用户确认的项目文档目录 | 人工评审 / `$frontend page-build` |
| `contract-report.md` | 用户确认的项目文档目录 | `page-build check` / L2/L3 写入门禁 / 人工评审 |
| 页面基建代码 | 用户确认的前端页面目录 | 前端开发 / Code Review |
| `foundation-summary.md` | 用户确认的项目文档目录 | 视觉还原流程 / 人工复核 |

## 下一步

- `workload-plan.md` 完成 → 开发负责人填写单人工时并确定并行开发安排
- `page-tech.md` 审核完成 → `$frontend page-build`
- `page-build` 完成且基建 Review 通过 → 由用户进入 `figma-sync plan`
- 基建 Review 未通过 → 保留问题与实际验证结果，修复后重新执行确认范围

## 明确不做

- 不做 PRD↔UI 语义检查：该能力属于独立 Review 流程。
- 不做最终视觉还原：本工作流只产出可交接基建，视觉实现由 `figma-sync` 承担。
- 不生成或修改后端接口：接口事实来自后端契约或仓库，前端流程不得反向臆造。
- 不在 `workload-plan` 中代替开发负责人填写具体工时。
- 不在未确认文件计划时写代码：`page-build` 的写入必须经过人工确认。

---

## 工作流边界

本文件只描述前端阶段、门禁和索引。进入具体阶段后再完整读取对应 reference，不把各阶段详细规则重复写入入口。

先根据仓库根目录的 `HUMAN_AGENT_WORKFLOW.md` 判断 L0/L1/L2/L3：

- L0/L1：读取 [references/lightweight-flow.md](./references/lightweight-flow.md)，允许跳过正式技术方案，但仍需最小计划、确认、修改、验证和总结。
- L2/L3：使用 `page-tech → page-build` 标准流程；`page-build` 内部依次完成契约检查、人工确认、基建写入、最小验证和 Foundation Review。
- L3 的 PRD Review 存在阻塞项时不得进入 `page-tech`；严重项必须保留在方案的风险与待确认项中。

## 命令路由

### `$frontend workload-plan`

用途：根据 PRD、UI、API 契约和目标仓库生成工作量拆分报告，不修改业务代码。

必须读取：

- [references/workload-plan.md](./references/workload-plan.md)
- [templates/workload-plan.md](./templates/workload-plan.md)

生成后使用 [scripts/check_workload_plan_doc.mjs](./scripts/check_workload_plan_doc.mjs) 做文档静态检查。

### `$frontend page-tech`

用途：只生成页面级前端技术方案，不修改业务代码。

必须读取：

- [references/page-tech.md](./references/page-tech.md)
- [references/mermaid.md](./references/mermaid.md)
- [templates/page-tech.md](./templates/page-tech.md)

生成后使用 [scripts/check_page_tech_doc.mjs](./scripts/check_page_tech_doc.mjs) 做文档静态检查。

### `$frontend page-build check`

用途：只检查方案、接口、路由、类型和基建上下文是否足以进入写入阶段，不修改业务代码。

必须读取：

- [references/contract-check.md](./references/contract-check.md)
- [templates/contract-report.md](./templates/contract-report.md)

可以使用 [scripts/contract_check_static.mjs](./scripts/contract_check_static.mjs) 辅助检查机械规则，但不能替代业务语义判断。

### `$frontend page-build`

用途：完成页面基建落地工作流。

必须按顺序执行：

1. 读取 [references/contract-check.md](./references/contract-check.md) 完成前置门禁。
2. 展示文件修改计划、验证命令和明确不修改范围，等待用户确认。
3. 读取 [references/page-build.md](./references/page-build.md)，只生成确认范围内的页面基建。
4. 运行与改动直接相关的最小验证。
5. 读取 [references/foundation-review.md](./references/foundation-review.md)，复核实际文件、计划外修改和验证结果，并生成 `foundation-summary.md`。

契约检查未通过或用户未确认写入计划时必须停止，不得跳过门禁。
