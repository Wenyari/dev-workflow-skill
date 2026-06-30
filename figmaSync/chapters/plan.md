# `figmaSync plan <figma-url>`

输入 Figma URL（含 `node-id`），输出可审核的落地计划：

- `PLAN.md`
- `figma-plan.css`
- `figma-snapshot.png`
- `session-report-plan.md`

`plan` 阶段允许创建审核文档和 CSS 草案，但不接入业务代码。

## 代码事实优先原则

`figmaSync plan` 必须以真实代码文件为事实来源，不能根据 Figma 图层或
`page-tech.md` 重新拆业务结构。

必须读取：

- route 文件。
- 页面局部 components。
- service 文件和函数签名。
- types 定义。
- constants 定义。
- 最新 `foundation-summary.md`，或重新扫描生成。

允许修改范围：

- 布局。
- CSS。
- Apex UI 组件选型和 props。
- 局部展示结构。
- PLAN.md、figma-plan.css、figma-snapshot.png、session report。

禁止修改范围：

- 路由路径。
- service 契约。
- API 请求基础封装。
- 类型语义。
- 页面核心状态模型。
- 业务组件边界。
- 权限逻辑。
- Wujie bridge。
- `src/routeTree.gen.ts`。

## 执行步骤

### Step 1 — Session 边界

```bash
pnpm figma:report --reset
```

清空 `.session-log.jsonl`，避免上一轮命中数据污染本次报告。

### Step 2 — 扫描项目目录和目标基建

禁止 AI 自行猜测目录约定。先做：

```bash
ls src/
ls src/routes 2>/dev/null || ls src/pages 2>/dev/null
find src/common -maxdepth 3 -type f 2>/dev/null
```

根据扫描结果给出只列实际存在的目录作为路径候选，并提示当前路由约定：

| 路由库                       | 推荐 targetFile 文件名           |
| ---------------------------- | -------------------------------- |
| TanStack Router (file-based) | `src/routes/<feature>/route.tsx` |
| Next.js App Router           | `app/<feature>/page.tsx`         |
| React Router                 | `src/pages/<feature>/index.tsx`  |

如果用户指定目标页面目录，必须读取：

```bash
find <target-route-dir> -maxdepth 4 -type f
sed -n '1,220p' <target-route-dir>/route.tsx
sed -n '1,220p' <target-route-dir>/types.ts 2>/dev/null
sed -n '1,220p' <target-route-dir>/constants.ts 2>/dev/null
```

如果存在 service 文件，必须读取 service 签名；如果存在
`foundation-summary.md`，必须读取它并说明其是否最新。

如果缺少 `foundation-summary.md`，优先运行：

```bash
node .agent/skills/devFlow/scripts/generate_foundation_summary.mjs --route-dir <target-route-dir> --service <service-file>
```

如果无法确定 service 文件，可以先生成 route 目录快照，并把 service 缺口写入 PLAN.md 待确认项。

### Step 3 — 询问用户存放位置

把 Step 2 的候选列出，问用户：

> 项目当前是 [TanStack Router]。PLAN.md 与 figma-plan.css 落地路径候选：①
> `src/routes/<feature>/PLAN.md` ② `src/features/<feature>/PLAN.md` ③ 自定义

拿到路径后确认：

- 路径目录是否存在？不存在则提示是否创建。
- 路径已有 PLAN.md 或 figma-plan.css？需要确认是覆盖还是放弃。

### Step 4 — Figma MCP 试探

```
mcp__figma-remote-mcp__whoami
```

失败则中断，提示用户登录 Figma MCP。

### Step 5 — 解析 Figma 节点

按顺序调用：

1. `get_metadata`：拿节点层级树骨架。
2. `get_screenshot`：保存为 `figma-snapshot.png` 到 PLAN.md 同目录。
3. `get_variable_defs`：拿设计稿 variables 字典。
4. `get_design_context`：拿节点参考代码和样式信息。

若 `get_design_context` 返回 too-large：

- 从 metadata 中挑选语义节点递归抓取。
- 递归深度最多 2 层。
- 未抓到的节点写入 PLAN.md `## 9. 盲区与待补调`。

### Step 6 — Icon / assets 扫描

运行：

```bash
node .agent/skills/figmaSync/scripts/icon-inventory.mjs --pretty
```

扫描范围只允许来自真实存在的目录：

- `assets/`
- `icons/`
- `public/`
- `src/**/assets/`
- `src/**/icons/`

从 Figma metadata / design_context 中提取 icon 需求，并在 PLAN.md 输出：

