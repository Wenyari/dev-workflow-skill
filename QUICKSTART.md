# 快速开始

六条最高频路径。每条附完整命令序列和产物链。

不确定属于哪条 → 查 [DECISION_TREE.md](./DECISION_TREE.md)。

通过 `npx @dev-workflow/skill` 安装时，使用方向键切换目标和冲突策略，按 `Enter` 确认。

---

## 路径 1：我要写页面开发方案（前端）

```text
$frontend page-tech <PRD 路径或飞书链接>  # 读取上下文并生成 page-tech.md
# → 人工审核 page-tech.md
$frontend page-build                   # 契约检查 → 确认 → 基建 → 验证 → Foundation Review
```

**产物链**：`page-tech.md` → `contract-report.md` → 页面基建代码 → `foundation-summary.md`

**下一步**：视觉还原走 `figmaSync plan <figma-url>`。

---

## 路径 2：我要还原 Figma 设计稿

前提：页面基建已就绪（`foundation-summary.md` 已存在）。

```
figmaSync prepare                     # 第一次使用必跑
figmaSync plan <figma-url>            # 输出 PLAN.md + figma-plan.css 草案
# → 人工审核 PLAN.md
figmaSync apply                       # 落地页面 CSS
```

**产物链**：`PLAN.md` + `figma-plan.css` → 页面 CSS / 组件代码

---

## 路径 3：我要检查 PRD 与 UI

```text
$prd-ui-check <PRD 本地路径或飞书读取结果>
# → Agent 整理页面与待对照需求点
# → 人工选择页面并逐步提供 Figma 节点
# → 每轮确认节点语义，页面节点提供完成后检查差异
# → 全部页面完成后生成 prd-ui-check-report.md
```

**产物链**：PRD + 人工指定的 Figma 节点 → `prd-ui-check-report.md`

---

## 路径 4：我要写后端技术方案

```text
$backend api-tech <PRD 路径或飞书链接>  # 读取上下文并生成 api-tech.md
# → 提交后端技术评审
# → 如需飞书交付，明确提出发布请求
```

**产物链**：`api-tech.md` → 飞书 Wiki 文档

---

## 路径 5：我要检查冗余、抽象机会和结构耦合

前提：本机已安装 Graphify。仓库没有图文件时，流程会先展示生成命令和写入目录，得到人工确认后再生成。

```text
$code-structure-review start <scope>  # 生成图分析结果和源码复核计划
$code-structure-review review 1       # 按批定点读取候选源码
# → 继续 review 2 ... review N
$code-structure-review finalize       # 输出最终结构 Review 报告
```

**产物链**：Graphify 图数据 → `structure-analysis.json` → 批次复核记录 → `code-structure-review-report.md`

该流程不会自动安装 Graphify，也不会自动修改业务代码。

---

## 路径 6：我要生成或执行后端接口集成测试

已有接口测试时：

```text
$backend integration-test run <interface / package / test>
# 未指定 scope 时，先展示候选测试并等待人工确认
```

接口测试缺失或不完整时：

```text
$backend integration-test generate <interface / package>
# → 确认拟新增或修改的测试文件、接口用例、fake / fixture 和验证命令
# → 生成测试、运行最小验证、输出正式报告
```

**产物链**：接口实现 / 代码变更 → `*_test.go` → `backend-integration-test-report.md`

`run` 不会自动写测试；`generate` 也会先展示计划，得到人工确认后才修改文件。

---

## 首次使用前

前端、后端或 PRD Review 需要读取和发布飞书文档时，按共享飞书能力提示配置：

```text
LARK_APP_ID
LARK_APP_SECRET
```
