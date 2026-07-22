---
name: review
description: 研发评审类技能导航。用户需要检查 PRD 与 UI 一致性、前端业务代码是否符合产品规范，或分析代码冗余、抽象机会、循环依赖和结构耦合时，先使用本导航选择对应 Review 子技能。
---

# Review 技能导航

本文件只负责识别评审目标和选择子技能。选定后必须完整读取对应子技能的 `SKILL.md`，不得把不同评审标准混在同一报告中。

## 路由表

| 用户目标 | 使用技能 | 入口 |
|---|---|---|
| 检查 PRD 与 UI 语义是否一致 | `prd-ui-check` | [`prd-ui-check/SKILL.md`](./prd-ui-check/SKILL.md) |
| 检查页面是否遗漏需求、状态或操作 | `prd-ui-check` | [`prd-ui-check/SKILL.md`](./prd-ui-check/SKILL.md) |
| 检查前端业务代码是否符合产品字段和交互规范 | `frontend-code-review` | [`frontend-code-review/SKILL.md`](./frontend-code-review/SKILL.md) |
| 检查必填、校验、错误提示、只读态和反馈 | `frontend-code-review` | [`frontend-code-review/SKILL.md`](./frontend-code-review/SKILL.md) |
| 发现冗余函数、重复职责和可抽象代码 | `code-structure-review` | [`code-structure-review/SKILL.md`](./code-structure-review/SKILL.md) |
| 分析高耦合、循环依赖和模块边界泄漏 | `code-structure-review` | [`code-structure-review/SKILL.md`](./code-structure-review/SKILL.md) |

## 路由规则

- 用户显式指定子技能时，直接进入对应子技能。
- “代码是否符合产品规范”使用 `frontend-code-review`。
- “代码是否冗余、是否值得抽象”使用 `code-structure-review`。
- 同时要求产品规范和代码结构评审时，拆成两个独立流程和两份报告，禁止混合严重度与证据标准。
- 用户提供 PRD 和 Figma 节点时使用 `prd-ui-check`，不扫描代码结构。

## 分类边界

- Review 技能默认只读源码并输出报告，不自动修改业务代码。
- 导航层不读取全部规范、源码或图谱，只选择子技能。
- 当前不存在通用 Review 子技能，不得用一个子技能替代其他评审维度。