- 可使用 icon：Figma 节点、nodeId、语义、匹配仓库 icon、匹配依据。
- 缺少 icon：Figma 节点、nodeId、语义、缺失原因、建议用户提供的导入方案。

若存在缺少 icon，plan 阶段必须暂停并请用户确认处理方式。未确认时
`figma:verify-plan` 应失败。

### Step 7 — Apex UI 与 common component 复用

优先阅读：

- `node_modules/@frontend/apex-ui--react/dist/llms.txt`
- `node_modules/@frontend/apex-ui--react/dist/llm/<component>.txt`
- `src/common/**`
- 目标业务目录附近已有组件

PLAN.md `## 2. 组件映射决策` 必须说明：

- Figma 节点。
- 目标实现。
- 是否使用 Apex UI。
- 是否使用 common component。
- 是否需要自定义 CSS。
- 样式归属：`Apex UI props`、`业务组件 CSS`、`页面 CSS`、`待确认`。
- 不复用的原因。

#### Step 7.5 — 样式归属判定

在进入 CSS 变量匹配和 `figma-plan.css` 生成前，必须逐个节点判断样式归属。

判定顺序：

1. **Apex UI 组件自管样式**
   - 已映射到 Apex UI 组件，且 Figma 样式可以由组件 props 或内置状态表达。
   - 写入 PLAN.md 组件映射，不写入 `figma-plan.css`。
   - 示例：`Button type="primary"` 控制主按钮颜色；`Tag color="error"`
     控制错误标签颜色； `Tabs type="capsule"`
     控制胶囊页签；`Input status="error"` 控制输入框错误态；
     `Table size="large"` 控制行高。
2. **业务组件自管样式**
   - 目标实现是已有业务组件，样式来自业务状态映射或业务私有 class。
   - 可进入 `figma-plan.css`，但只能写业务组件私有 class。
   - 若业务组件内部使用 Apex UI 组件，组件状态色、尺寸、圆角仍必须交给 Apex UI
     props。
3. **页面布局样式**
   - 页面级容器、grid、flex、gap、padding、position、overflow、responsive、局部尺寸约束。
   - 可进入 `figma-plan.css`，使用 `/theme` variables。
4. **待确认样式**
   - 无法判断归属，或既不是 Apex UI props 又不确定是否应该新增业务样式。
   - 写入 PLAN.md 待确认；CSS 草案只写 TODO 注释。

禁止行为：

- 不得把 Apex UI 组件实例中的 `fill`、`stroke`、`text color`、`radius`、`font`
  直接复制到 `figma-plan.css`。
- 不得为 Apex
  UI 状态色写页面 CSS 覆盖，例如主按钮、错误标签、选中页签、输入框错误态。
- 不得因为 Figma component token 名称和 `/theme`
  能匹配，就把组件内部样式转成业务 CSS。

PLAN.md 的 `## 2. 组件映射决策` 必须体现最终归属；`## 5. CSS 草案审核`
必须说明 CSS 草案是否剔除了 Apex UI 自管样式。

### Step 8 — 组件/模块拆分规划

对于复杂的 Figma 设计稿，直接落地在一个文件中维护困难，必须在 plan 阶段明确**组件与样式的拆分计划**。此时需分两种情况处理：

1. **已有基建文件**：扫描目标目录及周边，如果发现已存在的组件拆分结构（如
   `List`、`Header`、`ItemCard`
   等），则分析 Figma 节点并将其映射到现有的拆分边界上。计划中说明复用哪些已有的组件骨架，以及对应 CSS 的存放位置。不能因为 Figma 图层结构改变业务组件边界。
2. **无基建文件**：如果是一个全新的复杂页面，必须提示用户先执行
   `$devFlow page-build`。只有 Human 明确确认允许轻量 plan 时，才能基于设计稿提出临时视觉拆分；该拆分只能作为待确认建议，不能直接作为业务骨架事实。

在 PLAN.md `## 3. 组件与模块拆分规划` 必须详细列出：

- 采用哪种拆分策略（基于基建 / 自行拆分）。
- 每个拆分出的子模块/组件所对应的文件路径及 CSS 拆分安排。
- 现有基建事实来源：route、components、service、types、constants 或
  `foundation-summary.md`。
- figmaSync 允许修改和禁止修改的范围。

### Step 9 — CSS 变量匹配

对每个出现的样式值，按以下顺序处理：

