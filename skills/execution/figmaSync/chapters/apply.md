# `figmaSync apply [path/to/PLAN.md]`

基于 `figmaSync plan` 产出的 PLAN.md 与 `figma-plan.css` 实施页面编码。

## apply 边界

apply 阶段只能实施已审核 PLAN.md 覆盖的视觉和布局内容，并遵守
`ADMIN_FE_WORKFLOW.md`。

允许：

- 布局。
- CSS。
- Apex UI 组件选型和 props。
- 局部展示结构。
- PLAN.md 偏离记录。

禁止：

- 重新规划路由。
- 重写 service 契约。
- 改变核心状态模型。
- 修改权限逻辑。
- 修改 Wujie bridge。
- 手动编辑 `src/routeTree.gen.ts`。
- 因 Figma 图层结构重拆业务组件。

## 执行步骤

### Step 1 — 解析 PLAN.md 位置

- 用户给了路径 → 用之。
- 没给路径 → AI 主动询问，禁止猜测。
- 路径不存在 / 不是 PLAN.md → 中断。

### Step 2 — frontmatter 锚点校验

读 PLAN.md frontmatter，对以下锚点做实时比对：

| 字段                | 校验做法                                                   | 失配处理                                           |
| ------------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| `apexUiVersion`     | 与 `@frontend/apex-ui--react/package.json` version 比较    | 提示 Apex UI 已变化，询问是否继续                  |
| `themeHash`         | 重新计算 `theme/dark/*.css` 摘要                           | 提示 /theme 已变化，建议重跑 plan 或确认继续       |
| `cssDraftPath`      | 文件是否存在                                               | 缺失则中断，因为 apply 需要审核过的 CSS 草案       |
| `cssDraftHash`      | 重新计算 figma-plan.css 摘要                               | 提示 CSS 草案已变化，询问是否继续                  |
| `figmaMetadataHash` | 默认信任 PLAN.md；仅在用户怀疑设计稿改动时重新调 Figma MCP | 不一致则提示设计稿已变化，建议重跑 plan 或确认继续 |

任何失配都不自动继续。AI 必须在回复里列出失配项，并询问用户是否继续。

### Step 3 — Session 边界

```bash
pnpm figma:report --reset
```

### Step 4 — 复述关键决策

读完 frontmatter + 正文，复述最多 5 行关键决策：

- 目标文件及主要拆分（依据 §3 组件与模块拆分规划）。
- CSS 草案文件及拆分安排。
- Apex UI / common component 复用。
- CSS variables 命中情况。
- 待确认的未命中样式或 icon。
- foundation-summary 中的允许/禁止修改范围。

得到用户确认后再动手。

### Step 5 — 工作树状态检查

```bash
git status
```

列出未提交改动，避免覆盖他人工作。

### Step 6 — 将 CSS 草案迁移为正式样式文件

根据 PLAN.md `## 6. 实施步骤` 逐步执行。

常见迁移方式：

- route 页面：迁移为 `route.css` 或同目录 `styles.css`。
- 组件私有样式：迁移到组件旁 CSS 文件。
- 已有 CSS 文件：按 PLAN.md 审核结果合并。

约束：

- 不引入 Panda CSS。
- 不引入 styled-system。
- class 使用 kebab-case。
- 能由 Apex UI props 表达的样式不写 CSS 覆盖。
- 迁移前必须按 PLAN.md 的样式归属复核每条 CSS：
  - `Apex UI props`：删除 CSS 覆盖，改用组件 prop 或内置状态。
  - `业务组件 CSS`：只迁移到对应业务组件私有 class。
  - `页面 CSS`：只迁移页面布局、容器、间距、定位、响应式等样式。
  - `待确认`：未获用户确认前不迁移为正式 CSS。
- Apex
  UI 组件自管样式不得进入正式 CSS，包括状态色、状态背景、状态边框、内置圆角、内置字号、hover/active/disabled/selected 状态。
- 常见 prop 接管示例：
  - `Button` 使用 `type`、`size`、`disabled`、`loading`、`icon`。
  - `Tag` 使用 `color`、`variant`、`size`、`icon`。
  - `Tabs` 使用 `type`、`activeKey`、`disabled`。
  - `Input`、`Select`、`DatePicker` 使用 `size`、`status`、`disabled`。
  - `Table` 使用 `size`、`loading`、`pagination`、`scroll`、列宽和固定列。
  - `Pagination` 使用 `showSizeChanger`、`disabled`、`pageSizeOptions`。
  - `Drawer`、`Modal` 使用 `size`、`mask` 和按钮 props。
- `figma-plan.css` 不直接作为生产 CSS 接入，除非 PLAN.md 明确要求且用户确认。

### Step 7 — 偏离记录

实施过程中发现 PLAN.md 决策需要修改，必须同时：

1. 在代码里写正确版本。
2. 在 PLAN.md `## 8. 实施偏离记录` 章节追加：

   ```text
   - <ISO 时间戳> · <章节> · <原决策> → <新决策> · 原因：<一句话>
   ```

3. 在最终回复里粘出追加内容。

### Step 8 — 处理 plan 阶段盲区

PLAN.md `## 9. 盲区与待补调` 若有 `TOO_LARGE_SKIPPED` 节点：

- apply 阶段动手前补调 `get_design_context`。
- 新信息追加到 PLAN.md `## 3. CSS 变量映射表` 与 `## 9. 盲区与待补调`。

### Step 9 — 收尾验证

按顺序执行：

```bash
pnpm figma:report --command=apply --plan=<PLAN.md 路径> --target-dir=<PLAN.md 同目录>
pnpm typecheck
pnpm format:check
pnpm lint
```

如果 `format:check` 失败，运行：

```bash
pnpm format
pnpm format:check
```

再重新跑必要验证。

### Step 10 — 提交建议

不直接 commit；最终回复给出建议命令：

```bash
git add <changed-files> <PLAN.md> <正式 CSS 文件>
git commit -m "feat(<page>): implement figma plan"
```

## 输出契约

AI 最终回复必须包含：

1. frontmatter 锚点校验结果。
2. 实施文件清单。
3. CSS 草案迁移结果。
4. 偏离记录。
5. session 报告内容。
6. typecheck / format:check / lint 结果。
7. 建议 commit 命令。

## 失败处理

- CSS 草案缺失 → 中断。
- CSS 草案含 Panda 相关内容 → 中断。
- frontmatter 锚点失配且用户未明确确认继续 → 中断。
- 出现 PLAN.md 未覆盖的样式 / 组件 → 追加偏离记录。
- pre-commit 失败 → 修复后重新尝试，禁止 `--no-verify`。
