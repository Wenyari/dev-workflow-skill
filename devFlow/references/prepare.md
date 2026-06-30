# prepare 子命令

`prepare`
用于说明 `devFlow` 使用飞书读写能力前需要配置的环境变量和权限准备。它只负责给用户清晰的准备清单，不负责读取或发布飞书文档。

## 定位

- 输入：用户要求初始化、准备环境，或询问飞书配置。
- 输出：环境变量清单、变量用途、配置建议和后续检查方式。
- 目标：让用户在使用 `lark-read`、`lark-doc` 前知道必须准备什么。

## 后端选择（FEISHU_BACKEND）

飞书读写有两个后端，用环境变量 `FEISHU_BACKEND` 选择，下面的变量需求按后端区分：

- 缺省 / `openapi`：应用身份 + 飞书 Open API（现状）。需要 `FEISHU_APP_ID` /
  `FEISHU_APP_SECRET`，且目标文档 / Wiki 节点要逐一授权给应用。
- `larkcli`：通过 `lark-cli` 以**用户身份**调用同样的 Open API，免去逐篇授权。不使用
  `FEISHU_APP_ID/SECRET`，改由 `lark-cli auth login` 登录授权。可选 `FEISHU_LARKCLI_AS`（默认
  `user`）切换 user / bot 身份，`FEISHU_LARKCLI_BIN` 覆盖 lark-cli 路径。
- `auto`：`lark-cli` 已登录则用 larkcli，否则回退 openapi；两者都不可用时报清晰错误。

## openapi 模式必需环境变量

openapi（或 auto 回退到 openapi）时必须配置：

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
- openapi 模式缺少任一变量时，`lark-read` 和 `lark-doc` 都不能继续执行。
- openapi 模式直接使用飞书 Open API，不需要初始化 `lark-cli`；larkcli 模式不需要 app secret。

## larkcli 模式准备

设 `FEISHU_BACKEND=larkcli`（或 `auto` 且已登录）时：

1. 安装 `lark-cli`（`@larksuite/cli`），确保它在 `PATH` 中（或用 `FEISHU_LARKCLI_BIN` 指定）。
2. 运行 `lark-cli auth login` 完成用户身份授权，`lark-cli auth status` 确认对应身份为 `ready`。
3. 用户需具备所需 scope：读取需要 docx / wiki 读取相关 scope；**发布到 Wiki 还需要 Wiki 节点创建
   scope**。若发布因缺 scope 失败，lark-cli 会返回清晰错误；此时重新 `lark-cli auth login` 扩展
   scope，或本次改用 openapi 应用身份发布。
4. larkcli 模式不需要 `FEISHU_APP_ID/SECRET`；`FEISHU_WIKI_PARENT_NODE_TOKEN` 仍是发布所需的目标参数。

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
