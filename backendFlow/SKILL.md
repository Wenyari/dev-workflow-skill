---
name: backendFlow
description:
  后端研发工作流入口。按子命令读取上下文、生成可审核的后端技术方案文档并发布到飞书。适用于用户要求写后端技术方案、接口设计、数据模型/数据库设计、核心流程时序等后端落地文档时。当前支持
  api-tech 子命令生成后端技术方案，支持 lark-read 读取飞书 PRD 作为上下文，支持 lark-doc 发布到飞书
  Wiki，支持 prepare 说明飞书环境变量；飞书读写复用 devFlow 脚本。核心产出是文档，不生成后端代码骨架。
---

# 后端研发工作流

本 Skill 是后端研发工作流入口，与前端 `devFlow` 平级。它识别任务类型、选择子命令、加载对应规则和模板。子命令详细规则放入
`references/`，不堆在本文件。

## 通用原则

- 使用中文输出。
- 文档的主要构建者和审核者是人，AI 只生成结构化、可审核、可修改的初稿。
- 必须基于用户提供的需求、设计、接口、仓库代码写作。
- 不得臆想接口字段、表字段、路径、错误码、权限码、状态或 coding 细节。
- 必需上下文缺失时，向用户确认，或写入“风险与待确认项”。
- 核心产出是后端技术方案文档，不生成 controller / service / dto / entity 代码骨架。
- 代码事实优先：后端仓库可用时，接口、实体、schema 必须基于真实代码；仓库不可用时不写具体路径、不声称某资源存在。
- 飞书读写、Markdown 转 Docx blocks、权限检查复用 `devFlow/scripts/` 脚本，不重复造脚本，环境变量沿用同一套
  `FEISHU_*`。
- 读写飞书直接使用飞书 Open API 和环境变量，不需要初始化 `lark-cli`。

## 格式硬规则

- 分节一律用原生 Markdown 标题层级：章 `#`、节 `##`、小节 `###`，最多三级，对应飞书 heading1/2/3 自动编号。
- 标题文本禁止手写序号（写 `## 接口设计`，不写 `## 2. 接口设计`）；序号交给飞书标题自动编号。
- 数据结构（实体/表 + 接口出入参）用「字段表格 + TypeScript 代码块」双给；复杂嵌套可补 JSON 示例。
- 每个接口必含四要素：入参区分 path/query/body、出参统一包裹 `{ code, data, message }`、参数标注必填/默认/校验、错误码清单。
- 生成文档后用 `scripts/check_api_tech_doc.mjs` 自检。

## 图表工作流

技术文档需要图时，用 Mermaid 作为源码：接口时序 `sequenceDiagram`、业务流程 `flowchart`、数据实体
`erDiagram`、状态流转 `stateDiagram-v2`。正文保留 Mermaid 源码；要落地飞书画板时交 `design-lark-chart`
渲染。

## 子命令路由

### prepare

用途：说明 backendFlow 使用飞书读写前需要配置的环境变量。

触发方式：用户输入 `backendFlow prepare`、要求“初始化 backendFlow”、“配置飞书环境变量”，或第一次使用
`lark-read` / `lark-doc` 前。

执行规则：读取 `references/prepare.md`，告知必需变量与发布 Wiki 所需变量，不回显 secret。

### api-tech

用途：生成后端技术方案文档（接口设计、数据模型、核心流程时序、边界与异常、风险）。

触发方式：用户输入 `backendFlow api-tech`、要求“写后端技术方案”“写接口设计文档”“根据 PRD 生成后端落地方案”。

执行规则：读取 `references/api-tech.md`，按选择式骨架确认章节，使用 `assets/templates/api-tech.md`
作为骨架，生成后用 `scripts/check_api_tech_doc.mjs` 自检。

### lark-read

用途：读取飞书 PRD / 需求文档作为上下文。

触发方式：用户输入 `backendFlow lark-read`、提供飞书文档链接并要求读取、要求“根据这个飞书文档写后端方案”。

执行规则：读取 `references/lark-read.md`，调用 `devFlow/scripts/lark_read_docx.mjs` 读取并结构化内容。

### lark-doc

用途：把后端技术方案发布到飞书 Wiki 父节点。

触发方式：用户输入 `backendFlow lark-doc`、要求“发布到飞书”“写入飞书文档”。

执行规则：读取 `references/lark-doc.md`，调用 `devFlow/scripts/lark_publish_doc.mjs` 发布 Markdown
正文，返回飞书链接。

## 未实现子命令

当前仅实现 `prepare`、`api-tech`、`lark-read`、`lark-doc`。用户要求其他后端文档类型（重构方案、接口评审表等）时，先说明尚未定义对应子命令，再与用户确认是否扩展，不临时发挥。
