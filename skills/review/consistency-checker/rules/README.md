# 规则库

一致性检查器的规则外置目录。改规则不改 skill 代码。

## 计划文件

- `operation-keywords.json` — 操作类关键词表（增/删/改/查 · 导入/导出 · 批量）
- `permission-patterns.json` — 权限描述提取正则
- `exception-patterns.json` — 异常态描述提取正则
- `state-coverage.json` — 状态覆盖检查项（空态 / 加载 / 错误 / 权限拒绝 / 超时）
- `boundary-values.json` — 边界值检查项（极限 / 空值 / 特殊字符 / 多语言溢出）
- `semantic-glossary.json` — 语义词表（同名不同义 / 措辞对应）

## Schema 约定（TBD）

每个规则文件的 JSON schema 在 skill 实现开始时定义。当前仅占位。
