# 代码结构 Review 流程

流程分为 `start`、`review n`、`finalize` 三个阶段。中间态必须落盘，以便大型仓库分次复核。

## start 阶段

### 目标

- 固定 Review 范围和工作目录
- 确认 Graphify 产物可用
- 生成确定性图分析结果
- 将候选项划分为源码复核批次

### 强制步骤

1. 确认 scope：目录、文件清单或整个仓库，禁止自行扩大范围。
2. 确认工作目录，默认建议 `.review/code-structure/<yyyy-mm-dd>/`。
3. 只读检查 Graphify CLI：

```bash
command -v graphify
graphify --version
```

4. `command -v graphify` 无结果或 `graphify --version` 失败时，停止 start 阶段并向用户显示：

```text
未检测到 Graphify。请先执行：

uv tool install graphifyy
graphify install --platform codex

第一条安装 Graphify CLI，第二条安装 Codex 使用的 Graphify Skill。
安装完成后请重新执行 $code-structure-review start <scope>。
```

不得自动执行上述安装命令。不得改用 `graphify codex install`，该命令会修改项目 `AGENTS.md` 并安装常驻 hook。

5. Graphify CLI 可用时，按以下优先级寻找图数据：
   - `graphify-out/.graphify_extract.json`
   - `graphify-out/graph.json`
6. 两者均不存在时，展示将要执行的图谱生成命令和写入目录，得到用户确认后再调用已安装的 `$graphify`。用户拒绝生成时停止，不扫描原始仓库代替图分析。
7. 不得执行 `pip install`、`uv tool install`、`graphify install`、`graphify codex install` 或任何 hook 安装命令。
8. 执行分析器。`<skill-dir>` 必须解析为本 `SKILL.md` 所在目录：

```bash
node <skill-dir>/scripts/analyze-graph.mjs \
  --input <graphify-json> \
  --output <workdir>/structure-analysis.json \
  --scope <scope>
```

9. 读取 `structure-analysis.json`，按以下顺序生成批次：
   - 循环依赖
   - 疑似无调用方
   - 重复职责和共享依赖子图
   - 单一转发封装
   - 高耦合节点
   - 社区边界泄漏
10. 单批建议 10-20 个候选；同一节点涉及的候选尽量放在同一批。
11. 创建 `plan.md`，至少包含：
   - scope
   - Graphify 输入文件及格式
   - 图节点数、边数、候选数
   - 按规则统计
   - 分析器 `warnings` 中的截断或覆盖警告
   - 每批候选编号、节点、源码位置、复核重点
   - 已知图谱限制

### 图谱健康检查

start 阶段必须记录：

- 节点和边是否为空
- 边端点是否都存在
- 是否存在大量缺失 `source_file` 的符号节点
- 输入是否为原始提取结果
- 是否存在有向关系
- 社区字段是否存在

输入为 `graph.json` 时，必须在 `plan.md` 标记：

> 当前使用构建后的图数据，同端点多关系可能已折叠；涉及关系类型的判断需要回查源码。

## review n 阶段

### 目标

定点读取候选源码，把结构候选分类为确认问题、建议保留现状或证据不足。

### 强制步骤

1. 读取 `plan.md` 和 `structure-analysis.json` 中第 n 批候选。
2. 对每个候选读取：
   - 候选节点完整实现
   - 必要的直接调用方
   - 必要的直接被调用方
   - 相关导出、路由或注册文件
   - 直接相关测试
3. 只在判断动态注册、对外使用或模块职责时扩展一跳，不进行无边界仓库扫描。
4. 按候选规则执行 [detector-rules.md](./detector-rules.md) 中的复核清单。
5. 每个候选只能得到以下一种结论：
   - 建议抽象
   - 建议合并
   - 建议拆分
   - 建议移除
   - 建议保留现状
   - 证据不足
6. 确认问题必须包含：
   - 图结构证据
   - 真实源码片段
   - 文件与行号
   - 业务语义判断
   - 建议方向
   - 不处理的影响
   - 误报可能性
7. 写入 `review-<n>.md`，不得修改业务代码。

### 严重度

- 🔴 阻塞：确定形成循环初始化、错误依赖方向、生产故障风险或阻断核心维护工作。
- 🟡 建议：有充分证据的重复职责、高耦合、过度封装或边界泄漏。
- 🟢 提示：风险较低、收益依赖后续演进的结构优化机会。

仅凭中心性、相似度或社区关系不得给出 🔴。

## finalize 阶段

### 强制步骤

1. 根据 `plan.md` 确认所有 `review-<n>.md` 已存在；缺失时停止并询问补跑还是跳过。
2. 合并同一节点或同一根因形成的重复记录。
3. 将结论分为：
   - 确认问题
   - 建议保留现状
   - 证据不足
4. 确认问题按严重度排列，但不改变 review 阶段给出的结论。
5. 使用 [../templates/code-structure-review-report.md](../templates/code-structure-review-report.md) 生成报告。
6. 报告中必须说明 Graphify 无法可靠识别的动态行为和本次未执行的检测。
7. 已有同名报告时必须获得明确覆盖许可。
