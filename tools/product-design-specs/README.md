# tools/product-design-specs

产品设计规范单一事实源。为需要引用「产品给出的字段、校验、展示、交互规范」的 skill 提供统一读取入口。

## 消费者

| skill | 用途 |
|---|---|
| `skills/execution/devFlow/`（frontend 域） | 写 `page-tech.md` 时按字段类型引用规范 |
| `skills/execution/devFlow/`（requirement 域） | `prd-review` 判断 C3 冲突（与产品设计规范冲突） |
| `skills/review/frontend-code-review/` | review 前端业务代码是否遵循产品设计规范 |

新增消费者时，遵循「按字段类型 lazy load」的读取约束，不要一次性加载全部规范。

## 目录

```
tools/product-design-specs/
├── README.md                 # 本文件
├── index.md                  # 字段类型 → 规范分册 路由
├── field-common.md           # 通用规范：布局、必填、校验触发、错误提示、只读、列表
├── fields-id-code.md         # ID、流水号、编码
├── fields-text.md            # 短文本、长文本、富文本
├── fields-number-date.md     # 数字、金额、日期、时间
├── fields-selectors.md       # 下拉选择、级联选择
├── fields-relation.md        # 跨表选取、用户选择、部门选择
├── fields-complex.md         # 子表单、文件上传
└── interaction.md            # 默认值、空状态、操作、反馈、弹窗、文案、中断恢复
```

## 读取约束（硬要求）

1. **先读 `index.md`**，根据当前场景涉及的字段类型和交互能力判断要加载哪些分册。
2. **任何字段场景默认先读 `field-common.md`**。
3. **只读当前相关的分册**，不要一次性加载全部规范文件。
4. **涉及默认值、空状态、操作反馈、弹窗、文案或中断恢复时，读 `interaction.md`**。
5. **字段类型无法判断时不套用规范**，写入待确认项。

## 引用路径约定

skill 引用本 tool 内文件时，路径统一从仓库根开始写：

```
tools/product-design-specs/index.md
tools/product-design-specs/field-common.md
```

不使用相对路径。约定同步在 CONTRIBUTING.md §6。

## 变更规则

- 本目录内容是 devFlow 与 frontend-code-review 共同依赖的事实源，任何改动都会同时影响两侧。
- 增删字段类型或改动分册命名时，必须同步更新 `index.md` 的路由表和所有消费者 skill 内引用规范的文档。
- 破坏性变更（删分册、重命名分册、改约束语义）在 `CHANGELOG.md` 标注。
