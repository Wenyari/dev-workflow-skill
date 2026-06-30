# L0/L1 轻量流程

轻量流程用于小范围、低风险需求，避免日常修复被强制拖入完整文档链路。

## L0 快速协作

适用：

- 文案修正。
- spacing、颜色变量替换。
- 单字段展示。
- 明显类型错误。
- 单文件小修。

规则：

- 不生成 `page-tech.md`。
- 不生成 `contract-report.md`。
- 不生成 `foundation-summary.md`。
- 不进入 figmaSync。
- 读代码、复述最小计划、等待确认、修改、验证、总结。

## L1 轻量流程

适用：

- 现有页面单组件改动。
- 单接口接入。
- 小弹窗。
- 小筛选项。
- 小范围 loading、空态、错误态。

规则：

- 通常不生成 `page-tech.md`。
- 不生成 `contract-report.md`。
- 不生成 `foundation-summary.md`。
- Mini Plan 可以保留在对话中，不强制落 Markdown。
- 如果过程中发现影响路由、多个接口、核心状态或公共组件，必须升档到 L2/L3。

## Mini Plan 内容

Mini Plan 必须包含：

- 要改什么。
- 涉及哪些文件。
- 不改什么。
- 验证方式。

可使用模板：

```text
assets/templates/mini-plan-l0.md
assets/templates/mini-plan-l1.md
```
