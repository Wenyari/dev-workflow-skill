# ADR-0001：按前后端领域拆分 execution

- 状态：Accepted
- 日期：2026-07-27

## 背景

`devFlow` 同时承载 PRD Review、前端技术方案、页面基建、后端技术方案和飞书共享能力。入口文件需要加载多个领域的判定、验证、脚本和图表规则，既增加上下文负担，也与 `execution`、`review` 导航形成重复职责。

后端接口集成测试已经形成独立规则，但它仍属于后端实现后的研发阶段。继续把前后端能力集中在 `devFlow`，或把后端测试留在 backend 之外，都会让领域边界和阶段授权不清晰。

## 决策

1. `skills/execution/SKILL.md` 只判断 frontend / backend 和当前研发阶段。
2. 新建 `skills/execution/frontend/`，维护前端技术方案和页面基建工作流。
3. 新建 `skills/execution/backend/`，维护后端技术方案和接口集成测试阶段；未实现的代码落地、交付 Review 必须明确标记。
4. 将 `prd-review` 移至 `skills/review/prd-review/`。
5. `contract-check` 作为 `page-build` 写入前门禁，`foundation-freeze` 演进为 `page-build` 的 Foundation Review 收尾阶段。
6. 飞书读取、发布和准备规则保留在 `tools/lark/`，不再作为新工作流的领域子命令。
7. `devFlow` 保留至少一个版本，作为旧命令兼容导航，不再接收新业务规则；未实际推广的 `backend-integration-test` 不保留兼容入口。
8. skill 之间只通过 `page-tech.md`、`api-tech.md`、代码、`foundation-summary.md` 和测试报告等产物交接，不由一个业务 skill 直接执行另一个业务 skill。

## 结果

正向影响：

- 前端和后端入口只加载本领域阶段与索引。
- 页面基建的检查、写入、验证和 Review 形成清晰授权链。
- 后端技术方案和接口集成测试使用同一个领域入口，但仍按阶段按需加载规则。
- PRD Review 回到 review 层，飞书能力回到共享 tools。
- 旧命令仍然可用，迁移不立即破坏现有文档。

代价：

- 需要维护一个版本的 `devFlow` 兼容映射。
- 移动后的 reference、template 和 script 路径必须同步更新。
- 后端工作流会显式暴露 `backend-build` 与 delivery review 的能力缺口。

## 未选择方案

- 保持单一 `devFlow`：继续产生跨领域上下文和授权耦合。
- 将每个阶段都做成独立 skill：会把连续的页面基建落地流程拆得过碎。
- 立即删除旧命令：会破坏现有仓库和文档中的调用方式。

## 后续

- 发布后观察一个版本的旧命令使用情况。
- 移除兼容入口前更新 `CHANGELOG.md` 并提供明确迁移说明。
- 后端代码落地和交付 Review 需单独完成方法论与 ROI 评估后才能新增。
