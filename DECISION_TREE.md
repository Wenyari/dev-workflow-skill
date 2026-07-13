# 决策树

不知道用哪个 skill 时，从这里开始。

---

## 我想做什么？

### 我要写文档 / 方案

- 写**前端页面开发方案** → `$devFlow page-tech`
- 写**后端接口 / 数据方案** → `$devFlow api-tech`
- 检查已有方案能不能落地 → `$devFlow contract-check`

### 我要写代码

- 根据已审方案**创建页面基建** → `$devFlow page-build`
- 还原 **Figma 视觉稿** → `figmaSync plan` → `figmaSync apply`
- 生成 **API 骨架代码** → ❌ 目前不支持，`api-tech` 只出方案

### 我要检查一致性

- 检查 **PRD 和 UI 稿语义是否一致** → `$prd-ui-check <prd>`（用户逐页提供 Figma 节点）
- 检查 **PRD 缺失态 / 边界值 / 权限** → `risk-scanner`（需求评审用）
- 检查 **PRD 和 API 语义对齐** → `contract-aligner`（技术评审用）

### 我要处理飞书

- 读飞书 PRD 作为上下文 → `$devFlow lark-read <url>`
- 把文档发到飞书 Wiki → `$devFlow lark-doc`
- 配置飞书环境变量 → `$devFlow prepare`

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

### `contract-check` 是必需的吗？

- L2/L3 需求：**必需**。跳过会导致 `page-build` 直接生成错误骨架
- L0/L1 需求：可跳过

### 后端 skill 为什么只有 `api-tech`，没有 `api-build`？

因为后端↔前端边已经健康（Apifox 兜底契约验证），方法论明确说健康的边不叠 AI。`api-build`目前无 ROI，不做。

---

## 找不到匹配的 skill？

说明该能力尚未定义。选择：

1. 看是否属于**方法论明确排除的问题**（姿态问题 / PRD 隐含约定 / 上线阶段）→ 承认边界，不硬撑
2. 属于**评审 / 开发 / 产物三层**中的新能力 → 按 [CONTRIBUTING.md](./CONTRIBUTING.md) 提议新建 skill
3. 属于**多 skill 共享能力**（如新增第三方 API 集成）→ 抽为 tools/ 下的工具
