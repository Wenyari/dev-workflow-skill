# lark-read 子命令

`lark-read` 读取飞书云文档 / Wiki，提取内容作为后端方案上下文。复用 devFlow 脚本，不复制实现。

## 执行规则

1. 默认使用 devFlow 脚本读取：

   ```bash
   node .agent/skills/devFlow/scripts/lark_read_docx.mjs --url "飞书链接"
   ```

2. 用环境变量读取飞书配置，不在 skill 或仓库写密钥。
3. 判断链接类型：Wiki 节点、Docx 文档、旧版 Docs。
4. 读取内容并整理成结构化上下文。
5. 供 `api-tech` 使用时，至少输出：服务 / 模块目标、接口需求、字段 / 数据结构、业务流程、错误与边界、待确认项。
6. 读取失败时停止依赖该文档的方案生成，并说明失败原因。
