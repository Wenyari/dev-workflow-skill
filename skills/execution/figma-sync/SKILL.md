---
name: figma-sync
description: Figma → 原生 CSS 落地工作流。用户显式输入 `figma-sync prepare`、`figma-sync plan <figma-url>`、`figma-sync apply [path]`，或在页面基建就绪后提供 Figma URL 并要求还原视觉、生成页面样式时使用；负责检查环境、生成可审核的 PLAN.md 与 CSS 草案，并按已审核方案实施编码。
---

# Figma to Native CSS (`/figma-sync`)

## 对齐边诊断

| 项 | 值 |
|---|---|
| 服务对齐边 | UI↔前端 |
| 现状分级 | 结构性不健康 |
| AI 形态 | 兜底 + 校准 |
| 主战场 | 开发中 |

## 这个 skill 解决什么问题

把已完成页面基建的 Figma 视觉稿转换为可审核、可实施的原生 CSS 方案，优先复用项目现有组件、设计变量和资产，不反向改写业务契约。

## 前置产物

| 产物 | 来源 | 适用命令 |
|---|---|---|
| 目标项目和现有技术栈 | 当前工作区 | `prepare`、`plan`、`apply` |
| 含 `node-id` 的 Figma URL | 用户 | `plan` |
| 最新 `foundation-summary.md` | `$frontend page-build` 的 Foundation Review | `plan`、`apply` |
| 已存在的 route、components、service、types、constants | 前端仓库 | `plan`、`apply` |
| 已审核 `PLAN.md` 与 `figma-plan.css` | `plan` 产物 | `apply` |

## 输出产物

| 命令 | 产物 |
|---|---|
| `prepare` | 环境 blocker、warning 与修复建议 |
| `plan` | `PLAN.md`、`figma-plan.css`、Figma 快照和 plan session 报告 |
| `apply` | 已确认范围内的页面 CSS、组件调整、偏离记录和 apply session 报告 |

## 工作流边界

- 执行 admin-fe 任务时遵守项目根目录 `ADMIN_FE_WORKFLOW.md`。
- L0/L1 小需求不强制进入本流程；只有 Figma 视觉落地、新页面或页面级视觉重构才进入 `plan` / `apply`。
- 代码事实优先于 Figma 图层推断；通过最新 `foundation-summary.md` 与 `$frontend page-build` 交接，不由本 skill 重建页面基建。
- 优先使用 Apex UI props、`/theme` CSS variables、common component 和已有 icons/assets；不重新造已有能力。
- `plan` 只生成审核产物，`figma-plan.css` 不直接接入业务代码。
- `apply` 只实施已审核计划；公共组件或 `/theme` 修改必须在计划中披露影响面并取得用户明确确认。
- 不重新规划路由、重写 service/API 契约、改变核心状态模型或权限逻辑，不因 Figma 图层结构重拆业务组件。

## 命令路由

只完整读取当前命令对应的 chapter，不预加载其他阶段细节：

| 用户输入 | 必须读取 | 作用 |
|---|---|---|
| `figma-sync prepare` | [chapters/prepare.md](./chapters/prepare.md) | 检查 Node、pnpm、Apex UI、`/theme`、资产和脚本环境 |
| `figma-sync plan <figma-url>` | [chapters/plan.md](./chapters/plan.md)、[templates/PLAN.md.tpl](./templates/PLAN.md.tpl) | 基于真实基建和 Figma 节点生成审核计划与 CSS 草案 |
| `figma-sync apply [path/to/PLAN.md]` | [chapters/apply.md](./chapters/apply.md) | 校验锚点并实施已审核的视觉方案 |

首次使用、工作流脚本升级后或 plan/apply 出现环境异常时，先执行 `prepare`。仅提供 Figma 链接但未说明阶段时，先确认是生成 `plan` 还是执行已审核的 `apply`。

## 交付顺序

1. `prepare` 没有 blocker。
2. `plan` 读取真实页面基建和 Figma 节点，生成审核产物。
3. 用户审核 `PLAN.md`、CSS 草案、公共影响面和待确认项。
4. `apply` 校验锚点与工作树，只实施确认范围并运行项目验证。

任一 chapter 的阻塞条件未解除时停止，不越过人工确认门禁，也不以最终视觉相似替代契约和验证结果。
