---
name: figmaSync
description:
  Figma → 原生 CSS 落地规划工作流。命令路由：`figmaSync prepare`
  检查环境；`figmaSync plan <figma-url>` 先读取真实页面基建和
  foundation-summary，再分析设计稿，匹配 /theme CSS 变量、 Apex UI、common
  component 与 assets，并落地 PLAN.md + figma-plan.css 草案； `figmaSync apply
  [path]` 根据已审核 PLAN.md 和 CSS 草案实施编码。
---

# Figma to Native CSS (`/figmaSync`)

此技能用于把 Figma 业务设计稿转换为可审核、可落地的 React + 原生 CSS 方案。

核心原则：

- 执行 admin-fe 任务时必须遵守项目根目录 `ADMIN_FE_WORKFLOW.md`。
- L0/L1 小需求不强制进入 figmaSync；只有 Figma 视觉落地、新页面或页面级视觉重构才进入 plan/apply。
- 代码事实优先于设计稿推断；plan 阶段必须读取目标页面 route、components、service、types、constants 和最新
  `foundation-summary.md`。
- 样式优先复用 `/theme` 中已有 CSS variables。
- 能用 Apex UI props 解决的视觉，不写 CSS 覆盖。
- 能复用 common component、业务组件、icons/assets 的，不重新造。
- `figmaSync` 只补视觉、布局、Apex
  UI 选型、CSS 和局部展示细节；不能重新规划路由、重写 service 契约、改变核心状态模型或因为 Figma 图层结构重拆业务组件。
- `plan` 阶段必须同时产出 `PLAN.md` 和
  `figma-plan.css`，便于用户在编码前审核样式结构。
- `plan` 阶段产出的 `figma-plan.css` 是审核草案，不直接接入业务代码。

## 命令路由

| 用户输入                            | 跳到                                         | 用途                                     |
| ----------------------------------- | -------------------------------------------- | ---------------------------------------- |
| `figmaSync prepare`                 | [chapters/prepare.md](./chapters/prepare.md) | 检查技术栈、/theme、Apex UI 与资产可用性 |
| `figmaSync plan <figma-url>`        | [chapters/plan.md](./chapters/plan.md)       | 分析设计稿，落地 PLAN.md + CSS 审核草案  |
| `figmaSync apply [path/to/PLAN.md]` | [chapters/apply.md](./chapters/apply.md)     | 根据已审核 PLAN.md 和 CSS 草案实施页面   |
| 未指明命令，仅给 Figma 链接         | 询问用户是 `plan` 还是 `apply`               | —                                        |

第一次使用必须先跑 `figmaSync prepare`。

## 0. CSS 变量体系一览

项目的标准变量源是 `/theme`，当前重点读取：

- `theme/dark/primitives.css`
- `theme/dark/aliases.css`

变量层级按语义分为：

| 层级   | Set          | 用途                                           | 示例                               |
| ------ | ------------ | ---------------------------------------------- | ---------------------------------- |
| 调色板 | `palette`    | 原始颜色色卡，业务 CSS 不直接优先引用          | `palette.grey.3`                   |
| 语义   | `foundation` | 中性、品牌、状态等语义色                       | `foundation.fill.neutral.tertiary` |
| 基础   | `baseValue`  | spacing、radius、border、size、fontSize 等数值 | `baseValue.spacing.8`              |

推荐顺序：

- 颜色：优先 `foundation`，只有没有语义变量时才考虑 `palette`。
- 数字：优先 `baseValue`。
- 未命中：写入 `figma-plan.css`
  注释，等待用户确认是否新增变量或接受一次性 CSS 值。

## 1. 上下文准备

通过官方 Figma plugin MCP 获取目标节点的结构、截图、variables 与 design context。
在 Codex App 中优先使用已安装的 Figma plugin 工具（当前暴露为
`mcp__codex_apps__figma`），不要再要求用户手动配置旧的 `figma-remote-mcp`。

- `get_metadata`
- `get_screenshot`
- `get_variable_defs`
- `get_design_context`

## 2. 匹配流程

对每个节点按以下顺序处理，命中即停。

### Fast Path 0 — Apex UI 组件复用

