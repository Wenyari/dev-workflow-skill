# Changelog

## Unreleased

### Changed

- `figmaSync` 重命名为符合 Skill 命名规范的 `figma-sync`；入口只保留阶段路由、工作流边界和跨阶段约束，具体执行规则按需加载对应 chapter。
- 九个 Skill 的触发条件统一维护在 frontmatter `description`，删除正文重复的“什么时候用”。

### Removed

- 删除未实际推广的 `devFlow` 旧命令兼容 Skill；新任务直接使用 `frontend`、`backend`、独立 Review Skill 或共享飞书能力。

### Fixed

- 飞书文档规则不再引用未实现的 `design-lark-chart`；只有当前环境存在真实、已授权的图形能力时才生成图形产物，否则保留 Mermaid 源码并明确未渲染。
- 快速开始、决策树和命令速查改用多语言测试文件口径，不再把后端接口测试限定为 `*_test.go`。
- 安装目录和仓库结构补充 `tools/mermaid`。
- 飞书读取缓存目录改用中性名称，不再沿用 `devFlow` 前缀。

### Migration

- 安装器不会删除目标仓库中的旧文件；从 0.3.0 升级后，如仍存在 `.claude/skills/execution/devFlow/` 或 `.agents/skills/execution/devFlow/`，请人工删除。
- 旧 `$devFlow` 命令按 0.3.0 的迁移表改用 `$frontend`、`$backend`、独立 Review Skill 或共享飞书能力。
- `figmaSync prepare/plan/apply` 改用 `figma-sync prepare/plan/apply`。升级覆盖安装后，请人工删除遗留的 `.claude/skills/execution/figmaSync/` 或 `.agents/skills/execution/figmaSync/`；旧 session 文件不迁移。

## 0.3.0 - 2026-07-28

### Changed

- execution 按 `frontend` 与 `backend` 领域拆分。
- `contract-check` 收敛为 `page-build` 的前置门禁。
- `foundation-freeze` 收敛为 `page-build` 的 Foundation Review 阶段。
- `prd-review` 从 `devFlow` 迁移到 review 层。
- 后端接口集成测试迁入 `backend` 的 `integration-test` 阶段。
- `devFlow` 改为旧命令兼容导航，保留至少一个版本。
- 旧命令映射只在 `devFlow` 兼容导航和本变更记录维护，新领域入口不再重复声明。
- 用户导航只展示已经实现的 skill；未投产的 artifact 能力移入 `docs/roadmap/`，不再随安装器复制。
- Figma 本地同步快照不再进入 npm 包或用户项目。
- 分层与维护约束收敛到 `CONTRIBUTING.md`，移除对缺失方法论文档的引用。

### Migration

| 旧命令 | 新入口 |
|---|---|
| `$devFlow page-tech` | `$frontend page-tech` |
| `$devFlow contract-check` | `$frontend page-build check` |
| `$devFlow page-build` | `$frontend page-build` |
| `$devFlow foundation-freeze` | `$frontend page-build` 的 Foundation Review 阶段 |
| `$devFlow api-tech` | `$backend api-tech` |
| `$devFlow prd-review` | `$prd-review` |
| `$devFlow prepare / lark-read / lark-doc` | 共享飞书能力；旧命令迁移期兼容 |
