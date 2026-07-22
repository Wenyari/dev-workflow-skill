---
name: execution
description: 研发执行类技能导航。用户需要生成前后端技术方案、落地页面基建、读取或发布飞书文档、同步 Figma 设计稿时，先使用本导航选择 devFlow 或 figmaSync，再读取对应子技能的 SKILL.md。
---

# Execution 技能导航

本文件只负责识别意图和选择子技能，不包含具体执行流程。选定子技能后，必须完整读取对应 `SKILL.md`，不得根据本导航直接执行。

## 路由表

| 用户目标 | 使用技能 | 入口 |
|---|---|---|
| 读取飞书 PRD 或技术文档 | `devFlow` | [`devFlow/SKILL.md`](./devFlow/SKILL.md) |
| 生成前端页面技术方案 | `devFlow` | [`devFlow/SKILL.md`](./devFlow/SKILL.md) |
| 检查前端方案契约 | `devFlow` | [`devFlow/SKILL.md`](./devFlow/SKILL.md) |
| 创建页面基建代码 | `devFlow` | [`devFlow/SKILL.md`](./devFlow/SKILL.md) |
| 生成后端接口技术方案 | `devFlow` | [`devFlow/SKILL.md`](./devFlow/SKILL.md) |
| 发布文档到飞书 Wiki | `devFlow` | [`devFlow/SKILL.md`](./devFlow/SKILL.md) |
| 根据 Figma 落地页面样式 | `figmaSync` | [`figmaSync/SKILL.md`](./figmaSync/SKILL.md) |
| 检查 Figma token 和图标映射 | `figmaSync` | [`figmaSync/SKILL.md`](./figmaSync/SKILL.md) |

## 路由规则

- 用户显式指定 `$devFlow` 或 `figmaSync` 时，直接进入对应子技能。
- 同时涉及页面基建和视觉还原时，先执行 `devFlow`，基建确认完成后再执行 `figmaSync`。
- 用户只要求评审现有产物时，不使用本分类，转到 `review` 技能导航。
- 无法判断执行目标时，只询问会改变子技能选择的必要问题。

## 分类边界

- 本分类负责生成方案、创建基建和同步设计。
- 本分类不负责 PRD 与 UI 一致性、产品规范检查或代码结构 Review。
- 本分类不在导航层创建、修改或删除文件。

