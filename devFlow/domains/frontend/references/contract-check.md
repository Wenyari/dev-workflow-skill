# contract-check 子命令

`contract-check` 用于在 `page-tech` 和 `page-build`
之间做可落地性检查。它的目标不是生成代码，而是判断页面方案是否已经具备创建 admin-fe 页面基建的条件。

执行 admin-fe 检查时，必须读取或内化项目根目录
`ADMIN_FE_WORKFLOW.md`，并把其中规则作为检查标准。

## 定位

- 输入：`page-tech.md`、飞书文档读取结果、API 文档、Apifox
  MCP 结果、用户补充约束和当前项目结构。
- 输出：`contract-report.md`。
- 结论：通过、不通过或阻塞。
- 后续动作：通过后允许进入 `page-build`；不通过或阻塞时回到 `page-tech` 修正。

## v1 形态

第一版采用人工 checklist 模式。

规则：

- Agent 逐条核对并输出 Markdown 报告。
- 每条结论必须引用真实证据。
- 证据可以是文件路径、代码片段、文档章节、飞书读取内容、API 文档段落或 Apifox
  MCP 返回结果。
- 不承诺自动化脚本能力。
- 不生成页面基建文件。
- 不修改业务源码。

机械规则可以用 `scripts/contract_check_static.mjs`
辅助检查。该脚本只检查 route 目录命名、组件文件命名、service/types/constants 存在性和
`src/routeTree.gen.ts` 是否被修改，不判断接口语义、状态语义或组件职责。

## 输入要求

### 必需输入

- 页面方案或页面上下文：本地 `page-tech.md`、飞书文档读取结果或等价页面方案。
- 当前项目结构：至少读取目标路由上级目录、相似 route、相关 service 目录和公共组件目录。
- admin-fe 项目规则：读取 `ADMIN_FE_WORKFLOW.md`。

### 条件输入

- 页面依赖接口时，必须提供 API 文档或 Apifox MCP 读取结果。
- 页面复用已有模块时，必须读取相关 route、component、service、types 或 constants。
- 页面涉及 Wujie、shell、全局状态时，必须读取对应 `src/shared/wujie-bridge.ts`
  或 `src/stores/shell-store.ts`。

### 缺失处理

- 必需输入缺失时，结论为阻塞。
- 条件输入缺失且影响基建文件创建时，结论为阻塞。
- 不影响基建创建的缺口可以列为非阻塞待确认项。

## 检查项

### 1. 路由路径

检查目标：

- 路由路径是否明确。
- 是否位于 `src/routes`。
- 路由目录是否使用 lowercase kebab-case。
- 是否需要创建或修改 `src/routeTree.gen.ts`。

通过标准：

- route 路径可直接映射到 `src/routes/<feature>/<page>/route.tsx`。
- 不需要手动编辑 `src/routeTree.gen.ts`。

失败或阻塞：

- 路由路径缺失。
- 路由路径与现有页面冲突。
- 方案要求手动修改 `src/routeTree.gen.ts`。

### 2. 目录和文件命名

检查目标：

- route 目录是否符合 lowercase kebab-case。
- React 组件文件是否符合 PascalCase。
- 非组件文件是否符合 kebab-case。
- service 是否按业务域放在 `src/services`。
- UI 复用顺序是否符合 Apex UI -> `src/common` -> 业务局部组件 -> 新建局部组件。

通过标准：

- 文件计划可以按 admin-fe 规则直接创建。
- 不需要跨无关模块改目录结构。

失败或阻塞：

- 文件命名含拼音、单字母或无意义缩写。
- 页面局部组件被错误规划到公共目录。
- service 模块位置与现有业务域冲突。

### 3. API 契约

检查目标：

- 每个接口是否具备接口名。
- 每个接口是否具备请求路径。
- 每个接口是否具备请求 method。
- 每个接口是否具备入参。
- 每个接口是否具备响应。
- 每个接口是否映射到调用组件。
- 每个接口是否映射到触发交互。
- 每个接口是否说明成功后的刷新范围和异常反馈。
- API 是否统一走 `src/services/request.ts`，页面内是否避免重复封装请求基础逻辑。

通过标准：

