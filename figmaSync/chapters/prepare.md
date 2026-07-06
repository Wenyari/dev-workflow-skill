# `figmaSync prepare`

一键检查 figmaSync 原生 CSS 工作流依赖的技术栈与资源是否齐全。

## 执行步骤

1. 运行检查脚本：

   ```bash
   pnpm figma:prepare
   ```

2. 阅读输出的三级清单：

   - ❌ `blocker`：必须修复，否则后续 plan / apply 会失败
   - ⚠️ `warning`：可不立即修，但 figmaSync 体验受影响
   - ℹ️ `info`：诊断信息，无需动作

3. 对每条 blocker / warning，按 `fix → ...`
   提示修复。修复后重跑直至没有 blocker。

4. Figma MCP 可用性脚本无法自动测，AI 在执行 `figmaSync plan` 前必须主动调用官方
   Figma plugin 的 `mcp__codex_apps__figma._whoami` 试探。若工具未出现，停止并提示
   用户在 Codex App 插件面板安装/授权 Figma plugin；若授权失败，提示用户重新登录。

## 检查范围

- Node 与 pnpm。
- `@frontend/apex-ui--react` 是否安装。
- `theme/dark/primitives.css` 与 `theme/dark/aliases.css` 是否存在。
- `pnpm figma:report` 与 `pnpm figma:verify-plan` 是否存在。
- Apex UI llm 文档是否可读。
- `src/common`、`assets`、`public`、`src/**/assets`、`src/**/icons`
  等复用资产目录是否存在。
- `.gitignore` 是否忽略 figmaSync session 文件。

## 输出契约

- 全绿或仅 warning：可以开始 plan / apply。
- 有 blocker：AI 必须停止，把 blocker 列表和 fix 提示告知用户，不进入 plan /
  apply。

## 何时跑

- 新项目首次集成 figmaSync 时。
- 新成员 clone 项目后第一次跑 figmaSync 前。
- `/theme`、Apex UI、figmaSync 脚本升级后。
- plan / apply 出现变量匹配或报告异常时。
