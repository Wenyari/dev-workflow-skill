---
name: review
description: 研发评审技能导航。用户需要审查 PRD 缺失与风险、检查 PRD 与 UI 一致性、检查前端业务代码是否符合产品规范，或分析代码冗余、抽象机会、循环依赖和结构耦合时，先选择对应 Review 子技能。
---

# Review 技能导航

## 对齐边诊断

| 项 | 值 |
|---|---|
| 服务对齐边 | 不涉及对齐边（导航） |
| 现状分级 | 不适用 |
| AI 形态 | 不适用 |
| 主战场 | 需求评审前 / UI 评审前 / 开发中 |

## 这个 skill 解决什么问题

根据评审对象和证据标准选择单一 Review skill，避免把 PRD 完整性、PRD↔UI、产品规范和代码结构问题混进同一报告。

## 什么时候用

- 用户显式输入 `$review <target>`
- 用户要求“审查 PRD 是否完整、能否进入技术方案”
- 用户要求“检查 PRD 和 UI”“Review 前端产品规范”或“分析代码结构”

## 前置产物

| 产物 | 来源 | 是否必需 |
|---|---|---|
| 评审目标与范围 | 用户 | 必需 |
| PRD、Figma 节点、源码或 Graphify 数据 | 用户 / 当前工作区 | 按目标 skill 要求 |

## 输出产物

| 产物 | 位置 | 下游消费者 |
|---|---|---|
| Review 路由结果 | 当前对话上下文 | 被选中的 Review skill / 用户 |

## 下一步

- PRD 本身的缺失与技术风险 → [prd-review/SKILL.md](./prd-review/SKILL.md)
- PRD↔UI 语义差异 → [prd-ui-check/SKILL.md](./prd-ui-check/SKILL.md)
- 前端产品规范 → [frontend-code-review/SKILL.md](./frontend-code-review/SKILL.md)
- 冗余、抽象和结构耦合 → [code-structure-review/SKILL.md](./code-structure-review/SKILL.md)

## 明确不做

- 不在导航层读取全部 PRD、Figma、源码或图谱：具体证据由目标 skill 收集。
- 不把不同评审标准合并到一份报告：各 skill 的严重度和结论口径不同。
- 不自动修改业务代码或文档：Review 默认只读并输出报告。

---

## 路由表

| 用户目标 | 使用技能 |
|---|---|
| 检查 PRD 缺失、边界、风险和技术冲突 | `prd-review` |
| 判断 PRD 能否进入前端或后端技术方案阶段 | `prd-review` |
| 检查 PRD 与 UI 语义是否一致 | `prd-ui-check` |
| 检查页面是否遗漏需求、状态或操作 | `prd-ui-check` |
| 检查前端业务代码是否符合产品字段和交互规范 | `frontend-code-review` |
| 发现冗余函数、重复职责和可抽象代码 | `code-structure-review` |
| 分析高耦合、循环依赖和模块边界泄漏 | `code-structure-review` |

## 路由规则

- “PRD 本身是否完整、能否开发”使用 `prd-review`。
- 用户提供 PRD 和 Figma 节点时使用 `prd-ui-check`。
- “代码是否符合产品规范”使用 `frontend-code-review`。
- “代码是否冗余、是否值得抽象”使用 `code-structure-review`。
- 同时要求多个维度时拆成独立流程和报告，不混合严重度与证据标准。
