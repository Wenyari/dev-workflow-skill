---
figmaUrl: <粘贴用户提供的 Figma URL>
nodeId: <从 URL 提取的 node-id，例如 123:456>
fileKey: <从 URL 提取的 fileKey>
targetFile: <计划落地的源码主文件，例如 src/routes/welcome/route.tsx>
foundationSummaryPath: ./foundation-summary.md

# 失效锚点（apply 阶段校验是否过期）
figmaMetadataHash: <get_metadata 返回 JSON 的 sha256>
figmaSnapshotPath: ./figma-snapshot.png
apexUiVersion: <node_modules/@frontend/apex-ui--react/package.json 的 version>
themeHash: <theme/dark/primitives.css + theme/dark/aliases.css 的 sha256 摘要>
cssDraftPath: ./figma-plan.css
cssDraftHash: <figma-plan.css 的 sha256>

# 报告引用
planReport: ./session-report-plan.md
applyReport: null

plannedAt: <ISO 时间戳>
status: planned # planned | applied | superseded
---

# PLAN: <页面/特性名>

> 本文档由 `figmaSync plan` 生成。plan 阶段同时生成 `figma-plan.css` 作为审核草案。
> 该 CSS 草案不在 plan 阶段接入业务代码；apply 阶段需在用户确认后迁移为正式 CSS。

## 1. 视觉结构

![figma-snapshot](./figma-snapshot.png)

```text
<节点层级树，按 get_metadata 输出整理；保留 nodeId 便于追溯>
- WelcomePage (1:1)
  ├── HeroBanner (1:2)
  ├── FeatureGrid (1:5)
  └── Footer (1:9)
```

## 2. 组件映射决策

| Figma 节点  | nodeId | 目标实现                                  | 复用类型         | 样式归属      | 是否需要 CSS | 备注               |
| ----------- | ------ | ----------------------------------------- | ---------------- | ------------- | ------------ | ------------------ |
| CTA Button  | 1:3    | `<Button type="primary" size="medium" />` | Apex UI          | Apex UI props | 否           | props 可覆盖视觉   |
| FilterPanel | 1:4    | `TableFilter`                             | common component | 业务组件 CSS  | 少量         | 只补布局 class     |
| HeroBanner  | 1:2    | 自定义 section                            | 无               | 页面 CSS      | 是           | 页面私有布局       |

> verify-plan 会校验本表里所有 `<Component prop=...>` 字面量是否存在于 Apex UI llm
> 文档；引用未注册的组件 / prop 会 fail 或 warning。
>
> 样式归属必须先判定再写 CSS。`Apex UI props` 表示颜色、边框、圆角、字号、状态样式由
> 组件 prop 或内置状态控制，不得写入 `figma-plan.css`；`业务组件 CSS` 和 `页面 CSS`
> 才允许进入 CSS 草案；`待确认` 必须进入待确认清单。

## 2.5 Icon 资产匹配

> 本章节由 `figmaSync plan` 根据 Figma 节点语义与仓库 icon inventory 生成。若仓库没有
> `assets/`、`icons/`、`public/`、`src/**/assets/`、`src/**/icons/` 中的可用 icon，
> 必须在表格中写明，并让用户确认其他 icon 导入方案或确认不关心 icon。

Icon inventory:

```json
<node .agent/skills/figmaSync/scripts/icon-inventory.mjs --pretty 的输出摘要>
```

| Figma 节点 | nodeId | 语义     | 匹配仓库 icon              | 匹配依据                | 状态 | 用户确认 |
| ---------- | ------ | -------- | -------------------------- | ----------------------- | ---- | -------- |
| SearchIcon | 1:20   | search   | `src/icons/SearchIcon.tsx` | 文件名精确匹配 `search` | 可用 | 已确认   |
| ExportIcon | 1:21   | download | -                          | 仓库未发现 download icon | 缺失 | 待确认   |

状态取值：

- `可用` — apply 阶段必须使用匹配到的仓库 icon。
- `缺失` — plan 阶段必须让用户确认处理方式；未确认时 verify-plan 失败。
- `忽略` — 用户明确表示不关心 icon 或接受无 icon 实现。

## 3. 组件与模块拆分规划

> 根据设计稿复杂度和目标目录的基建情况，制定合理的组件与样式拆分策略。

- **拆分策略**：[基于现有基建组件拆分 / Human 确认的轻量视觉拆分]
- **基建事实来源**：
  - route：
  - components：
  - service：
  - types：
  - constants：
  - foundation-summary：
- **figmaSync 允许修改范围**：
  - 布局。
  - CSS。
  - Apex UI 组件选型和 props。
  - 局部展示结构。
- **figmaSync 禁止修改范围**：
  - 路由路径。
  - service 契约。
  - API 请求基础封装。
  - 类型语义。
  - 页面核心状态模型。
  - 业务组件边界。
  - 权限逻辑。
  - Wujie bridge。
  - src/routeTree.gen.ts。
- **拆分明细**：
  - **模块/组件 A** (对应节点 `nodeId`)
    - 文件路径：`src/.../xxx.tsx`
    - CSS 拆分：`src/.../xxx.css` (包含主要的局部 class)
    - 职责/内容：...
  - **模块/组件 B** ...