阅读 `node_modules/@frontend/apex-ui--react/dist/llms.txt` 或单组件
`dist/llm/<component>.txt`，判断当前 Figma 节点是否能映射到已有组件：

- Button / Input / Select / Table / Modal / Drawer / Card / Tag / Tabs / Tooltip
  / Menu / Pagination …
- 命中后直接使用 Apex UI 组件。
- 视觉差异优先走组件 props，例如 `type`、`size`、`variant`。
- 能通过 props 表达的样式，不写入 `figma-plan.css`。

不走 Apex UI 的场景：节点明显是自定义容器、业务卡片、特殊布局、复杂组合模块。

### Fast Path 1 — Figma variables 直连 /theme

如果 `get_variable_defs` 返回变量名或变量路径，先在 `/theme` 变量记录中查找。

命中后在 PLAN.md 记录：

- `cssVariable`：真实 CSS variable，例如 `--fill-neutral-primary`
- `themePath`：变量路径，例如 `foundation.fill.neutral.primary`
- `cssValue`：原始值或 alias 表达式
- `usage`：建议用在哪些 CSS 属性上

在 `figma-plan.css` 中使用真实 CSS variable：

```css
.client-page {
  background: var(--fill-neutral-primary);
}
```

### Fast Path 2 — CSS `var(--xxx)` 查表

如果 Figma CSS 含 `var(--xxx, fallback)`，运行：

```bash
node .agent/skills/figmaSync/scripts/lookup-var.mjs "var(--fill-neutral-primary, #090A0B)"
```

成功输出示例：

```json
{
  "success": true,
  "cssVariable": "--fill-neutral-primary",
  "themePath": "foundation.fill.neutral.primary",
  "cssValue": "{grey.14}",
  "usage": ["color"],
  "layer": "foundation",
  "shortRef": "fill.neutral.primary"
}
```

必须把 `cssVariable` 写入 CSS，把 `themePath` 写入 PLAN.md 便于审核。

### Slow Path — 反向值匹配

仅当设计师把值写死为裸 `#hex`、`rgb()` 或 `Npx` 时运行：

```bash
node .agent/skills/figmaSync/scripts/match-token.mjs "<value>"
```

成功输出推荐的 CSS variable 与 `/theme` 路径。命中后仍然在 `figma-plan.css`
中使用 CSS variable，不直接写死值。

### Reuse Path — common component 与 assets

在进入自定义 CSS 前，必须扫描并记录复用机会：

- `src/common/**`
- 目标业务目录附近已有组件
- `assets/`
- `public/`
- `src/**/assets/`
- `src/**/icons/`

判断标准：

- 组件语义一致且 props 能覆盖当前需求 → 复用。
- icon/assets 文件名或组件名能和 Figma 节点语义匹配 → 复用。
- 仅视觉相似但语义不同 → 不确认命中，写入待确认清单。

### 样式归属判定

生成 CSS 草案前，必须先判断每条 Figma 样式属于谁控制。不能因为
`get_design_context` 返回了颜色、边框、圆角或字号，就机械写入 `figma-plan.css`。

按以下顺序判定：

1. **Apex UI 组件自管样式**
   - 由 Apex UI 组件 props、内置状态、组件内部 token 控制。
   - 只写入 PLAN.md 的组件映射决策，不写入 `figma-plan.css`。
   - 典型例子：
     - `Button`：`type`、`size`、`disabled`、`loading`、`icon`。
     - `Tag`：`color`、`variant`、`size`、`icon`。
     - `Tabs`：`type`、`activeKey`、`disabled`。
     - `Input`、`Select`、`DatePicker`：`size`、`status`、`disabled`。
     - `Table`：`size`、`loading`、`pagination`、`scroll`、列宽、固定列。
     - `Pagination`：`showSizeChanger`、`disabled`、`pageSizeOptions`。
     - `Drawer`、`Modal`：`size`、`mask`、按钮 props。
   - 若 Figma 中出现的是组件状态色，例如 primary、success、warning、error、active、disabled、hover、selected，应优先映射为对应组件 prop 或状态，不写 CSS 色值。
