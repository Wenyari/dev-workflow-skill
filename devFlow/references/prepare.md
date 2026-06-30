# prepare 子命令

`prepare`
用于说明 `devFlow` 使用飞书读写能力前需要配置的环境变量和权限准备。它只负责给用户清晰的准备清单，不负责读取或发布飞书文档。

## 定位

- 输入：用户要求初始化、准备环境，或询问飞书配置。
- 输出：环境变量清单、变量用途、配置建议和后续检查方式。
- 目标：让用户在使用 `lark-read`、`lark-doc` 前知道必须准备什么。

## 必需环境变量

读取飞书文档和发布飞书文档都必须配置：

```text
FEISHU_APP_ID
FEISHU_APP_SECRET
```

用途：

- `FEISHU_APP_ID`：飞书自建应用的 app id。
- `FEISHU_APP_SECRET`：飞书自建应用的 app secret，用于换取 tenant access token。

规则：

- 不要把 `FEISHU_APP_SECRET` 写入 Skill、仓库文件、技术方案正文或日志。
- 不要在最终回复中回显 `FEISHU_APP_SECRET`。
- 如果缺少任一变量，`lark-read` 和 `lark-doc` 都不能继续执行。
- 普通飞书文档读写直接使用飞书 Open API，不需要初始化 `lark-cli`。

## 发布 Wiki 文档所需变量

发布到飞书 Wiki 父节点时，还必须配置：

```text
FEISHU_WIKI_PARENT_NODE_TOKEN
```

用途：

- `FEISHU_WIKI_PARENT_NODE_TOKEN`：默认发布目标的 Wiki 父节点 token。

规则：

- 只读取飞书文档时不需要该变量。
- 使用 `lark-doc` 发布文档时需要该变量，除非用户本次明确提供其他 Wiki 父节点链接。
- `/wiki/{token}` 中的 token 是 Wiki 节点 token，不是云盘文件夹 token。
- 如果应用身份没有父节点权限，不要改用未知目录；提示用户给应用授权该 Wiki 节点。

## 建议配置方式

建议把变量配置在本机 shell 环境、CI secret 或 Codex 运行环境中，不要提交到仓库。

本机全局配置优先写入：

```text
/Users/wenjin/.zshenv
```

`.zshenv` 会在 zsh 启动时读取，适合给本机终端、Codex 运行环境和 Node 脚本提供全局环境变量。

示例：

```bash
# /Users/wenjin/.zshenv
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="***"
export FEISHU_WIKI_PARENT_NODE_TOKEN="xxx"
```

如果只读取飞书文档：

```bash
# /Users/wenjin/.zshenv
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="***"
```

修改后，新启动的 zsh 会自动读取；当前终端如需立即生效，可以执行：

```bash
source /Users/wenjin/.zshenv
```

## 权限准备

飞书自建应用需要具备对应权限，并且目标文档或 Wiki 节点需要授权给该应用。

读取文档通常需要：

- 文档查看权限。
- Docx 文档读取相关 API 权限。
- 如果读取 Wiki 链接，还需要 Wiki 节点访问权限。

发布文档通常需要：

- Wiki 父节点访问权限。
- 创建 Wiki 子文档权限。
- Docx 文档写入相关 API 权限。

## 可选检查

检查目标文档或 Wiki 父节点权限时，优先使用脚本：

```bash
node .agent/skills/devFlow/scripts/lark_check_permissions.mjs --url "飞书链接"
```

检查默认 Wiki 父节点权限时：

```bash
node .agent/skills/devFlow/scripts/lark_check_permissions.mjs
```

## 输出要求

执行 `prepare` 时，回复用户：

1. 读取和发布分别需要哪些变量。
2. 哪些变量是必需，哪些只在发布 Wiki 时需要。
3. 如何配置变量，不要求写入仓库。
4. 普通飞书文档读写不需要初始化 `lark-cli`。
5. 如果后续要读文档或发布文档，应先确认应用权限和文档授权。
