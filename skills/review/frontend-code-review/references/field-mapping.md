# 字段类型映射规则

Review 的前提是知道「代码里这个字段是什么类型」，才能去查 `tools/product-design-specs/` 的对应分册。

本文件规定 Agent 如何从代码识别字段类型。**推断不出来时不套用规范**，直接标为「待确认」——这是本 skill 最重要的兜底原则。

---

## 三层启发信号

按可靠性从高到低：

### 第一层：组件类型（最可靠）

组件本身表明字段类型：

| 组件 | 强指向类型 | 引用分册 |
|---|---|---|
| `<DatePicker>` `<TimePicker>` `<DateRangePicker>` | 日期/时间 | `fields-number-date.md` |
| `<InputNumber>` `<PriceInput>` | 数字/金额 | `fields-number-date.md` |
| `<Select>` `<Radio>` `<Checkbox>` | 下拉/单选/多选 | `fields-selectors.md` |
| `<Cascader>` `<TreeSelect>` | 级联/树形 | `fields-selectors.md` |
| `<Upload>` `<Uploader>` | 文件上传 | `fields-complex.md` |
| `<RichTextEditor>` `<Editor>` | 富文本 | `fields-text.md` |
| `<Textarea>` | 长文本 | `fields-text.md` |
| `<UserSelector>` `<UserPicker>` | 用户选择 | `fields-relation.md` |
| `<DeptSelector>` `<DeptPicker>` | 部门选择 | `fields-relation.md` |
| `<Table>` + `editable` | 子表单 | `fields-complex.md` |

以上映射适用于常见组件库（Ant Design、Element Plus、Arco、TDesign、自研库常见命名）。组件库不同时用相同语义对齐。

### 第二层：props 与类型限制（较可靠）

组件是通用 `<Input>` 时看 props：

| props 模式 | 推断 |
|---|---|
| `type="tel"` / `type="phone"` / `maxLength={11}` + `name=phone/mobile` | 手机号 → `fields-text.md` |
| `type="email"` / `name=email` | 邮箱 → `fields-text.md` |
| `type="number"` | 数字（需二次判断是否金额）→ `fields-number-date.md` |
| `type="password"` | 密码（本 skill 不覆盖，跳过） |
| `maxLength={18}` + `name` 含 `idCard/idNumber` | 身份证号 → `fields-text.md` |
| `readOnly` / `disabled` | 只读态（查 `field-common.md` 只读节） |

### 第三层：命名启发（最弱，仅辅助）

变量名/字段名/label 文案：

| 命名信号 | 候选类型 | 是否直接确定 |
|---|---|---|
| `phone` `mobile` `tel` | 手机号 | 需组件或 label 佐证 |
| `email` `mail` | 邮箱 | 通常可确定 |
| `amount` `price` `money` `fee` `cost` | 金额 | 需 label 佐证 |
| `count` `quantity` `qty` `num` | 数量 | 需 label 佐证 |
| `rate` `ratio` `percentage` | 比例/百分比 | 需 label 佐证 |
| `date` `time` `startAt` `endAt` `createdAt` | 日期/时间 | 通常可确定 |
| `remark` `note` `description` `desc` | 长文本 | 需组件佐证 |
| `id` `code` `no` `sn` `serial` | ID/流水号/编码 | 需 label 佐证是否系统生成 |
| `department` `dept` `org` | 部门 | 需组件佐证 |
| `user` `manager` `owner` `creator` | 用户 | 需组件佐证 |

---

## 组合判断

**三层信号至少有两层一致才可确定**。例如：

- `<Input name="mobile" maxLength={11} />` + label 是「手机号」→ 手机号，✅ 可确定
- `<Input name="phone" />` 无 maxLength、无 label → 手机号候选，⚠️ 需查上下文
- `<Input name="foo" />` 无任何指向 → **待确认**，不套用规范

## 上下文加权

同一表单/组件内的其他字段可以互相佐证：

- 一个表单里已有 `合同名称` `合同金额` `合同日期`，则出现 `编号` 字段大概率是「合同 ID」而非普通编码
- 一个列表页表头有 `姓名` `工号` `部门`，则出现 `选择人` 字段大概率是「用户选择」而非跨表选取

## 交互能力识别

除字段外，还要识别页面级交互，映射到 `interaction.md`：

| 代码信号 | 对应 interaction 章节 |
|---|---|
| `useEffect` 内设置默认值 / `defaultValues` / `initialValues` | 默认值设计 |
| 列表为空时 render 的 `<Empty>` / `<NoData>` / 自定义空态 | 空状态设计 |
| `Modal.confirm` / `useConfirm` / `二次确认` | 风险操作二次确认 |
| `message.success/error` / `toast/notify` / `useToast` | 操作反馈 |
| `<Modal>` / `<Drawer>` / `<Dialog>` | 弹窗规范 |
| `beforeunload` / 草稿保存 / `localStorage` 存表单 | 中断恢复 |

## 待确认清单的落盘格式

推断不出的字段写入 `待确认` 清单，每条包含：

```markdown
- 位置：`src/pages/foo/Bar.tsx:42`
- 代码片段：`<Input name="mystery" />`
- 已知信号：组件是通用 Input，label 是「附加信息」
- 推测候选：短文本 / 编码 / 备注（无法排除）
- 缺失信息：需要产品或开发说明该字段的业务含义与录入方式
```

**不要为了凑数强行套用规范**——套错了比不查更糟。

---

## 边界

- 本文件只服务字段类型识别，不判断字段规范本身是否合理
- 组件命名约定各团队不同，本文件列出的组件名以主流库为准；发现团队自研命名不匹配时，写入待确认清单并在报告里提示维护者补充映射规则
