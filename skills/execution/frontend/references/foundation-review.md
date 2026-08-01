# foundation-review 阶段

`foundation-review` 是 `page-build` 的收尾门禁。它在写入和最小验证完成后复核实际改动是否符合确认计划，再生成页面基建事实快照，供 Human 审核和后续视觉阶段使用。

## 定位

- 输入：用户确认的文件计划、目标页面目录、相关 service 文件、Git diff、最小验证结果和可选 `contract-report.md`。
- 输出：Foundation Review 结论和 `foundation-summary.md`。
- 性质：Review 结论是阶段门禁；机器生成快照不是事实本身。
- 最终事实：真实代码文件。

## Review 顺序

1. 对照用户确认的文件计划检查实际新增和修改文件。
2. 确认 route、components、service、types、constants 等计划内基建实际存在。
3. 检查是否出现计划外业务文件、配置文件、锁文件或生成文件修改。
4. 记录最小验证的命令、结果和未执行项；退出码为 0 不代表未被断言的行为已经验证。
5. 检查 `contract-report.md` 中的阻塞项是否已经消除，未消除则不得通过。
6. 基于最终真实代码生成 `foundation-summary.md`，再检查快照内容是否与源码一致。

## 结论

- `通过`：实际文件未超出确认范围，必需基建存在，最小验证通过且无未消除阻塞项。
- `阻塞`：缺少计划内文件、出现未确认修改、验证失败或契约阻塞项未消除。
- 解析盲区：可以生成快照，但必须在结论中标记，不能静默视为通过。

Foundation Review 阻塞时保留实际 diff 和验证结果，不进入视觉交接。

## 快照生成规则

默认使用脚本：

```bash
node <agent-root>/skills/execution/frontend/scripts/generate_foundation_summary.mjs --route-dir src/routes/<feature>/<page>
```

可选指定 service：

```bash
node <agent-root>/skills/execution/frontend/scripts/generate_foundation_summary.mjs \
  --route-dir src/routes/<feature>/<page> \
  --service src/services/<feature>/<page>.ts
```

规则：

- `foundation-summary.md` 禁止人工编辑。
- 每次进入视觉交接前必须重新生成或重新扫描。
- 如果快照和上一次不一致，必须提示 Human 确认影响。
- 快照只能汇总真实代码，不得补造组件、接口、状态或类型。
- 快照不替代源码；与源码冲突时以源码为准。

## 输出位置

默认写入：

```text
src/routes/<feature>/<page>/foundation-summary.md
```

文件顶部必须包含：

```html
<!-- AUTO-GENERATED. Do not edit. Regenerate from source files. -->
```

## 内容要求

必须包含：

- route 文件。
- components 文件。
- service 文件。
- types 文件。
- constants 文件。
- 组件 props。
- service 函数签名。
- types 导出。
- constants 导出。
- figma-sync 允许修改范围。
- figma-sync 禁止修改范围。

## 视觉阶段允许修改范围

- 目标页面或目标组件的布局。
- CSS 文件和 className 绑定。
- Apex UI 组件选型和 props。
- 局部展示结构。
- `PLAN.md` 和 `figma-plan.css`。

## 视觉阶段禁止修改范围

- 路由路径。
- service 契约。
- API 请求基础封装。
- 类型语义。
- 页面核心状态模型。
- 业务组件边界。
- 权限逻辑。
- Wujie bridge。
- `src/routeTree.gen.ts`。

## 失败处理

- 目标 route 目录不存在：阻塞，先执行 `page-build` 或确认轻量 plan。
- 无法识别 service：允许生成快照，但必须写入待确认。
- 无法解析组件 props：允许生成文件清单，但必须标记解析盲区。
- 发现上次快照变化：列出变化，让 Human 确认后再进入视觉交接。
