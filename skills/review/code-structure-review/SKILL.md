---
name: code-structure-review
description: 基于 Graphify 的函数、类、文件和依赖图发现疑似冗余代码、重复职责、过度封装、高耦合节点、循环依赖与模块边界泄漏，再定点读取源码进行语义复核。适用于大型仓库、跨目录结构 Review、重构前候选发现，以及普通逐文件扫描容易漏检的场景。
---

# 代码结构 Review

## 这个 skill 解决什么问题

普通 Code Review 容易受上下文窗口和文件读取顺序影响，无法稳定建立仓库级调用关系。本 skill 使用 Graphify 的结构化提取结果执行确定性图分析，先收敛候选项，再读取候选源码判断是否确实需要重构。

Graphify 只负责提供结构证据，不作为最终结论。任何“建议抽象、合并、拆分或移除”的结论都必须经过源码复核。

## 什么时候用

- 用户显式输入 `$code-structure-review start <scope>`
- 用户显式输入 `$code-structure-review review <n>`
- 用户显式输入 `$code-structure-review finalize`
- 用户要求跨目录发现冗余函数、重复职责、可抽象代码或架构耦合
- 重构前希望生成带证据的候选清单

## 前置产物

| 产物 | 来源 | 是否必需 |
|---|---|---|
| 待检查代码 | 用户声明的目录、文件或仓库 | 必需 |
| `.graphify_extract.json` 或 `graph.json` | Graphify | 必需，优先使用前者 |
| Git 历史 | 当前仓库 | 可选，第一版不自动分析 |

## 输出产物

| 产物 | 位置 | 用途 |
|---|---|---|
| `structure-analysis.json` | 用户确认的工作目录 | 确定性图检测结果 |
| `plan.md` | 用户确认的工作目录 | Review 批次与候选分组 |
| `review-<n>.md` | 用户确认的工作目录 | 源码复核中间记录 |
| `code-structure-review-report.md` | 用户确认的工作目录 | 最终结构 Review 报告 |

## 明确不做

- 不把图相似度直接解释为应当抽象。
- 不自动修改、删除或重构业务代码。
- 不自动安装 Graphify，不修改 `AGENTS.md`，不安装 hook。
- 不把 ESLint、TypeScript、格式化工具覆盖的机械问题写入报告。
- 不检查产品字段和交互规范；该职责属于 `$frontend-code-review`。
- 不把动态调用未被 Graphify 识别等同于代码未使用。
- 第一版不做 AST 子树克隆检测和 Git 共同变更分析。

---

## 命令路由

### `$code-structure-review start <scope>`

用途：确认范围和工作目录，读取已有 Graphify 产物，运行确定性分析器并生成 Review 计划。

进入命令后完整读取 [references/review-flow.md](./references/review-flow.md) 的 start 阶段与 [references/detector-rules.md](./references/detector-rules.md)。

必须先向用户说明：

1. 将读取的代码范围
2. 将读取的 Graphify 文件
3. 将创建的工作目录和文件
4. 将运行的命令

得到用户确认后才能创建文件或执行产生文件的命令。

开始扫描前必须确认 Graphify CLI 已安装：

```bash
command -v graphify
graphify --version
```

未安装时停止流程，并提示用户执行：

```bash
uv tool install graphifyy
graphify install --platform codex
```

不得代替用户执行安装。用户完成安装并确认后，重新检查版本再继续。

### `$code-structure-review review <n>`

用途：读取第 n 批候选相关源码，对图结构候选进行语义复核。

进入命令后读取 [references/review-flow.md](./references/review-flow.md) 的 review 阶段和 `plan.md` 中对应批次。只读取该批候选所需源码及必要的一跳调用方、被调用方，不扩散扫描整个仓库。

### `$code-structure-review finalize`

用途：合并全部源码复核记录，生成最终报告。

进入命令后读取 [references/review-flow.md](./references/review-flow.md) 的 finalize 阶段和 [templates/code-structure-review-report.md](./templates/code-structure-review-report.md)。

## 通用原则

- 使用中文输出。
- 图分析结果统一称为“候选项”，源码复核后才能称为“问题”。
- 每条最终问题必须同时包含图结构证据和源码证据。
- 对疑似无用代码，必须检查导出、路由、框架注册、动态导入、反射、模板引用和测试引用。
- 对疑似重复职责，必须比较业务语义、变化原因、参数、返回值、副作用和错误处理。
- 对疑似过度封装，鉴权、日志、埋点、缓存、参数归一化、协议适配和错误转换都属于有效职责。
- 对社区边界问题，必须先确认 Graphify 社区是否对应真实模块边界。
- 证据不足时输出“证据不足”或“建议保留现状”，不得为了形成问题而强行给出重构建议。
- 每条建议只描述改动方向，不直接生成完整重构代码。

## 输入约束

- scope 必须由用户明确声明。
- 优先使用 `graphify-out/.graphify_extract.json`，因为它保留原始有向边和关系类型。
- 仅存在 `graphify-out/graph.json` 时允许继续，但报告必须注明可能存在关系折叠。
- Graphify CLI 未安装时停止分析，提供安装命令并等待用户处理。
- Graphify CLI 已安装但两个图文件均不存在时，展示图谱生成命令，得到确认后再执行。
- Graphify CLI 和图文件都存在时直接进入确定性分析，不重复生成图谱。
- 如果用户允许生成图谱，优先执行纯代码、无可视化的扫描，并在执行前展示实际命令。

## 交付约束

- 工作目录默认建议 `.review/code-structure/<yyyy-mm-dd>/`，但必须由用户确认。
- 已有同名文件时不覆盖，除非用户明确允许。
- 最终报告必须保留检查范围、图谱健康、候选统计、确认问题、建议保留现状、证据不足和检测限制七个板块。
- 严重度只用 🔴 阻塞、🟡 建议、🟢 提示，不使用 P0、P1、P2。
