# 集成测试技术栈识别

本文件只提供识别线索和命令选择约束，不把示例命令当成项目事实。任意语言都可进入本流程，前提是能从仓库中建立可复核的测试证据链。

## 证据优先级

按以下顺序确定技术栈和测试命令：

1. 用户明确指定的语言、框架、测试环境和命令。
2. `AGENTS.md`、README、开发规范、Makefile / Taskfile 和项目自带脚本。
3. CI 中真实执行的测试命令、工作目录、环境变量和服务依赖。
4. manifest、构建文件、测试运行器配置和锁文件。
5. 既有测试的 import、基类、fixture、helper、命名和目录结构。
6. 文件扩展名和通用惯例，只能作为辅助线索。

证据冲突时以更高优先级为准；高优先级事实之间冲突时停止执行或生成，请用户确认。

## 常见技术栈线索

| 技术栈 | 主要识别证据 | 常见运行器 / 设施 | 命令选择约束 |
|---|---|---|---|
| Node.js / TypeScript | `package.json`、lockfile、测试配置、scripts | Jest、Vitest、Mocha、Tap、Supertest | 优先使用已定义的 package script 和仓库锁定的 package manager |
| Python | `pyproject.toml`、`pytest.ini`、`tox.ini`、`requirements*.txt` | pytest、unittest、Django / FastAPI / Flask 测试客户端 | 沿用项目已存在的环境和 runner，不自动创建 virtualenv |
| Java / Kotlin | `pom.xml`、`build.gradle*`、wrapper、Surefire / Gradle 配置 | JUnit、TestNG、Spring Test、MockMvc | 优先使用 Maven / Gradle wrapper 和现有 task |
| Go | `go.mod`、`*_test.go`、build tag | `go test`、httptest、项目自带 suite | 沿用真实 package、build tag 和测试脚本，不默认全仓 `./...` |
| Rust | `Cargo.toml`、workspace、`tests/` | `cargo test`、框架原生测试设施 | 使用已有 package / test target / feature，不自行打开 feature |
| PHP | `composer.json`、`phpunit.xml*`、Pest 配置 | PHPUnit、Pest、框架测试基类 | 优先 Composer script 或项目锁定的 runner |
| Ruby | `Gemfile`、`.rspec`、Rakefile、`test/` / `spec/` | RSpec、Minitest、Rails request spec | 沿用 Bundler / Rake 入口和项目 helper |
| .NET | `*.sln`、`*.csproj`、`global.json`、runsettings | xUnit、NUnit、MSTest、WebApplicationFactory | 沿用 solution / project / filter 范围和仓库 SDK 约束 |
| 其他语言 | 项目 manifest、构建文件、CI、测试配置和既有测试 | 仓库已存在的 runner / harness | 只在命令、范围和环境都可验证时执行或生成 |

表中的 runner 只是候选线索。仓库没有对应依赖或配置时，不得引入或假定存在。

## 测试层级判定

| 层级 | 判定证据 | 报告边界 |
|---|---|---|
| 接口入口测试 | 请求进入 Handler / Controller / Route / Resolver / RPC 入口，业务或外部依赖使用 fake / mock | 只证明路由、参数、鉴权、错误映射和响应契约等已断言行为 |
| 组件集成测试 | 入口与真实 Service / Repository / 数据库 / 消息设施的可控测试实例集成 | 列出真实集成组件与仍被替身的外部边界 |
| 端到端测试 | 通过已部署服务访问完整链路 | 记录环境、数据影响、清理方式和未覆盖的外部系统 |

同一命令包含多个层级时，按用例分别标注，不用最高层级统一包装全部结果。

## 环境隔离等级

| 等级 | 判定证据 | 执行规则 |
|---|---|---|
| 本地隔离 | fake / mock、临时容器、临时数据库、事务回滚或按用例唯一命名且自动回收 | 范围和命令授权明确后执行，并记录隔离与回收证据 |
| 共享测试 | daily / test / staging，或多人共用数据库、缓存、消息、对象存储、第三方沙箱 | 先披露数据作用域、副作用、清理与失败恢复方案，取得共享环境写入的单独确认 |
| 生产 / 未知 | 生产标识、真实客户数据，或无法确认环境归属与数据隔离 | 停止执行，不通过降低测试范围绕过 |

环境名称不是充分证据。即使变量名包含 `test`，只要资源被多人共享或存在持久化副作用，就按共享测试环境处理。
## 命令与工作目录

- 优先级：用户指定命令 > 项目脚本 / wrapper > CI 命令 > runner 原生最小命令。
- 一律在对应 manifest、工程或模块的真实工作目录执行。
- monorepo 先定位所属 workspace / module，不在仓库根目录猜测命令。
- 不自动安装依赖、生成锁文件、创建虚拟环境、下载 SDK 或修改 runner 配置。
- 只能通过扩大到全仓才能运行时，必须把扩大范围作为新授权交给用户确认。
- 命令会写共享数据库、缓存、消息、对象存储或外部服务时，测试范围确认不能替代共享环境副作用确认。

## 未知或不支持的项目

出现以下任一情况时停止，不生成测试，也不执行候选命令：

- 无法从仓库确定测试运行器或不存在可执行测试设施。
- 多套测试框架同时存在，且目标接口无法唯一映射。
- 命令需要未安装依赖、未授权的外部服务或不明环境写入。
- 共享环境的数据作用域、清理方式或失败恢复方式无法确定。
- 现有测试惯例与契约冲突，无法确定预期值。

停止时输出已识别的语言与框架线索、缺失证据、候选运行器和需要用户确认的唯一问题。
