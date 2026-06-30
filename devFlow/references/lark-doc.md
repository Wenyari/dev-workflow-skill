# lark-doc 子命令

`lark-doc`
用于把技术文档落地到飞书 Wiki 父节点下。它负责发布流程，不负责生成页面技术方案正文；正文生成应由
`page-tech` 等子命令完成。

## 定位

- 输入：Markdown 文档、已生成的技术方案正文，或用户要求先生成再发布的文档内容。
- 输出：飞书 Wiki 子文档链接。
- 默认目标：环境变量 `FEISHU_WIKI_PARENT_NODE_TOKEN` 指向的 Wiki 父节点。

## 环境变量

必须从环境变量读取配置：

```text
FEISHU_APP_ID
FEISHU_APP_SECRET
FEISHU_WIKI_PARENT_NODE_TOKEN
```

规则：

- 不要把 app secret 写入 Skill、仓库文件、技术方案正文或日志。
- 不要在最终回复中回显 secret。
- 如果任一变量缺失，停止发布并告诉用户缺少哪个变量。
- 飞书发布默认走 Open API（应用身份），不需要初始化 `lark-cli`；设 `FEISHU_BACKEND=larkcli` 可改用 lark-cli 用户身份，`auto` 自动择优。仅 larkcli 模式需先 `lark-cli auth login`；该模式下发布到 Wiki 需用户具备 Wiki 节点创建 scope，缺失时按 `prepare` 回退 openapi。

## 发布流程

优先使用脚本，不要现场重写发布逻辑。

```bash
node .agent/skills/devFlow/scripts/lark_publish_doc.mjs \
  --title "客户管理页面开发技术方案" \
  --file /path/to/document.md
```

也可以通过 stdin 传入 Markdown：

```bash
node .agent/skills/devFlow/scripts/lark_publish_doc.mjs --title "标题" < document.md
```

脚本固定处理：

1. 获取 `tenant_access_token`。
2. 使用 `FEISHU_WIKI_PARENT_NODE_TOKEN` 获取 Wiki 父节点信息。
3. 在 Wiki 父节点下创建新的 Docx 子文档。
4. 将 Markdown 转换为飞书 Docx blocks。
5. 按 40 个 blocks 一批写入，规避飞书单次 `children` 最大 50 的限制。
6. 写入后读取文档前部 blocks 校验。
7. 输出标题、链接、node token、doc token、写入 block 数。

发布前需要单独检查父节点权限时运行：

```bash
node .agent/skills/devFlow/scripts/lark_check_permissions.mjs
```

## Wiki 节点规则

- 用户提供的 `/wiki/{token}`
  链接中的 token 应视为 Wiki 节点 token，不要当作普通云盘 `folder_token`。
- 默认父节点 token 来自 `FEISHU_WIKI_PARENT_NODE_TOKEN`。
- 如果用户提供了新的 Wiki 链接，本次发布优先使用用户提供的 token。
- 如果应用身份没有权限访问父节点，不要绕过；提示用户需要给应用授权该 Wiki 节点，或改用用户身份授权。

## 文档标题规则

标题优先级：

1. 用户明确给出的标题。
2. 技术方案中的一级标题。
3. 根据页面名称生成，例如 `{页面名称} 页面开发技术方案`。
4. 如果仍无法确定，向用户确认标题。

标题要求：

- 简短、可搜索。
- 不包含密钥、token 或临时调试信息。

## Markdown 转 Docx blocks 规则

`scripts/markdown_to_lark_blocks.mjs` 必须支持：

- 一级到三级标题。
- 普通段落。
- 无序列表。
- 有序列表。
- 表格。
- 代码块。
- 引用 Mermaid 源码的代码块。

处理规则：

- Mermaid 代码块必须保留源码，便于后续修改。
- 页面结构和组件拆分图推荐使用 `flowchart LR`，发布时保留 Mermaid 源码。
- `mindmap` 只作为纯概念层级图的可选语法，不作为页面技术方案默认图。
- 如果文档包含由 `design-lark-chart`
  生成的飞书画板链接，应在对应位置插入链接说明。
- 暂不支持的复杂 Markdown 语法不要丢弃，保留为普通文本或代码块，并在发布结果中说明。
- Markdown 表格可先降级为普通文本，除非用户明确要求飞书原生表格。

## 图表规则

- `lark-doc` 不负责渲染 Mermaid。
- 需要图形化落地到飞书时，先使用 `design-lark-chart` 生成图形产物，再由
  `lark-doc` 在文档中引用。
- 如果只有 Mermaid 源码，可以直接写入代码块。
- 如果 `design-lark-chart` 或飞书画板链路提示需要
  `lark-cli`，再按该 Skill 的要求初始化；不要为了普通文档读写提前初始化。

## 权限失败处理

常见失败原因：

- 应用没有 Wiki 父节点访问权限。
- 应用缺少云文档或 Wiki 相关 API 权限。
- 父节点 token 不是 Wiki 节点 token。
- 使用了应用身份，但目标空间只允许用户身份写入。
- 单次写入 children 超过 50。发布脚本已按 40 分批，手工调用时必须遵守。

处理规则：

- 明确说明失败原因和下一步处理建议。
- 不要改用其他未知目录。
- 不要创建到默认根目录。

## 安全规则

- 不打印 `FEISHU_APP_SECRET`。
- 不把 access token 写入文件。
- 不把飞书 API 响应中的敏感字段完整贴入最终回复。
- 最终只返回文档链接、标题和必要的发布状态。
