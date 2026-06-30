# page-build 子命令

`page-build`
用于把已审核的页面方案或可验证上下文转换成 admin-fe 页面基建文件。它只负责创建可 review、可继续开发的占位骨架，不负责完成业务逻辑、最终视觉实现或复杂交互。

执行前必须读取或内化项目根目录
`ADMIN_FE_WORKFLOW.md`，并遵守其中的路由、请求、状态、Wujie、UI 复用和验证规则。

## 定位

- 输入：已审核的
  `page-tech.md`、飞书文档链接、API 文档、Apifox 项目上下文、用户补充约束和当前仓库结构。
- 输出：文件创建计划；Human 确认后，创建 route、页面局部 components、service、types、constants 和必要 index 导出。
- 不输出：完整业务逻辑、最终样式、真实 mock 数据、未确认接口字段、全局状态重构。

## 输入来源

### 本地 Markdown

适用于用户提供已审核 `page-tech.md` 或其他页面方案文档。

读取规则：

1. 读取文档全文或与目标页面相关章节。
2. 抽取页面名称、路由路径、页面范围、组件拆分、状态设计、接口清单、目录结构和待确认项。
3. 如果文档没有明确“已审核”或用户没有确认，先询问是否允许进入 page-build。

### 飞书文档链接

适用于用户把 PRD、页面方案、接口说明或评审文档放在飞书中。

读取规则：

1. 先按 `lark-read` 子命令读取飞书文档。
2. 将读取结果整理为 page-build 上下文。
3. 不得根据链接标题、URL 或用户转述猜测内容。
4. 如果读取失败，停止依赖该文档生成文件计划。

### API 文档

适用于用户直接提供接口文档、OpenAPI 片段、Markdown 表格或后端约定。

抽取规则：

- 接口名。
- 请求路径。
- 请求 method。
- 入参类型。
- 响应类型。
- 触发组件或交互。
- 成功后的刷新范围。
- 错误处理要求。

缺失任一关键信息时，不补造字段，在 service 模板中保留 `TODO(api)`。

### Apifox 项目上下文

适用于用户指定 Apifox 项目、目录、接口或接口分组。

处理规则：

1. 先发现当前运行环境是否提供 Apifox MCP 工具。
2. 有可用工具时，通过 MCP 读取项目接口、目录、接口详情、请求参数和响应结构。
3. 只使用 MCP 返回的真实接口事实，不根据接口名称推断字段。
4. 如果没有 Apifox
   MCP 工具、缺少项目权限、缺少项目 ID 或接口范围不明确，必须把问题列为阻塞待确认项。
5. 不在 Skill 中承诺固定脚本或固定工具名；以当前可用 MCP 能力为准。

## 工作流程

1. 识别输入来源，读取必要上下文。
2. 扫描当前仓库相关路径，确认现有 route、service、common、shared、stores 和相似页面写法。
3. 抽取页面基建契约：
   - route 路径。
   - 页面目录。
   - 页面局部组件。
   - service 模块和函数签名。
   - types 类型。
   - constants 常量。
   - 页面级状态来源和变化条件。
4. 输出文件创建计划，逐个文件说明路径、用途、具体内容和 TODO。
5. 等待 Human 明确确认后再创建或修改文件。
6. 按最小完整范围落地模板，不扩大到无关页面或全局配置。
7. 完成后说明已创建文件、未实现内容和下一步建议。

## 创建前确认机制

创建或修改任何文件前，必须向 Human 复述：

- 输入来源和已确认事实。
- 将创建或修改的完整文件清单。
- 每个文件的具体职责和主要内容。
- API 契约来源；如果来自 Apifox，说明 MCP 读取结果。
- 待确认项是否阻塞 page-build。
- 明确说明不会修改 `src/routeTree.gen.ts`。

只有 Human 明确确认后才能执行文件改动。不能把“继续”“看起来可以”等含糊表达当成确认。

## 文件布局规则

推荐路径：

```text
src/routes/<feature>/<page>/route.tsx
src/routes/<feature>/<page>/components/<PageSection>.tsx
src/routes/<feature>/<page>/types.ts
src/routes/<feature>/<page>/constants.ts
src/routes/<feature>/<page>/index.ts
src/services/<feature>/<page>.ts
```

当目标业务域已有同类页面时，优先对齐同业务域的真实目录结构，而不是机械使用
`components/` 扁平目录。例如 `admin-fe` 销售模块已有
`src/routes/sales/client/`，新建销售页面应优先采用同类分层：

```text
src/routes/sales/<page>/dashboard/<PageDashboard>.tsx
src/routes/sales/<page>/toolbar/<PageFilters>.tsx
src/routes/sales/<page>/toolbar/<PageScopeToolbar>.tsx
src/routes/sales/<page>/table/<PageTable>.tsx
src/routes/sales/<page>/detail-drawer/<PageDetailDrawer>.tsx
src/routes/sales/<page>/modal/<PageModal>.tsx
```

只有目标业务域没有可参考页面，或页面确实只有一两个局部组件时，才使用默认
`components/` 占位结构。

规则：

