# 命令速查表

所有可用命令一览。第一次使用请先看 [QUICKSTART.md](./QUICKSTART.md)。

## devFlow · 开发层

| 命令 | 用途 | 前置产物 | 输出产物 |
|---|---|---|---|
| `$devFlow prepare` | 配置飞书环境变量 | — | 环境变量 |
| `$devFlow lark-read <url>` | 读飞书文档 | 飞书链接 | 上下文 |
| `$devFlow lark-doc` | 发布到飞书 Wiki | 已有文档 | 飞书文档链接 |
| `$devFlow page-tech` | 生成页面前端方案 | PRD / 需求 | `page-tech.md` |
| `$devFlow contract-check` | 检查方案可落地性 | `page-tech.md` | `contract-report.md` |
| `$devFlow page-build` | 创建页面基建 | `contract-report.md` 通过 | 前端代码 |
| `$devFlow foundation-freeze` | 生成基建快照 | 已落地页面 | `foundation-summary.md` |
| `$devFlow api-tech` | 生成后端方案 | PRD / 后端仓库 | `api-tech.md` |

## figmaSync · 开发层

| 命令 | 用途 | 前置产物 | 输出产物 |
|---|---|---|---|
| `figmaSync prepare` | 检查环境 | — | 检查结果 |
| `figmaSync plan <figma-url>` | 生成落地方案 | Figma URL + `foundation-summary.md` | `PLAN.md`, `figma-plan.css` |
| `figmaSync apply` | 实施编码 | 已审 `PLAN.md` | 页面 CSS / 组件代码 |

## 评审层（规划中）

| 命令 | 用途 | 状态 |
|---|---|---|
| `consistency-checker` | PM↔UI 一致性检查 | 规划中 |
| `risk-scanner` | 需求评审风险扫描 | 规划中 |
| `contract-aligner` | 技术评审契约对齐 | 规划中 |

## 产物层（规划中）

| 命令 | 用途 | 状态 |
|---|---|---|
| `open-issues` | 未闭环清单管理 | 规划中 |
| `calibration` | 校准清单管理 + 回喂 | 规划中 |
