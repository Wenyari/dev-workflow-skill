# 决策树

不知道用哪个 skill 时，从这里开始。

---

## 我想做什么？

### 我要写文档 / 方案

- 写**前端页面开发方案** → `$frontend page-tech`
- 写**后端接口 / 数据方案** → `$backend api-tech`
- 只检查前端方案能不能落地 → `$frontend page-build check`

### 我要写代码

- 根据已审方案**创建页面基建** → `$frontend page-build`，内部完成契约检查、确认、验证和 Foundation Review
- 还原 **Figma 视觉稿** → `figmaSync plan` → `figmaSync apply`
- 生成 **API 骨架代码** → ❌ 目前不支持，`api-tech` 只出方案

### 我要执行测试

- 已指定**接口、包、测试文件或测试名称** → `$backend integration-test run <scope>`
- 未指定范围，希望根据**当前代码变更自动识别接口集成测试** → `$backend integration-test run`，确认候选清单后再执行
- 接口缺少 `*_test.go` 或已有场景不完整 → `$backend integration-test generate <scope>`，确认文件与用例计划后生成并验证
- 统计单元测试覆盖率、管理 Postman/Apipost 截图 → ❌ 当前 skill 不负责

### 我要检查一致性

- 检查 **PRD 本身是否完整、能否进入技术方案** → `$prd-review <prd>`
- 检查 **PRD 和 UI 稿语义是否一致** → `$prd-ui-check <prd>`（用户逐页提供 Figma 节点）
- 检查 **前端业务代码是否遵循产品设计规范** → `$frontend-code-review start <scope>` → `batch <n>` → `finalize`
- 检查 **代码冗余、抽象机会、循环依赖和结构耦合** → `$code-structure-review start <scope>` → `review <n>` → `finalize`

### 我要处理飞书

- 读飞书 PRD 作为上下文 → 在前端、后端或 PRD Review 请求中提供链接，由对应 skill 使用 `tools/lark/`
- 把文档发到飞书 Wiki → 明确提出发布请求，由对应 skill 使用共享飞书能力

---

## 常见困惑

### 我有 Figma 链接，该跑 `page-build` 还是 `figmaSync`？

- 如果**页面基建还没搭**（route / components / service 没建）→ 先 `page-build`
- 如果**页面基建已就绪**，只是要还原视觉 → 直接 `figmaSync plan`
- 判断方法：项目里有没有 `foundation-summary.md`？没有 → 先走前一步

### 我该走 `page-tech` 还是直接 `page-build`？

- 需求复杂、涉及多接口、多状态 → 先 `page-tech`（L2/L3 强制）
- 需求简单、就一个入口、一个接口 → 可直接 `page-build`（L0/L1 允许跳过）
- 判断规则见 `HUMAN_AGENT_WORKFLOW.md` 的 L0/L1/L2/L3 分级

### Contract Check 是必需的吗？

- L2/L3 需求：**必需**，由 `$frontend page-build` 自动作为写入前门禁
- L0/L1 需求：按轻量流程执行最小检查，不要求单独生成完整报告

### 后端 skill 为什么没有 `backend-build` / `api-build`？

因为后端↔前端边已经健康（Apifox 兜底契约验证），方法论明确说健康的边不叠 AI。`api-build`目前无 ROI，不做。

---

## 找不到匹配的 skill？

说明该能力尚未定义。选择：

1. 看是否属于**方法论明确排除的问题**（姿态问题 / PRD 隐含约定 / 上线阶段）→ 承认边界，不硬撑
2. 属于**评审 / 开发 / 产物三层**中的新能力 → 按 [CONTRIBUTING.md](./CONTRIBUTING.md) 提议新建 skill
3. 属于**多 skill 共享能力**（如新增第三方 API 集成）→ 抽为 tools/ 下的工具
