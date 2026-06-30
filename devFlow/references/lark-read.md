# lark-read 子命令

`lark-read`
用于读取飞书云文档、Wiki 文档或文档链接，并将内容转换为后续研发工作流可用的上下文。它只负责读取和整理上下文，不负责生成最终技术方案，也不负责发布文档。

## 定位

- 输入：飞书文档链接、Wiki 链接、Docx 链接或用户指定的飞书文档 token。
- 输出：结构化上下文摘要。
- 用途：供 `page-tech`、后续技术方案子命令或人工审核使用。

## 环境变量

必须从环境变量读取配置：

```text
FEISHU_APP_ID
FEISHU_APP_SECRET
```

规则：

- 不要把 app secret 写入 Skill、仓库文件、技术方案正文或日志。
- 不要在最终回复中回显 secret。
- 如果任一变量缺失，停止读取并告诉用户缺少哪个变量。
- 飞书读取默认走 Open API（应用身份），不需要初始化 `lark-cli`；设 `FEISHU_BACKEND=larkcli` 可改用 lark-cli 用户身份，`auto` 自动择优。仅 larkcli 模式需先 `lark-cli auth login`，配置见 `prepare`。

## 链接类型识别

根据 URL 路径判断类型：

| 链接形态                | 识别结果             | 处理方式                                   |
| ----------------------- | -------------------- | ------------------------------------------ |
| `/wiki/{token}`         | Wiki 节点 token      | 先获取 Wiki 节点信息，再取得真实文档 token |
| `/docx/{token}`         | 新版 Docx 文档 token | 直接读取 Docx 文档                         |
| `/docs/{token}`         | 旧版 Docs 文档 token | 走旧版文档读取能力，或提示需要转换         |
| `/drive/folder/{token}` | 云盘文件夹 token     | 不直接作为文档读取，需要用户指定具体文档   |
| 其他飞书链接            | 未知类型             | 不猜测，要求用户提供可读文档链接           |

规则：

- `/wiki/{token}` 不是普通文件夹 token。
- 不要把 Wiki token 当作 Docx token 直接读取。
- 如果链接类型不明确，必须向用户确认。

## 读取流程

优先使用脚本，不要现场重写飞书读取逻辑。

```bash
node ~/.claude/skills/devFlow/scripts/lark_read_docx.mjs \
  --url "https://example.feishu.cn/wiki/xxxx" \
  --section "客户管理" \
  --level 3
```

同一个文档需要读取多个章节时，必须一次性使用
`--sections`，不要对同一个飞书文档并发执行多个读取命令：

```bash
node ~/.claude/skills/devFlow/scripts/lark_read_docx.mjs \
  --url "https://example.feishu.cn/wiki/xxxx" \
  --sections "客户管理,新增客户（create-client）,客户列表查询（client-list）"
```

脚本固定处理：

- 获取 `tenant_access_token`。
- 识别 Wiki / Docx 链接。
- Wiki 节点自动解析真实 Docx token。
- 分页读取 Docx blocks。
- 解析飞书数字枚举 block type。
- 输出标题、block 数、标题目录和可选章节 Markdown。
- 支持 `--sections` 一次抽取多个章节，避免重复拉取同一篇文档。
- 支持 5 分钟本地临时缓存；同一轮写作中重复读取相同文档会复用缓存。需要强制刷新时传
  `--no-cache`。
- 如果 `--level`
  未命中，会自动按标题文本在所有层级中查找；唯一命中时直接返回，多个命中时返回候选项。
- 遇到飞书频控会在脚本内部重试；调用方不要手动并发读取同一文档或反复 sleep 重跑。

需要预检查权限时，先运行：

```bash
node ~/.claude/skills/devFlow/scripts/lark_check_permissions.mjs --url "飞书链接"
```

只有脚本不满足任务时，才临时补充读取逻辑，并把可复用能力沉淀回脚本。

## 输出格式

读取后输出：

- 文档标题
- 文档链接
- 文档类型
- 主要章节
- 原始内容摘要
- 结构化信息
- 待确认项

## 给 page-tech 的上下文格式

如果读取结果要供 `page-tech` 使用，整理成以下结构：

```md
## 飞书文档上下文

### 文档信息

- 标题：
- 链接：
- 类型：

### 页面基础信息

- 页面名称：
- 所属模块：
- 页面类型：

### 页面目标

### 页面范围

- 页面入口：
- 页面结构：
- 页面状态：
- 非目标范围：

### 功能需求

### 字段清单

### 接口信息

### 交互规则

### 权限要求

### 非功能要求

### 待确认项
```

规则：

- 没有在文档中出现的信息不要补全。
- 可以做结构化归纳，但不能改变原文含义。
- 如果原文存在冲突，保留冲突并写入待确认项。
- 如果同一文档要抽取 PRD 多个页面或接口多个小节，先用 `--sections`
  一次读取；只有不同飞书文档之间才可以并行读取。

## Markdown 转换规则

脚本读取飞书 blocks 后，优先转换为 Markdown 风格文本：

- 标题保留层级。
- 段落保留原文。
- 列表保留顺序。
- 表格尽量转成 Markdown 表格。
- 代码块保留语言标识。
- 图片、附件、链接保留名称和 URL。
- 无法解析的 block 类型保留为占位说明。

## 失败处理

常见失败原因：

- 应用没有文档查看权限。
- 应用没有 Wiki 节点访问权限。
- 应用缺少 `docx:document:readonly`。
- 链接不是文档链接。
- Wiki 节点下不是 Docx 文档。
- 文档使用了当前读取逻辑不支持的旧格式。

处理规则：

- 明确说明失败原因和下一步建议。
- 不要根据链接标题或 URL 猜测文档内容。
- 不要继续生成依赖该文档内容的技术方案。

## 安全规则

- 不打印 `FEISHU_APP_SECRET`。
- 不把 access token 写入文件。
- 不把飞书 API 响应中的敏感字段完整贴入最终回复。
- 最终只输出文档内容摘要、结构化上下文和必要的读取状态。
