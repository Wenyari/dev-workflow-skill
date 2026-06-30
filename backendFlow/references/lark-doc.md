# lark-doc 子命令

`lark-doc` 把后端技术方案发布到飞书 Wiki 父节点下。复用 devFlow 脚本，不复制实现。

## 执行规则

1. 先生成完整 Markdown 正文，再发布；不要边写方案边拼飞书 blocks。
2. 默认使用 devFlow 脚本发布：

   ```bash
   node ~/.claude/skills/devFlow/scripts/lark_publish_doc.mjs --file <markdown-file> --title "<文档标题>"
   ```

3. 用环境变量读取飞书配置，不在 skill 或仓库写密钥。
4. 默认使用 `FEISHU_WIKI_PARENT_NODE_TOKEN` 作为父节点，除非用户本次提供其他 Wiki 父节点链接（脚本
   `--parent` 参数）。
5. 分节用原生标题层级，由飞书标题自动编号，不手写序号。
6. 创建 Wiki 子文档并写入正文后，返回飞书文档链接。

## 标题自动编号说明

飞书标题序号依赖文档的“标题自动序号”显示能力。若发布后未显示蓝色序号，提示用户在文档设置中开启，不通过手写序号绕过。
