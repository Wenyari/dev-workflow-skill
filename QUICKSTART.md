# 快速开始

四条最高频路径。每条附完整命令序列和产物链。

不确定属于哪条 → 查 [DECISION_TREE.md](./DECISION_TREE.md)。

---

## 路径 1：我要写页面开发方案（前端）

```
$devFlow lark-read <PRD 飞书链接>    # 读 PRD 作为上下文
$devFlow page-tech                    # 生成 page-tech.md
# → 人工审核 page-tech.md
$devFlow contract-check               # 生成 contract-report.md
# → 人工审核，通过后
$devFlow page-build                   # 落地页面基建
$devFlow foundation-freeze            # 生成 foundation-summary.md
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

```
$devFlow lark-read <PRD 飞书链接>    # 读 PRD 作为上下文
$devFlow api-tech                     # 生成 api-tech.md
# → 提交后端技术评审
$devFlow lark-doc                     # 发布到飞书 Wiki
```

**产物链**：`api-tech.md` → 飞书 Wiki 文档

---

## 首次使用前

配置飞书环境变量：

```
$devFlow prepare
```

按提示设置 `LARK_APP_ID` / `LARK_APP_SECRET` 等。
