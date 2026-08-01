---
name: backend
description: 面向任意后端语言和框架的研发执行工作流。用户显式输入 `$backend api-tech`、`$backend integration-test generate [scope]`、`$backend integration-test run [scope]`，或要编写后端技术方案、接口与数据模型设计、为缺少测试的已实现接口生成测试、运行指定接口/包/测试、根据代码变更识别接口测试范围并输出正式报告时使用；不虚构尚未建设的后端代码生成和交付 Review 能力。
---

# 后端研发工作流

## 对齐边诊断

| 项 | 值 |
|---|---|
| 服务对齐边 | PM↔后端、后端↔前端 |
| 现状分级 | 弱兜底 |
| AI 形态 | 少做 |
| 主战场 | 技术评审前 |

## 这个 skill 解决什么问题

基于需求、接口和仓库事实生成可审核的后端技术方案，并在接口实现存在后按项目真实语言、框架和测试运行器生成或执行接口测试，说明测试层级、验证边界和正式结果。

## 前置产物

| 产物 | 来源 | 是否必需 |
|---|---|---|
| PRD / 需求说明 | 用户或共享文档读取工具 | `api-tech` 必需 |
| 后端仓库与现有接口事实 | 当前工作区 | `integration-test` 必需；`api-tech` 推荐 |
| PRD Review 报告 | 独立 Review 流程 | `api-tech` 的 L3 必需，L2 推荐 |
| 已有接口测试 | 当前工作区 | `run` 必需；`generate` 可缺失 |
| Git 变更与比较基准 | 当前工作区 / 分支 | integration-test 自动识别范围时必需 |
| 测试环境与项目测试命令 | 仓库配置 / 用户说明 | `integration-test` 必需 |

## 输出产物

| 产物 | 位置 | 下游消费者 |
|---|---|---|
| `api-tech.md` | 用户确认的项目文档目录 | 后端技术评审 / 人工实现 |
| 项目原生接口测试代码（仅 `generate`） | 后端仓库内与语言、框架和既有测试惯例一致的位置 | `$backend integration-test run` / Code Review |
| `backend-integration-test-report.md` | 用户确认的项目文档目录 | 开发者自查 / Code Review / 提测审核 |
| 阶段与缺口说明 | 对话或评审记录 | 开发者 / 后续研发阶段 |

## 下一步

- `api-tech.md` 审核完成 → 由人工进行后端实现；当前 skill 不生成 controller / service / dto / entity。
- 后端实现存在且需要补测试 → `$backend integration-test generate [scope]`。
- 已有接口测试需要执行 → `$backend integration-test run [scope]`。
- 测试失败 → 在报告中标记“待转遗留问题”，修复后重新运行确认范围。

## 明确不做

- 不生成后端业务代码：`backend-build` 尚未建设，不能用方案生成冒充可运行实现。
- 不把接口测试等同于交付 Review：当前没有完整的后端交付 Review 标准。
- 不修改 Apifox 或既有 API 契约：技术方案只补语义和风险，不擅自改变契约事实。
- 不执行单元测试覆盖率统计或管理 Postman/Apipost 截图：这些不是接口集成测试报告的自动产物。
- 不在 `run` 中自动写测试，也不在 `generate` 中修改生产代码：写入和执行范围分别遵守人工确认门禁。

---

## 当前流程

| 阶段 | 状态 | 入口或产物 |
|---|---|---|
| 后端技术方案 | 已实现 | `$backend api-tech` → `api-tech.md` |
| 后端代码落地 | 未实现 | 由人工编码，不提供伪入口 |
| 接口集成测试 | 已实现 | `$backend integration-test generate/run` → 测试代码和正式报告 |
| 后端交付 Review | 未实现 | 只记录缺口，不推定测试通过即完成交付 |

本文件只维护阶段、命令路由和规则索引。进入 `api-tech` 或 `integration-test` 后只加载对应 reference，不在入口重复详细执行规则。

L3 的 PRD Review 存在阻塞项时不得生成 `api-tech.md`；严重项必须原样进入风险与待确认项。

## 命令路由

### `$backend api-tech`

用途：生成后端技术方案文档，包括核心流程、数据模型、接口设计、边界异常、风险和待确认项。

必须读取：

- [references/api-tech.md](./references/api-tech.md)
- [references/mermaid.md](./references/mermaid.md)
- [templates/api-tech.md](./templates/api-tech.md)

生成后使用 [scripts/check_api_tech_doc.mjs](./scripts/check_api_tech_doc.mjs) 做文档静态检查。

### `$backend integration-test run [scope]`

用途：解析接口集成测试范围，执行经过授权的已有测试，并生成 `backend-integration-test-report.md`。

必须读取：

- [references/integration-test.md](./references/integration-test.md)
- [references/integration-test-stack.md](./references/integration-test-stack.md)
- [references/integration-test-run.md](./references/integration-test-run.md)
- [templates/backend-integration-test-report.md](./templates/backend-integration-test-report.md)

目标接口没有可执行测试时，列出缺口并建议 `generate` 后停止；`run` 不得创建或修改测试代码。

### `$backend integration-test generate [scope]`

用途：根据真实接口、项目约定和明确契约生成或补充接口层测试，运行确认范围内的最小验证，并生成正式报告。

必须读取：

- [references/integration-test.md](./references/integration-test.md)
- [references/integration-test-stack.md](./references/integration-test-stack.md)
- [references/integration-test-generate.md](./references/integration-test-generate.md)
- [references/integration-test-run.md](./references/integration-test-run.md)
- [templates/backend-integration-test-report.md](./templates/backend-integration-test-report.md)

即使 scope 明确，也必须先展示拟新增或修改的测试文件、用例、fake/fixture、断言依据、验证命令和报告路径，等待用户明确确认后才能写入。

### 其他阶段请求

- 用户要求后端代码生成：说明 `backend-build` 未实现，不临时生成框架。
- 用户要求后端交付 Review：说明当前缺少统一标准，与用户讨论是否新增独立能力，不用接口测试报告替代。
