# Skill 模板使用说明

`SKILL.md` 是新建 skill 的骨架，五段式头部为**硬约束**。

## 快速上手

```bash
# 复制模板到目标层
cp -r docs/skill-template skills/<layer>/<your-skill-name>
cd skills/<layer>/<your-skill-name>

# 按注释填写五段式
# 删除 <!-- --> 注释
```

## 分层选择

| 层 | 何时选 |
|---|---|
| `skills/review/` | 服务评审环节，例如 PRD、UI、产品规范和代码结构 Review |
| `skills/execution/` | 服务于开发环节（写代码、写方案、还原视觉） |

## 必填字段释义

- **服务对齐边**：从模板受控值中选 1 条；跨多条时选主战场。
- **现状分级**：使用模板受控值；无法表达时先提交 ADR。
- **AI 形态**：使用模板受控值；工具型 skill 填“不适用”。
- **主战场**：选择能力主要发生的研发阶段。

## 常见问答

**Q：工具型 skill（如飞书发布、环境准备）也要填对齐边诊断吗？**
A：填"不涉及对齐边 / 不适用 / 跨环节"。表格结构保留，不省略。

**Q：一个 skill 可以服务多条对齐边吗？**
A：可以，但主战场只能填 1 个。多条边写在"这个 skill 解决什么问题"里说明。

**Q：detailed 规则一定要放在 SKILL.md 里吗？**
A：不。可以拆到 `references/`（推荐给复杂 skill）。SKILL.md 只保留五段式 + 索引。