- 能生成 service 函数签名。
- 能在页面或组件中保留准确调用关系。
- 缺失内容只限于非阻塞字段，且可用 `TODO(api)` 标记。

失败或阻塞：

- 列表、详情、保存、删除等核心接口缺少路径、入参或响应。
- 接口来源无法验证。
- Apifox 项目缺少可用 MCP 读取结果且用户要求基于 Apifox 落地。

### 4. 页面状态

检查目标：

- 每个页面状态是否具备来源。
- 每个页面状态是否具备变化条件。
- 每个页面状态是否具备消费组件。
- loading、空数据、失败、无权限、提交中等状态是否与页面能力匹配。
- 页面临时状态是否避免使用 Zustand。
- shell 状态是否使用 `src/stores/shell-store.ts`。

通过标准：

- 页面状态可以用组件 state、Context 或 useReducer 表达。
- 不需要新增全局 Zustand store，除非方案和证据明确要求。

失败或阻塞：

- 状态来源不明。
- 状态变化条件不明。
- 方案要求创建全局状态但没有跨页面或持久化证据。

### 5. 组件映射

检查目标：

- 每个组件是否能映射到页面功能。
- 每个组件是否有明确输入、输出或事件。
- 组件拆分是否符合 route 局部优先原则。
- 组件是否错误承担 service、全局状态或 Wujie 职责。
- 涉及 Wujie 时是否复用 `src/shared/wujie-bridge.ts`。

通过标准：

- 组件可以映射到 `page-build` 的 route、components、types 和 constants。
- 页面局部组件靠近对应 route。

失败或阻塞：

- 组件只是设计稿图层复刻，无法映射页面功能。
- 组件职责过大或过散，导致基建目录不可落地。
- 缺少核心功能对应组件。

### 6. 待确认项

检查目标：

- 待确认项是否影响 route、service、types、components 或 constants。
- 待确认项是否影响 API 契约。
- 待确认项是否影响页面状态模型。

通过标准：

- 无阻塞待确认项。
- 非阻塞待确认项已经说明后续处理方式。

失败或阻塞：

- 待确认项会改变目录结构、核心接口或组件边界。
- 待确认项数量过多，无法形成稳定 page-build 文件计划。

## 证据规则

每条检查必须写证据。

证据格式：

```text
证据：<来源> <路径或章节> <关键片段或摘要>
```

示例：

```text
证据：仓库文件 src/routes/sales/client/route.tsx 使用 createFileRoute('/sales/client')
证据：page-tech.md 3.1 功能与接口映射列出 client-list 的入参和响应
证据：Apifox MCP client-list 接口返回 path=/admin/sales/client-list, method=POST
```

规则：

- 不得用“按经验判断”“通常如此”作为证据。
- 不得引用未读取的文件。
- 不得根据接口名称推断字段。
- 如果证据冲突，结论必须是不通过或阻塞。

## 报告输出

使用 `domains/frontend/templates/contract-report.md` 作为报告骨架。

报告必须包含：

- 总结论：通过、不通过或阻塞。
- 输入材料。
- 检查范围。
- 逐项 checklist。
- 阻塞项。
- 非阻塞待确认项。
- 是否允许进入 `page-build`。

如果运行了静态脚本，报告必须包含脚本输出摘要，并明确哪些结论仍由人工 checklist 判断。

## 结论规则

### 通过

满足以下条件才能通过：

- route、目录命名、API 契约、页面状态、组件映射全部通过。
- 不存在阻塞待确认项。
- 每条结论都有真实证据。

通过后输出：

```text
结论：通过，允许进入 page-build。
```

### 不通过

存在明确错误但可以通过修改 `page-tech` 修复。

不通过后输出：

```text
结论：不通过，需回到 page-tech 修正后重新 contract-check。
```

### 阻塞

缺少必需输入或无法验证关键事实。

阻塞后输出：

```text
结论：阻塞，需补充上下文后重新 contract-check。
```

## 禁止项

- 不把自动化脚本结果当作完整 contract-check 结论。
- 不创建页面基建文件。
- 不修改业务源码。
- 不跳过证据要求。
- 不把 `TODO(api)` 当作核心接口缺失时的通过理由。
- 不允许在检查不通过时进入 `page-build`。
