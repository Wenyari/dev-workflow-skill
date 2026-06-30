# prepare 子命令

`prepare` 说明 backendFlow 使用飞书读写前需要配置的环境变量。只给准备清单，不读写飞书。环境变量与 devFlow 共用同一套。

## 必需环境变量

读取和发布都必须配置：

```text
FEISHU_APP_ID
FEISHU_APP_SECRET
```

规则：

- 不要把 `FEISHU_APP_SECRET` 写入 skill、仓库文件、方案正文或日志，也不在回复中回显。
- 缺任一变量时 `lark-read` / `lark-doc` 不能执行。
- 普通飞书文档读写直接用飞书 Open API，不需要初始化 `lark-cli`。

## 发布 Wiki 所需变量

发布到飞书 Wiki 父节点时还需：

```text
FEISHU_WIKI_PARENT_NODE_TOKEN
```

只读取文档时不需要该变量；发布时除非用户本次提供其他 Wiki 父节点链接。

## 可选权限检查

复用 devFlow 的权限检查脚本：

```bash
node ~/.claude/skills/devFlow/scripts/lark_check_permissions.mjs --url "飞书链接"
```

## 输出要求

回复用户：读取与发布分别需要哪些变量、哪些必需哪些仅发布时需要、如何配置（不写入仓库）、普通读写不需
`lark-cli`、后续读写前先确认应用权限与文档授权。
