---
name: execution
description: 研发执行技能导航。用户显式输入 `$execution frontend` 或 `$execution backend`，或要从技术方案开始推进前端页面开发、后端技术方案、接口实现后的集成测试、Figma 视觉还原时，先判断领域和当前阶段，再选择对应 skill。
---

# Execution 技能导航

## 对齐边诊断

| 项 | 值 |
|---|---|
| 服务对齐边 | 不涉及对齐边（导航） |
| 现状分级 | 不适用 |
| AI 形态 | 不适用 |
| 主战场 | 开发中 |

## 这个 skill 解决什么问题

只判断请求属于前端还是后端、当前处于哪个开发阶段，并选择对应执行 skill，避免在导航入口混入具体生成和检查规则。

## 前置产物

| 产物 | 来源 | 是否必需 |
|---|---|---|
| 用户目标与当前阶段 | 当前对话 | 必需 |
| 已有技术文档、代码或测试 | 当前工作区 / 用户 | 有则用于精确路由 |

## 输出产物

| 产物 | 位置 | 下游消费者 |
|---|---|---|
| 领域与阶段路由结果 | 当前对话上下文 | 被选中的 execution 子技能 / 用户 |

## 下一步

- 前端技术方案或页面基建 → [frontend/SKILL.md](./frontend/SKILL.md)
- 后端技术方案或阶段判断 → [backend/SKILL.md](./backend/SKILL.md)
- 明确要求后端接口测试 → [backend/SKILL.md](./backend/SKILL.md) 的 `integration-test` 阶段
- 明确要求 Figma 视觉还原 → [figma-sync/SKILL.md](./figma-sync/SKILL.md)

## 明确不做

- 不在导航层生成文档、代码或报告：具体规则属于选中的子技能。
- 不把 Review 请求当成执行请求：PRD、产品规范和代码结构评审由 review 导航选择。
- 不读取所有领域规则再做选择：只读取足以判定领域和阶段的上下文。

---

## 路由表

| 用户目标 | 使用技能 |
|---|---|
| 前端页面技术方案 | `frontend` → `page-tech` |
| 前端方案检查、页面基建或基建 Review | `frontend` → `page-build` |
| 后端技术方案或后端阶段判断 | `backend` |
| 后端接口测试生成或执行 | `backend` → `integration-test` |
| Figma 视觉还原 | `figma-sync` |

## 路由规则

- 用户明确说前端或后端时直接采用，不擅自切换领域。
- “技术方案”未说明领域时，询问前端还是后端。
- 前端 `page-build` 内部包含契约检查、写入确认、最小验证和 Foundation Review。
- backend 只编排已经定义的阶段；后端代码生成与交付 Review 当前未实现。
- 同时涉及多个阶段时，先选择当前最早且前置产物满足的阶段，不越过人工确认门禁。

## 分类边界

- 共享飞书读取、发布和环境准备属于 `tools/lark/`，不是前端或后端业务阶段。
- PRD Review 属于 review 层；execution 只消费其报告，不直接运行其规则。
- skill 之间只通过文档、代码、快照和测试报告交接，不由一个执行 skill 直接调用另一个。
