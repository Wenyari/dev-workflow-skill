# dev-workflow-skill

研发协作 AI 工具库。方法论基础：[研发协作方法论.md](./研发协作方法论.md)。

**核心思想**：AI 只生成结构化、可审核、可修改的初稿，人是文档与代码的最终决策者。

## 我要开始用

- **第一次用** → [QUICKSTART.md](./QUICKSTART.md)
- **不确定用哪个** → [DECISION_TREE.md](./DECISION_TREE.md)
- **已经知道用哪个** → [CHEATSHEET.md](./CHEATSHEET.md)

## 我要贡献

- **加 skill / tool** → [CONTRIBUTING.md](./CONTRIBUTING.md)
- **SKILL.md 模板** → [docs/skill-template/](./docs/skill-template/)

## 仓库结构

```
skills/
├── review/         评审层：AI 三角色规范（规划中）
│   ├── consistency-checker/    PM↔UI 一致性检查
│   ├── risk-scanner/           需求评审风险扫描
│   └── contract-aligner/       技术评审契约对齐
├── execution/      开发层：方案生成 + 代码落地
│   ├── devFlow/                页面 / 后端方案 + 页面基建
│   └── figmaSync/              Figma → 原生 CSS
└── artifact/       产物层：跨环节数据收口（规划中）
    ├── open-issues/            未闭环清单
    └── calibration/            校准清单 + 回喂

tools/              共享能力（不对用户暴露）
├── lark/                       飞书读写、Markdown 转 blocks、权限检查
├── figma-mcp/                  Figma 元数据封装（规划中）
├── prd-loader/                 PRD 全文加载（规划中）
└── rules/                      规则库、业务词表（规划中）

docs/               维护者深度文档
├── skill-template/             SKILL.md 五段式骨架
├── adr/                        架构决策记录
└── superpowers/                历史文档
```

分层依据见 [CONTRIBUTING.md](./CONTRIBUTING.md) 第 1 章。**用户使用时不需要感知分层**，直接查 QUICKSTART / DECISION_TREE 即可。

## 相关文档

- [HUMAN_AGENT_WORKFLOW.md](./HUMAN_AGENT_WORKFLOW.md) — L0/L1/L2/L3 分级判断