| 来源                                           | 路径                              | PLAN.md 命中方式           |
| ---------------------------------------------- | --------------------------------- | -------------------------- |
| `get_variable_defs` 字典直接命中               | 记录 `cssVariable` 与 `themePath` | `Fast Path 0 (variables)`  |
| 节点 CSS 含 `var(--xxx)` 但 variables 字典没给 | 跑 `lookup-var.mjs`               | `Fast Path 1 (lookup-var)` |
| 设计师写死裸 `#hex` / `Npx`                    | 跑 `match-token.mjs`              | `Slow Path (value-match)`  |
| 未命中                                         | 写入 CSS 草案 TODO 注释和确认清单 | `未命中`                   |

仅对归属为 `业务组件 CSS` 或 `页面 CSS` 的样式执行本步骤。归属为 `Apex UI props`
的样式不进入变量匹配表的 CSS 草案实现清单；如需记录来源，只在 PLAN.md 组件映射备注中说明由哪个 prop 接管。

PLAN.md `## 3. CSS 变量映射表` 必须记录：

- 来源（Figma）
- 类型
- CSS variable
- `/theme` 路径
- 原始值
- 命中方式
- nodeId
- designContextStatus

designContextStatus 取值约定：

- `OK` — `get_design_context` 成功返回。
- `RECURSED` — 因 too-large 递归到子节点拿到的。
- `TOO_LARGE_SKIPPED` — 递归 2 层仍 too-large，apply 阶段必须补调。

### Step 10 — 生成 `figma-plan.css`

在 PLAN.md 同目录生成 `figma-plan.css`。

要求：

- 只作为审核草案，不在 plan 阶段接入业务代码。对于拆分了多个组件的情况，可在草案中利用注释（如
  `/* --- Header Component --- */`）对不同模块的 CSS 做出逻辑上的隔离，方便 apply 阶段拆分到不同文件。
- class 使用 kebab-case。
- Apex UI props 能处理的样式不写 CSS 覆盖。
- 只写归属为 `业务组件 CSS` 或 `页面 CSS` 的样式。
- Apex
  UI 组件自管色值、边框、圆角、字号、hover/active/disabled/selected 状态不得写入 CSS 草案。
- 命中变量时使用 `var(--xxx)`。
- 未命中变量时写 TODO 注释。

示例：

```css
.client-page {
  min-height: 100%;
  background: var(--fill-neutral-primary);
}

.client-page__toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-12);
}

/* TODO(figmaSync): unmatched border color #d7d9df from node 10:18; needs user confirmation */
```

### Step 11 — 计算 frontmatter 锚点

```bash
# figmaMetadataHash
node -e "import('node:crypto').then(c => process.stdin.on('data', d => console.log(c.createHash('sha256').update(d).digest('hex'))))" < /tmp/figma-metadata.json

# themeHash
shasum -a 256 theme/dark/primitives.css theme/dark/aliases.css

# cssDraftHash
shasum -a 256 <PLAN.md 同目录>/figma-plan.css

# apexUiVersion
node -p "require('@frontend/apex-ui--react/package.json').version"
```

填入 frontmatter：

```yaml
figmaMetadataHash: <get_metadata JSON 的 sha256>
figmaSnapshotPath: ./figma-snapshot.png
apexUiVersion: <版本号>
themeHash: <theme/dark CSS 的 sha256 摘要>
cssDraftPath: ./figma-plan.css
cssDraftHash: <figma-plan.css sha256>
plannedAt: <ISO 时间戳>
```

### Step 12 — 按模板落盘 PLAN.md

按 `templates/PLAN.md.tpl` 填充模板，写到 Step 3 用户指定的路径。

禁止删改模板里的章节标题，`verify-plan` 与 `figma:report` 依赖标题定位。

### Step 13 — 反向校验

落盘 PLAN.md 和 figma-plan.css 后立即跑：

```bash
pnpm figma:verify-plan <path/to/PLAN.md>
```

FAIL 必须修正后再继续。

常见 fail：

- `## 4. CSS 变量映射表` 里的 CSS variable 不在 `/theme`。
- `figma-plan.css` 不存在。
- `figma-plan.css` 出现 Panda 相关内容。
- 缺失 icon 未确认。
- Apex UI prop 不存在。

### Step 14 — 生成 session 报告

```bash
pnpm figma:report \
  --command=plan \
  --plan=<PLAN.md 路径> \
  --target-dir=<PLAN.md 所在目录>
```

最终回复必须包含：

1. PLAN.md 路径。
2. figma-plan.css 路径。
3. verify-plan 结果。
4. session-report-plan.md 摘要。
5. 读取到的基建事实和 foundation-summary 状态。
6. 未命中变量、缺失 icon、待用户确认事项。
