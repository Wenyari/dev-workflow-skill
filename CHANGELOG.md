# Changelog

## Unreleased

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
