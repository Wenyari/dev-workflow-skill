# Changelog

## Unreleased

### Added

- 安装器将 `HUMAN_AGENT_WORKFLOW.md` 纳入 npm 包并复制到消费仓库根目录，沿用 skill 文件相同的跳过、覆盖或逐个确认策略。
- 后端接口测试报告增加环境隔离、外部副作用、清理恢复和授权记录。
- 更新类接口方案必须声明乐观锁、条件更新或不采用并发控制的依据与替代保护。

### Breaking

- Figma 视觉落地 Skill 的目录、Skill ID 与命令由 `figmaSync` 直接迁移为 `figma-sync`。
- 安装器检测到旧 `skills/execution/figmaSync/` 时会停止安装，避免新旧 Skill 同时存在；用户需要先手动迁移或移除旧目录。

### Changed

- 后端接口集成测试根据仓库事实识别语言、框架、测试运行器和项目原生命令。
- 后端测试明确区分本地隔离环境、共享测试环境和生产或未知环境；共享环境写入、删除、消息及外部调用需要单独授权。
- `devFlow` 因尚未完成至少一个正式发布版本的兼容周期，继续保留其 camelCase Skill ID 作为临时例外，不再向其中增加业务能力。
- `figma-sync` 内置脚本从自身安装位置解析 Skill 根目录，不再依赖 `.agent`、`.agents` 或 `.claude` 的固定路径。
- Figma session 日志和报告默认写入按消费仓库隔离的系统临时目录。
- 安装器会从运行位置向上识别 Git 仓库根目录；非 Git 目录需要额外确认。

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
