# `figma-sync prepare`

一键检查 figma-sync 原生 CSS 工作流依赖的技术栈与资源是否齐全。

## 执行步骤

1. 运行检查脚本：

   ```bash
   node "{figma-sync-skill-dir}/scripts/prepare-check.mjs"
   ```

2. 阅读输出的三级清单：

   - ❌ `blocker`：必须修复，否则后续 plan / apply 会失败
   - ⚠️ `warning`：可不立即修，但 figma-sync 体验受影响
   - ℹ️ `info`：诊断信息，无需动作

3. 对每条 blocker / warning，按 `fix → ...`
   提示修复。修复后重跑直至没有 blocker。

4. Figma MCP 可用性脚本无法自动测。AI 在执行 `figma-sync plan` 前必须使用当前环境实际提供的 Figma 身份检查能力（通常名为 `whoami`）试探；不得写死 MCP server 名称。若失败，停止并提示用户登录 Figma MCP。

## 检查范围

- Node 与 pnpm。
- `@frontend/apex-ui--react` 是否安装。
- `theme/dark/primitives.css` 与 `theme/dark/aliases.css` 是否存在。
- Skill 内置的 report、verify-plan、变量匹配和资产扫描脚本是否完整。
- Apex UI llm 文档是否可读。
- `src/common`、`assets`、`public`、`src/**/assets`、`src/**/icons`
  等复用资产目录是否存在。
- session 是否使用系统临时目录并按消费仓库隔离。

## 输出契约

- 全绿或仅 warning：可以开始 plan / apply。
- 有 blocker：AI 必须停止，把 blocker 列表和 fix 提示告知用户，不进入 plan /
  apply。

## 何时跑

- 新项目首次集成 figma-sync 时。
- 新成员 clone 项目后第一次跑 figma-sync 前。
- `/theme`、Apex UI、figma-sync 脚本升级后。
- plan / apply 出现变量匹配或报告异常时。
