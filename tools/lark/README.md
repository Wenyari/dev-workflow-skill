# tools/lark

飞书能力共享工具。为 devFlow 及后续 skill（如 consistency-checker 读飞书 PRD）提供飞书 Open API 封装。

## 目录

```
tools/lark/
├── README.md
├── scripts/
│   ├── lark_api.mjs                # 核心 Open API 封装（token / request）
│   ├── lark_api.test.mjs
│   ├── lark_read_docx.mjs          # 读 Wiki / Docx，支持章节抽取和缓存
│   ├── lark_publish_doc.mjs        # 发布 Markdown 到 Wiki 子文档
│   ├── lark_check_permissions.mjs  # 检查目标文档 / 父节点访问权限
│   └── markdown_to_lark_blocks.mjs # Markdown → Docx blocks JSON
└── references/
    ├── prepare.md                  # 环境变量配置说明
    ├── lark-read.md                # 读飞书文档规则
    └── lark-doc.md                 # 写飞书文档规则
```

## 部署路径约定

skill / tool 打包部署时保持仓库路径：`.agent/tools/lark/scripts/`。

## 输入输出

### `lark_read_docx.mjs`
```
node .agent/tools/lark/scripts/lark_read_docx.mjs --url <飞书链接> [--section <标题>] [--level <层级>]
```
输出：文档全文或指定章节内容。

### `lark_publish_doc.mjs`
```
node .agent/tools/lark/scripts/lark_publish_doc.mjs --title <标题> --file <path>
node .agent/tools/lark/scripts/lark_publish_doc.mjs --title <标题> < document.md
```
输出：新建文档链接、node token、doc token、写入 block 数。

### `lark_check_permissions.mjs`
```
node .agent/tools/lark/scripts/lark_check_permissions.mjs [--url <飞书链接>]
```
输出：canRead / canWrite / 错误信息。

### `markdown_to_lark_blocks.mjs`
```
node .agent/tools/lark/scripts/markdown_to_lark_blocks.mjs --file <path>
```
输出：飞书 Docx blocks JSON。

## 环境变量

- `FEISHU_APP_ID` — 飞书应用 ID
- `FEISHU_APP_SECRET` — 飞书应用密钥
- `FEISHU_WIKI_PARENT_NODE_TOKEN` — Wiki 父节点 token（发布必需）

详见 [references/prepare.md](./references/prepare.md)。

## 自检

```
node --test tools/lark/scripts/lark_api.test.mjs
```

## 消费者

- `skills/execution/devFlow/` — `prepare` / `lark-read` / `lark-doc` 子命令
- `skills/review/consistency-checker/`（规划中）— 读飞书 PRD
- 未来其他需要飞书读写的 skill

## 安全约束

- 所有密钥只从环境变量读，不写死
- 脚本 stdout 不输出密钥
- 错误信息不泄露内部路径
