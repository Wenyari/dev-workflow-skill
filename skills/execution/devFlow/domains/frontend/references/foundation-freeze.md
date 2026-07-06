# foundation-freeze 子命令

`foundation-freeze` 用于在 `page-build` 之后、`figmaSync plan`
之前生成页面基建事实快照。它帮助 Human 和 Agent 明确当前代码事实，以及视觉阶段允许和禁止修改的范围。

## 定位

- 输入：目标页面目录、相关 service 文件、可选 `contract-report.md`。
- 输出：`foundation-summary.md`。
- 性质：机器生成快照，不是事实本身。
- 最终事实：真实代码文件。

## 生成规则

默认使用脚本：

```bash
node .agent/skills/devFlow/domains/frontend/scripts/generate_foundation_summary.mjs --route-dir src/routes/<feature>/<page>
```

可选指定 service：

```bash
node .agent/skills/devFlow/domains/frontend/scripts/generate_foundation_summary.mjs \
  --route-dir src/routes/<feature>/<page> \
  --service src/services/<feature>/<page>.ts
```

规则：

- `foundation-summary.md` 禁止人工编辑。
- 每次 `figmaSync plan` 前必须重新生成或重新扫描。
- 如果快照和上一次不一致，必须提示 Human 确认影响。
- 快照只能汇总真实代码，不得补造组件、接口、状态或类型。
- 快照不替代源码；与源码冲突时以源码为准。

## 输出位置

默认写入：

```text
src/routes/<feature>/<page>/foundation-summary.md
```

文件顶部必须包含：

```html
<!-- AUTO-GENERATED. Do not edit. Regenerate from source files. -->
```

## 内容要求

必须包含：

- route 文件。
- components 文件。
- service 文件。
- types 文件。
- constants 文件。
- 组件 props。
- service 函数签名。
- types 导出。
- constants 导出。
- figmaSync 允许修改范围。
- figmaSync 禁止修改范围。

## figmaSync 允许修改范围

- 目标页面或目标组件的布局。
- CSS 文件和 className 绑定。
- Apex UI 组件选型和 props。
- 局部展示结构。
- `PLAN.md` 和 `figma-plan.css`。

## figmaSync 禁止修改范围

- 路由路径。
- service 契约。
- API 请求基础封装。
- 类型语义。
- 页面核心状态模型。
- 业务组件边界。
- 权限逻辑。
- Wujie bridge。
- `src/routeTree.gen.ts`。

## 失败处理

- 目标 route 目录不存在：阻塞，先执行 `page-build` 或确认轻量 plan。
- 无法识别 service：允许生成快照，但必须写入待确认。
- 无法解析组件 props：允许生成文件清单，但必须标记解析盲区。
- 发现上次快照变化：列出变化，让 Human 确认后再进入 `figmaSync plan`。
