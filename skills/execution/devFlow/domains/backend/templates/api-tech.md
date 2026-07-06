<!-- devFlow domains/backend api-tech 模板（定稿格式）。章节用 HTML 注释标【必写】/【可选】，生成正式文档时删除所有 HTML 注释。 -->
<!-- 飞书排版语法：> 引用块；> [!WARNING]/[!TIP]/[!NOTE] 高亮块；--- 分隔线；**x** 粗体；表格自动灰底表头+自适应列宽。标题不写编号。 -->

# 背景与目标
<!-- 【可选】 -->

说明本次后端要解决的问题与服务级目标。不写项目背景与技术栈罗列。

# 范围与非目标
<!-- 【可选】 -->

- 涉及的服务 / 模块。
- 明确不做的部分（非目标）。

# 接口设计
<!-- 【必写】 -->

> 统一约定：`POST`，`Content-Type: application/json`，返回体 `{ code, data }`，时间字段统一 epoch ms。鉴权：Admin 登录态。

## <模块名>

### <接口名> · POST /api/<module>/<action>

**用途**：用 bullet 列出能力点：

- 能力点 1
- 能力点 2

**入参**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| page | number | 是 | 页码（≥ 1） |
| pageSize | number | 是 | 每页条数（1–100） |

```typescript
interface ExampleDto {
  page: number
  pageSize: number
}
```

> [!WARNING] 标注本期为 mock / 跨模块依赖的字段，需在此提示。

**出参**（data 结构）

```typescript
interface ExampleData {
  total: number
  list: ExampleItem[]
}
```

**说明**

- 副作用 / 事务 / mock 口径等要点，逐条 bullet。

**错误码**：`40001` 参数校验失败 ｜ `40301` 登录态失效

---

# 数据模型 / 数据库设计
<!-- 【必写】 -->

## <实体 / 表名>

> 集合 <name>（用途）。extends Base: sys_status；timestamps。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| _id | ObjectId | 是 | 主键 |
| name | string | 是 | 名称，查重唯一 |
| createdAt | number | 是 | 创建时间，epoch ms |

```typescript
interface Entity {
  _id: string
  name: string
  createdAt: number // epoch ms
}
```

索引与 migration 影响：说明新增/变更的索引、唯一约束、迁移注意点。

# 核心流程 / 时序
<!-- 【必写】 -->

说明关键业务流程、调用链、事务边界与幂等 / 并发。状态流转用 Mermaid（源码）。生成正式文档时按实际场景保留必要图，不要机械保留所有示例。

**主链路时序图**

```mermaid
sequenceDiagram
  autonumber
  actor U as 用户浏览器
  participant FE as xxx-portal · 前端
  participant BE as xxx-server · 后端
  participant AD as admin-be · 管理后台

  rect rgb(219, 234, 254)
  Note over U,BE: 阶段 1 · 入口 / 初始化（说明边界）
  U->>FE: 进入页面 / 触发操作
  FE->>BE: check-session / load-profile
  BE-->>FE: { profileStatus }
  end

  rect rgb(254, 243, 199)
  Note over U,BE: 阶段 2 · 暂存 / 校验（说明数据落点）
  U->>FE: 填写信息
  FE->>BE: save-draft / validate
  BE->>BE: 参数校验 / 幂等检查
  BE-->>FE: { saved: true }
  end

  rect rgb(220, 252, 231)
  Note over U,AD: 阶段 3 · 提交 / 生效（说明事务与外部依赖）
  U->>FE: 点击提交
  FE->>BE: submit
  BE->>AD: AdminClient.submit（x-signature 验签）
  AD->>AD: 查重 / 状态机 / 审计
  AD-->>BE: { status }
  BE-->>FE: { code, data }
  end
```

**关键分支流程图**（存在事务、幂等、异常分支时保留）

```mermaid
flowchart TD
  classDef entry fill:#dbeafe,stroke:#60a5fa,color:#1e3a8a
  classDef success fill:#dcfce7,stroke:#22c55e,color:#14532d
  classDef warn fill:#fef3c7,stroke:#f59e0b,color:#78350f
  classDef risk fill:#fee2e2,stroke:#ef4444,color:#7f1d1d

  A[接收提交请求]:::entry --> B{幂等键存在?}
  B -->|是| C[返回已有处理结果]:::warn
  B -->|否| D[参数与权限校验]
  D --> E{校验通过?}
  E -->|否| F[返回业务错误码]:::risk
  E -->|是| G[开启事务并写入主表]
  G --> H[提交事务]:::success
```

# 依赖与非功能性
<!-- 【可选】 -->

- 中间件 / 第三方 / MQ / 缓存。
- 限流、性能、安全与权限。

# 边界与异常
<!-- 【必写】 -->

- 空数据、请求失败、无权限、重复提交、并发冲突、部分数据缺失的处理与返回。
- 回滚、重试、降级策略。

# 完成标准
<!-- 【可选】 -->

说明后端做到什么程度算完成。保持简短，不写测试用例与排期。

# 风险与待确认项
<!-- 【必写】 -->

- 收敛 PRD / 接口 / 仓库代码冲突，每条具体到可直接问产品、前端或负责人。
