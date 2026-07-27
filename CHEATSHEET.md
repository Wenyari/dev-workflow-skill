# 命令速查表

所有可用命令一览。第一次使用请先看 [QUICKSTART.md](./QUICKSTART.md)。

## frontend · 前端开发流程

| 命令 | 用途 | 前置产物 | 输出产物 |
|---|---|---|---|
| `$frontend page-tech` | 生成页面前端方案，不修改代码 | PRD / 需求 / 接口事实 | `page-tech.md` |
| `$frontend page-build check` | 只检查方案是否具备落地条件 | `page-tech.md` 或可验证上下文 | `contract-report.md` |
| `$frontend page-build` | 契约检查 → 人工确认 → 创建基建 → 最小验证 → Foundation Review | 已确认方案或 L0/L1 最小计划 | 页面代码 + `foundation-summary.md`；L2/L3 含 `contract-report.md` |

## backend · 后端开发流程

| 命令 | 用途 | 前置产物 | 输出产物 |
|---|---|---|---|
| `$backend api-tech` | 生成后端技术方案；不生成后端业务代码 | PRD / 后端仓库 | `api-tech.md` |
| `$backend integration-test run [scope]` | 执行已有接口集成测试；缺省 scope 时先根据代码变更识别并等待确认 | 后端仓库 / 已有测试 | `backend-integration-test-report.md` |
| `$backend integration-test generate [scope]` | 为缺失接口生成或补充测试；写入前确认文件、用例和命令 | 后端接口实现 / 契约 | `*_test.go` + `backend-integration-test-report.md` |

## figmaSync · 开发层

| 命令 | 用途 | 前置产物 | 输出产物 |
|---|---|---|---|
| `figmaSync prepare` | 检查环境 | — | 检查结果 |
| `figmaSync plan <figma-url>` | 生成落地方案 | Figma URL + `foundation-summary.md` | `PLAN.md`, `figma-plan.css` |
| `figmaSync apply` | 实施编码 | 已审 `PLAN.md` | 页面 CSS / 组件代码 |

## 评审层

| 命令 | 用途 | 状态 |
|---|---|---|
| `$prd-review <prd>` | 检查 PRD 缺失、边界、风险和技术冲突 | 可用 |
| `$prd-ui-check <prd>` | 用户逐页提供 Figma 节点，检查 PRD↔UI 语义 | 可用 |
| `$frontend-code-review start <scope>` | 声明范围，扫描代码识别字段类型，生成批次计划 | 可用 |
| `$frontend-code-review batch <n>` | 跑第 n 批规范比对，产出批次中间记录 | 可用 |
| `$frontend-code-review finalize` | 合并批次记录，输出 `code-review-report.md` | 可用 |
| `$code-structure-review start <scope>` | 读取 Graphify 图数据，生成结构候选和批次计划 | 可用 |
| `$code-structure-review review <n>` | 定点读取第 n 批候选源码并复核 | 可用 |
| `$code-structure-review finalize` | 输出冗余、抽象和耦合结构 Review 报告 | 可用 |
