# dev-workflow-skill

研发协作 AI 工具库。方法论基础：[研发协作方法论.md](./研发协作方法论.md)。

**核心思想**：AI 只生成结构化、可审核、可修改的初稿，人是文档与代码的最终决策者。

## 安装到你的仓库

一条命令把 skill 装到项目级目录：

```bash
npx @dev-workflow/skill
```

进入安装命令后会先显示 `DEV-WORKFLOW` 3D 字符 LOGO，再进入交互式选择。菜单使用 `↑`、`↓` 或 `←`、`→` 切换，按 `Enter` 确认：

1. **目标 agent**：Claude Code（装到 `.claude/`）或 Codex（装到 `.agents/`）
2. **冲突策略**：跳过已存在文件 / 全部覆盖 / 逐个决定

装完的目录结构（以 Claude Code 为例）：

```
.claude/
├── skills/
│   ├── execution/
│   │   ├── SKILL.md
│   │   └── {devFlow, figmaSync}/
│   ├── review/
│   │   ├── SKILL.md
│   │   └── {prd-ui-check, frontend-code-review, code-structure-review}/
│   └── artifact/
└── tools/{lark, product-design-specs}/
```

`execution/SKILL.md` 和 `review/SKILL.md` 是分类导航入口，用于先识别任务类型，再加载对应子技能。

**装完请手动做两件事**：

1. `git add .claude && git commit -m "chore: install @dev-workflow/skill"`（跟随仓库走，团队共享同一版本）
2. 从本仓库把 [`HUMAN_AGENT_WORKFLOW.md`](./HUMAN_AGENT_WORKFLOW.md) 复制到目标项目根目录 —— `devFlow` / `prd-review` 依赖它判断 L0/L1/L2/L3 分档；CLI 检测到缺失会打印警告，但不会代你搬。

**升级**：重跑 `npx @dev-workflow/skill`，冲突策略选「全部覆盖」即可。npm 缓存会自动拉最新版；固定版本用 `npx @dev-workflow/skill@0.1.0`。

## 发新版本（维护者）

改完代码，按语义化版本发新版：

```bash
# 1. 视变更幅度选一个
npm version patch    # 0.1.0 → 0.1.1  bug fix
npm version minor    # 0.1.0 → 0.2.0  新功能，向下兼容
npm version major    # 0.1.0 → 1.0.0  破坏性变更

# 上面这条会自动改 package.json + git commit + 打 tag v0.1.1

# 2. 推 tag 和代码到 GitHub
git push origin main --tags

# 3. 发到 npm（会弹浏览器要 Touch ID / OTP）
npm publish
```

**常见坑**：

- 首次发布前没 `npm login --auth-type=web` → 报 401，先登录
- `npm publish` 后立刻跑 `npx` 拉不到 → CDN 生效需要 30 秒到 2 分钟
- `npm publish` 在使用私有 registry 的仓库里会报 404 → 加 `--registry=https://registry.npmjs.org/`

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
├── review/         评审层：PRD↔UI、产品规范和代码结构 Review
│   ├── prd-ui-check/           PRD↔UI 语义检查
│   ├── frontend-code-review/   前端业务代码 vs 产品设计规范
│   ├── code-structure-review/  基于 Graphify 的冗余、抽象与耦合候选分析
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
├── product-design-specs/       产品设计规范（字段/交互/反馈）
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