## 4. CSS 变量映射表

| 来源（Figma）                          | 类型   | CSS variable              | /theme 路径                        | 原始值     | 命中方式                  | nodeId | designContextStatus |
| -------------------------------------- | ------ | ------------------------- | ---------------------------------- | ---------- | ------------------------- | ------ | ------------------- |
| `var(--fill-neutral-primary, #090A0B)` | color  | `--fill-neutral-primary`  | `foundation.fill.neutral.primary`  | `{grey.14}` | Fast Path 0 (variables)   | 1:2    | OK                  |
| `var(--spacing-24, 24px)`              | number | `--spacing-24`            | `baseValue.spacing.24`             | `24`       | Fast Path 0 (variables)   | 1:2    | OK                  |
| `#202226`                              | color  | `--fill-neutral-tertiary` | `foundation.fill.neutral.tertiary` | `{grey.12}` | Slow Path (value-match)   | 1:6    | OK                  |
| `--xxx-not-mapped`                     | -      | -                         | -                                  | -          | 未命中                    | 1:8    | OK                  |

命中方式取值约定：

- `Fast Path 0 (variables)` — 从 `get_variable_defs` 字典直接命中。
- `Fast Path 1 (lookup-var)` — `lookup-var.mjs` 命中。
- `Slow Path (value-match)` — `match-token.mjs` 命中。
- `未命中` — 写入 CSS 草案 TODO 注释和 §5 待确认清单。

designContextStatus 取值约定：

- `OK` — `get_design_context` 成功返回。
- `RECURSED` — 因 too-large 递归到子节点拿到的。
- `TOO_LARGE_SKIPPED` — 递归 2 层仍 too-large，apply 阶段必须补调。

## 5. CSS 草案审核

CSS 草案文件：`./figma-plan.css`

审核重点：

- 是否只使用原生 CSS。
- 是否优先使用 `/theme` CSS variables。
- 是否避免覆盖 Apex UI props 已能表达的样式。
- 是否已剔除 Apex UI 组件自管的状态色、背景、边框、圆角、字号、hover/active/disabled/selected 状态。
- 是否只包含归属为 `业务组件 CSS` 或 `页面 CSS` 的样式。
- 未命中变量是否均有 TODO 注释和待确认记录。

```css
<figma-plan.css 关键片段，保留完整文件在同目录>
```

## 6. 样式落地清单

### Level 1（组件局部 CSS）

- HeroBanner: `.welcome-page__hero`，使用 `--fill-neutral-primary` 与 `--spacing-24`。

### Level 2（扩展 common component）

- （无）

### Level 3（建议新增 /theme 变量）

- （无）

### 未命中待确认

- `#123456` from node `1:8`：现有 `/theme` 未命中，需要用户确认是否新增变量或接受一次性 CSS 值。

## 7. 实施步骤

| #   | 子任务                                          | 产物                    | 验证标准              | 独立 commit |
| --- | ----------------------------------------------- | ----------------------- | --------------------- | ----------- |
| 1   | 新建/更新 `<targetFile>` 骨架                   | route.tsx               | typecheck pass        | ❌          |
| 2   | 将 `figma-plan.css` 迁移为正式 CSS 文件         | route.css / styles.css  | format:check pass     | ✅          |
| 3   | 拼装 Apex UI 与 common component                | route.tsx               | dev 视觉 OK           | ✅          |
| 4   | 拼装自定义区块并绑定 className                  | route.tsx + CSS         | dev 视觉 OK           | ✅          |
| 5   | 收尾跑 `pnpm figma:report --command=apply ...` | session-report-apply.md | 硬编码待确认项已解释 | —           |

> 「独立 commit = ✅」的行做完后，AI 必须停下等用户测试再进入下一行。

## 8. CSS 草案内容

```css
/* figma-plan.css */
.welcome-page {
  min-height: 100%;
  background: var(--fill-neutral-primary);
}

.welcome-page__hero {
  display: flex;
  gap: var(--spacing-24);
}
```

## 9. 实施偏离记录

> 由 `figmaSync apply` 在执行过程中追加。如无偏离，保留本章节但留空。

- <ISO 时间戳> · <章节> · <原决策> → <新决策> · 原因：<一句话>

## 10. 盲区与待补调

记录 plan 阶段无法解析的节点（多为 too-large），apply 阶段必须补调：

| nodeId | 节点名    | 原因                                       | apply 补调状态 |
| ------ | --------- | ------------------------------------------ | -------------- |
| 1:42   | DataTable | get_design_context too-large 递归 2 层失败 | 待补调         |

## 11. 参考链接

- Figma URL: <同 frontmatter>
- Plan session report: <同 frontmatter.planReport>
- Apply session report: <apply 阶段写入 frontmatter.applyReport>

## 12. 反向校验

> 由 `pnpm figma:verify-plan` 跑出后，AI 把结果摘要写到这里。warning 项必须
> 在这里说明意图，否则 review 时无法判断是否可接受。

- CSS variable 校验：✅ N 行已检查
- CSS 草案校验：✅ figma-plan.css 已检查
- Apex UI 校验：✅ M 个组件已校验
- Icon 校验：✅ 可用 N · 缺失 M · 忽略 K
- warning：
  - <如有>
