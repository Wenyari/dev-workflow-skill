# 原生 CSS 草案模式

figmaSync plan 阶段生成 `figma-plan.css`，用于让用户在编码前审核样式结构。

## 1. 页面根与区块 class

```css
.client-page {
  min-height: 100%;
  background: var(--fill-neutral-primary);
}

.client-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-16);
}
```

## 2. Apex UI 样式边界

能通过 Apex UI props 表达的样式不写 CSS 覆盖。先判断样式归属，再决定是否进入
`figma-plan.css`。

```tsx
<Button
  type="primary"
  size="medium"
/>
```

### 正确：组件自管样式交给 props

```tsx
<Tag
  variant="filled"
  color="error"
  size="sm"
/>

<Input
  size="small"
  status="error"
/>

<Tabs
  type="capsule"
  activeKey={activeKey}
/>

<Table
  size="large"
  scroll={{ x: 'fill-content' }}
/>
```

### 错误：把组件内部状态色写进页面 CSS

```css
/* 错误：Tag 的 error 颜色应由 <Tag color="error" /> 控制 */
.metric-delta {
  background: var(--fill-error-alpha-secondary);
  color: var(--text-error-primary);
}

/* 错误：Button 的 primary 颜色应由 <Button type="primary" /> 控制 */
.toolbar-submit {
  background: var(--fill-brand-primary);
  color: var(--text-neutral-primary);
}

/* 错误：Input 的 error 边框应由 <Input status="error" /> 控制 */
.filter-input {
  border-color: var(--stroke-error-primary);
}
```

### 正确：页面 CSS 只承载布局

```css
.client-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-12);
}

.metric-delta {
  position: absolute;
  right: var(--spacing-12);
  bottom: var(--spacing-12);
}
```

## 3. 未命中变量

无法匹配 `/theme` 的样式必须写 TODO 注释，等待用户审核。

```css
/* TODO(figmaSync): unmatched color #123456 from node 10:18; needs user confirmation */
.client-page__custom-card {
  border-color: #123456;
}
```

## 4. 状态样式

状态 class 使用明确命名，不生成运行时样式函数。

```css
.client-page__row {
  background: var(--fill-neutral-primary);
}

.client-page__row:hover {
  background: var(--fill-neutral-secondary);
}

.client-page__row.is-selected {
  background: var(--fill-brand-tertiary);
}
```

## 5. 文件流转

- plan 阶段：生成 `figma-plan.css`，只做审核。
- apply 阶段：把审核通过的 CSS 草案迁移为正式 CSS 文件。
- 禁止把 CSS 草案绕过审核直接接入业务代码。