- 路由文件放在 `src/routes`。
- 路由目录使用 lowercase kebab-case。
- React 组件文件使用 PascalCase。
- 非组件文件使用 kebab-case。
- service 按业务域放在 `src/services` 下，优先复用已有业务域目录。
- 不手动编辑 `src/routeTree.gen.ts`。
- 页面仅使用的组件优先靠近 route；真正复用时再抽到公共目录。
- UI 复用顺序：Apex UI -> `src/common` -> 业务局部组件 -> 新建局部组件。

## Apex UI 组件契约规则

`admin-fe` 使用 `@frontend/apex-ui--react`。page-build 中只要新增或改动 Apex
UI 组件用法，必须先读取组件库随包提供的 LLM 文档和类型契约，不得根据 Ant
Design、Radix UI 或原生 HTML 经验推断 props。

必须读取：

```text
node_modules/@frontend/apex-ui--react/dist/llms.txt
node_modules/@frontend/apex-ui--react/dist/llm/<component>.txt
```

必要时继续读取：

```text
node_modules/@frontend/apex-ui--react/dist/index.d.ts
```

规则：

- 先从 `llms.txt` 确认组件是否存在，再读取实际使用组件对应的
  `llm/<component>.txt`。
- 必须核对组件 props、事件名、受控字段、数据结构、默认行为和限制。
- 如果已有相似页面使用该组件，先对照相似页面，再以 Apex UI LLM 文档和
  `index.d.ts` 类型声明为准。
- 不得把 antd 的 `items`、`columns`、`onChange`、`value`、`visible`
  等约定直接套到 Apex UI。
- 如果文档、类型声明和实际运行行为冲突，必须记录为待确认项或技术风险；不得继续扩大该组件用法。
- 文件创建计划中必须列出本次使用的 Apex UI 组件和已读取的文档来源。
- 如果组件库存在已知缺陷，例如运行时 warning 或类型与行为不一致，优先在页面局部规避，并在总结中说明原因。

## 模板使用

使用以下模板作为占位参考：

```text
assets/templates/page-build/route.tsx.tpl
assets/templates/page-build/component.tsx.tpl
assets/templates/page-build/service.ts.tpl
assets/templates/page-build/types.ts.tpl
assets/templates/page-build/constants.ts.tpl
assets/templates/page-build/index.ts.tpl
```

模板变量建议：

- `{{routePath}}`：TanStack Router 路由路径，例如 `/sales/client`。
- `{{pageComponentName}}`：页面组件名，例如 `SalesClientPage`。
- `{{featureName}}`：业务域名，例如 `sales`。
- `{{pageName}}`：页面名，例如 `client`。
- `{{serviceModulePath}}`：service 导入路径，例如 `@/services/sales/client`。
- `{{queryKeyPrefix}}`：query key 前缀，例如 `['sales', 'client']`。

## API 落地规则

- API 调用统一使用 `src/services/request.ts`。
- service 函数签名必须从文档、飞书或 Apifox MCP 结果推导。
- API 返回类型优先由 service function 导出，页面层通过 import type 使用。
- 未确认接口不得写死路径、参数或响应字段。
- 缺少接口路径时写 `TODO(api): confirm endpoint path`。
- 缺少入参时写 `TODO(api): confirm request params`。
- 缺少响应时写 `TODO(api): confirm response shape`。
- 页面组件只调用 service，不直接调用 axios 或重新封装 request。

## 状态规则

- 页面级、临时、多实例或随生命周期销毁的状态使用组件 state、Context 或 useReducer。
- Zustand 只用于全局、持久、跨页面或复杂状态。
- shell 相关状态统一使用 `src/stores/shell-store.ts`。
- Wujie 逻辑必须复用
  `src/shared/wujie-bridge.ts`，页面内不得重写路由同步、props 同步、登录过期或主题同步。
- page-build 不创建新的全局 store，除非已审核方案明确要求且 Human 再次确认。

## 禁止项

- 不写完整业务逻辑。
- 不写最终视觉样式。
- 不创建未确认接口字段。
- 不创建无来源 mock 数据。
- 不修改 `src/routeTree.gen.ts`。
- 不重写 `src/services/request.ts`。
- 不新增不必要的全局状态。
- 不在页面内重写 Wujie bridge。
- 不因为设计稿图层结构重拆业务组件。
- 不跨越目标页面修改无关模块。

## 输出格式

文件改动前，输出：

```md
## page-build 文件创建计划

### 输入事实

### API 来源

### 文件清单

| 文件 | 操作 | 内容 | TODO | 是否阻塞 |
| ---- | ---- | ---- | ---- | -------- |

### 不会修改

- src/routeTree.gen.ts

### 待确认项
```

文件改动后，输出：

- 已创建或修改文件。
- 每个文件保留的 `TODO(api)` 和 `TODO(figmaSync)`。
- 未验证内容。
- 建议下一步执行的检查。

## 验收标准

- 能基于本地方案或飞书文档生成可 review 的文件创建计划。
- 模板符合 admin-fe 命名、路由、请求、状态规则。
- service 占位只使用 `src/services/request.ts`。
- route 占位使用 TanStack Router。
- 文件创建前存在 Human 确认机制。
- Apifox 项目上下文只通过可用 MCP 工具读取，不编造能力。