2. **业务组件自管样式**
   - 由业务组件内部状态映射或已有 class 控制，例如业务状态 tag、业务卡片、业务列单元格。
   - 可写 CSS，但必须限定在业务组件私有 class 下。
   - 如果业务组件内部最终使用 Apex UI 组件，颜色、尺寸、状态仍优先交给 Apex UI
     props。
3. **页面布局样式**
   - 页面容器、grid、flex、gap、padding、position、overflow、responsive、局部尺寸约束等。
   - 可以写入 `figma-plan.css`，并优先使用 `/theme` CSS variables。
4. **未命中或无法归属样式**
   - 写入 PLAN.md 待确认。
   - `figma-plan.css` 只写 TODO 注释，不直接写死裸值。

PLAN.md 的组件映射决策必须说明样式归属：`Apex UI props`、`业务组件 CSS`、
`页面 CSS` 或 `待确认`。`figma-plan.css` 只允许出现 `业务组件 CSS` 和 `页面 CSS`
需要承载的样式。

## 3. 原生 CSS 落地策略

### Level 1 — 组件局部 CSS

适用：页面或业务组件私有布局、容器、间距、无法由 Apex UI props 表达的简单状态。

动作：

- plan 阶段写入 `figma-plan.css`。
- apply 阶段按项目结构迁移为正式 CSS 文件，例如 `route.css`、`styles.css`
  或组件旁 CSS。
- class 使用 kebab-case。

### Level 2 — 已有 common component 扩展

适用：设计稿对应的能力已在 common component 中存在，但缺少少量状态或 class
slot。

动作：

- PLAN.md 中列出扩展点和影响面。
- apply 前必须让用户确认是否改公共组件。

### Level 3 — 新增 /theme 变量

适用：明确跨页面复用、且现有 `/theme` 找不到合适变量。

动作：

- PLAN.md 记录建议新增变量名、来源值、用途和影响面。
- plan 阶段不直接修改 `/theme`。
- apply 阶段只有在用户明确确认后才修改 `/theme`。

## 4. CSS 草案规则

`figmaSync plan` 必须在 PLAN.md 同目录生成：

```text
figma-plan.css
```

该文件必须包含：

- 页面根 class。
- 主要区块 class。
- 关键状态 class。
- 真实 CSS variable 引用。
- 只属于页面或业务组件的样式。
- 未命中变量的注释，格式为：

```css
/* TODO(figmaSync): unmatched color #123456 from node 1:2; needs user confirmation */
```

该文件禁止包含：

- 能通过 Apex UI props 表达的样式覆盖。
- Apex UI 组件自管状态色、状态背景、状态边框、内置圆角、内置字号等。
- 从 Figma 组件实例中抄出的 Apex UI 内部 token 覆盖。

## 5. 任务边界

### 任务开始

每次 figmaSync 任务启动前必须清空旧 session 记录：

```bash
pnpm figma:report --reset
```

### plan 收尾

必须运行：

```bash
pnpm figma:verify-plan <path/to/PLAN.md>
pnpm figma:report --command=plan --plan=<PLAN.md 路径> --target-dir=<PLAN.md 所在目录>
```

### apply 收尾

必须运行：

```bash
pnpm figma:report --command=apply --plan=<PLAN.md 路径> --target-dir=<PLAN.md 所在目录>
pnpm typecheck
pnpm format:check
pnpm lint
```

若格式检查失败，运行 `pnpm format` 后重新检查。

## 6. 速查命令

| 命令                                                          | 用途                                       |
| ------------------------------------------------------------- | ------------------------------------------ |
| `pnpm figma:prepare`                                          | 检查 /theme、Apex UI、common/assets 可用性 |
| `pnpm figma:report --reset`                                   | 清空本次 session 记录                      |
| `node .agent/skills/figmaSync/scripts/lookup-var.mjs "--xxx"` | CSS variable → /theme 路径                 |
| `node .agent/skills/figmaSync/scripts/match-token.mjs "#xxx"` | 裸值 → 推荐 CSS variable                   |
| `node .agent/skills/figmaSync/scripts/icon-inventory.mjs`     | 扫描 icon/assets                           |
| `pnpm figma:verify-plan <PLAN.md>`                            | 校验 PLAN.md 与 figma-plan.css             |
| `pnpm figma:report --command=plan ...`                        | 生成 plan session report                   |
