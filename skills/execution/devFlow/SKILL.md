---
name: devFlow
description: 旧版研发工作流命令兼容导航。仅当用户显式输入 $devFlow 旧命令时使用，把 page-tech、page-build、api-tech、prd-review 和飞书子命令映射到拆分后的前端、后端、Review 或共享工具规则。
---

# devFlow 兼容导航

## 对齐边诊断

| 项 | 值 |
|---|---|
| 服务对齐边 | 不涉及对齐边（兼容导航） |
| 现状分级 | 不适用 |
| AI 形态 | 不适用 |
| 主战场 | 跨环节 |

## 这个 skill 解决什么问题

在前后端 execution 拆分后的迁移期继续解析旧 `$devFlow` 命令，并将其映射到新的领域入口或共享工具规则。

## 什么时候用

- 用户显式输入 `$devFlow <subcommand>`
- 旧文档仍要求“运行 devFlow page-tech / page-build / api-tech”
- 用户询问旧 devFlow 命令迁移到哪个新入口

## 前置产物

| 产物 | 来源 | 是否必需 |
|---|---|---|
| 旧 `$devFlow` 子命令与参数 | 用户或旧文档 | 必需 |

## 输出产物

| 产物 | 位置 | 下游消费者 |
|---|---|---|
| 兼容路由结果 | 当前对话上下文 | 新前端/后端/Review 入口或共享工具规则 |
| 原命令约定产物 | 原目标路径 | 旧命令调用者 |

## 下一步

- 新前端任务改用 `$frontend page-tech` 或 `$frontend page-build`
- 新后端方案改用 `$backend api-tech`
- 新 PRD 评审改用 `$prd-review`
- 旧飞书命令继续按 `tools/lark/references/` 执行，后续改用平台独立飞书能力

## 明确不做

- 不承载新的业务规则：新增能力必须进入 frontend、backend、review 或独立 skill。
- 不重新组合跨领域完整流程：兼容层只做一对一映射。
- 不改变旧命令的授权边界：旧命令不会因为迁移而扩大文件写入或测试范围。

---

## 命令映射

| 旧命令 | 新入口或规则 |
|---|---|
| `$devFlow page-tech` | 读取 [../frontend/SKILL.md](../frontend/SKILL.md)，按 `$frontend page-tech` 执行 |
| `$devFlow contract-check` | 读取 [../frontend/SKILL.md](../frontend/SKILL.md)，按 `$frontend page-build check` 执行 |
| `$devFlow page-build` | 读取 [../frontend/SKILL.md](../frontend/SKILL.md)，按 `$frontend page-build` 执行 |
| `$devFlow foundation-freeze` | 读取 [../frontend/SKILL.md](../frontend/SKILL.md)，只执行 Foundation Review 阶段 |
| `$devFlow api-tech` | 读取 [../backend/SKILL.md](../backend/SKILL.md)，按 `$backend api-tech` 执行 |
| `$devFlow prd-review` | 读取 [../../review/prd-review/SKILL.md](../../review/prd-review/SKILL.md)，按 `$prd-review` 执行 |
| `$devFlow prepare` | 读取 `tools/lark/references/prepare.md` |
| `$devFlow lark-read` | 读取 `tools/lark/references/lark-read.md` |
| `$devFlow lark-doc` | 读取 `tools/lark/references/lark-doc.md` |

## 兼容期规则

- 只有用户显式使用旧命令时进入本文件；自然语言新请求由 execution 导航选择新入口。
- 映射后必须完整读取目标入口或共享工具 reference，不根据本兼容表直接生成产物。
- 旧命令保留至少一个版本；移除前必须更新 `CHANGELOG.md` 并给出替代命令。
