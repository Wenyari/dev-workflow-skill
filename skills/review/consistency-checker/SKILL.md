---
name: consistency-checker
description: PM↔UI 一致性检查器。检查 PRD 全文与 Figma UI 稿之间的一致性，输出结构化差异清单，用于 UI 评审会前 12-24 小时前置发现问题。适用于用户提供 PRD 和 Figma 链接并要求检查一致性、评审前查漏、生成一致性 checklist 时。
---

# 一致性检查器

## 对齐边诊断

| 项 | 值 |
|---|---|
| 服务对齐边 | PM↔UI |
| 现状分级 | 主痛 |
| AI 形态 | 补契约工具 |
| 主战场 | UI 评审前 12-24 小时（次战场：自测联调阶段兜底） |

## 这个 skill 解决什么问题

在 UI 评审会前 12-24 小时前置检查 PRD 与 UI 稿之间的一致性，把「评审过快 + 无 PRD 对照」导致的主痛遗漏，前移到会前发现。

## 什么时候用

- 用户显式输入 `$consistency-checker <prd> <figma-url>`
- 用户话术："帮我检查一下 PRD 和 UI 稿有没有对不上的地方 / UI 评审前查一下 / 生成一致性 checklist"
- 用户提供 PRD 全文 + Figma URL

## 前置产物

| 产物 | 来源 | 是否必需 |
|---|---|---|
| PRD 全文（md / txt / URL） | 人工提供 / lark-read | 必需，**不支持 PDF** |
| Figma URL | 人工提供 | 必需，**强制走 Figma MCP，不降级到 OCR / 截图** |
| 历史校准数据 | `skills/artifact/calibration/` | 可选 |
| 项目业务词表 | `rules/` | 可选 |
| 历史类似需求 checklist | `rules/` | 可选 |

## 输出产物

| 产物 | 位置 | 下游消费者 |
|---|---|---|
| `consistency-report.json` | 项目文档目录 | 人工评审会 / 未闭环清单 |

结构（每条）：

```
id                 · 唯一标识
group              · PRD 未见 / UI 越界 / 状态覆盖 / 语义一致
priority           · P0 / P1 / P2（P0 硬性 ≤ 5 条）
content            · 问题描述（≥30 字）
references         · { PRD 章节引用 · Figma 节点引用 }
suggested_speech   · AI 生成的举手话术
rule_id            · 触发的规则 ID
confidence         · high / medium / low
```

## 下一步

- 输出 P0 项 → UI 评审会当场质询
- 会中未认领的 P0/P1 项 → 写入 `skills/artifact/open-issues/`（未闭环清单）
- 自测阶段发现遗漏 → 反查 `consistency-report.json`，归因写入 `skills/artifact/calibration/`（校准清单）

## 明确不做

- **不处理 PRD 隐含约定** —— PM 侧问题，AI 无解
- **不做 UI 层动画 / 悬浮态细节判断** —— Figma 静态元数据难以覆盖
- **不越界判断"UI 越界是设计还是遗漏"** —— 标为"待 PM 澄清"，不下结论
- **不接受 PDF PRD** —— 结构化提取不可靠
- **不降级到 OCR / 截图** —— Figma URL 必须能被 Figma MCP 访问，不能就报错

---

## 详细规则

### 四类检查

**第一类 · PRD 提到但 UI 未见**
- 操作类关键词（增/删/改/查 · 导入/导出 · 批量）→ 检查 UI 是否有对应入口
- 权限描述（角色 X 可 Y）→ 检查 UI 是否有对应角色的入口 / 隐藏
- 异常态描述（超时 / 失败 / 无权限）→ 检查 UI 是否有对应状态

**第二类 · UI 有但 PRD 未提（可能越界）**
- UI 稿上的按钮 / 入口 → 反查 PRD 是否有对应功能描述
- UI 上的字段展示 → 反查 PRD 是否有对应字段定义

**第三类 · 状态覆盖**
- 列表 / 详情页 → 检查空态 / 加载态 / 错误态是否已画
- 输入字段 → 检查极限值 / 空值 / 特殊字符
- 多语言场景 → 检查文案溢出

**第四类 · 语义一致性**
- PRD 措辞 vs UI 文案 → 检查关键词对应
- PRD 枚举值 vs UI 展示 → 检查值域一致

### 规则库外置

规则文件放 `rules/*.json`，可直接改文件不改 skill。

### 输出约束

- **P0 硬性 ≤ 5 条**（超过自动降 P1）—— 防止扫读容量过载
- 无 references 的项自动 discard
- suggested_speech 用于降低人的发言门槛（配合"降门槛"策略）

### 待补充实现

- [ ] `rules/` 规则库初始 json 骨架
- [ ] PRD 加载器（考虑抽 `tools/prd-loader/`）
- [ ] Figma MCP 调用封装（考虑抽 `tools/figma-mcp/`）
- [ ] 四类检查的 JS 实现
- [ ] 输出格式化脚本

**当前状态：规范骨架已就绪，实现待启动。**
