# PLAN 示例片段

## 2. 组件与资产映射决策

| Figma 节点 | nodeId | 目标实现                                  | 复用类型 | 是否需要 CSS | 备注             |
| ---------- | ------ | ----------------------------------------- | -------- | ------------ | ---------------- |
| CTA        | 1:3    | `<Button type="primary" size="medium" />` | Apex UI  | 否           | props 可覆盖视觉 |
| Header     | 1:4    | 自定义 header                             | 无       | 是           | 页面私有布局     |

## 3. CSS 变量映射表

| 来源（Figma）                          | 类型  | CSS variable             | /theme 路径                       | 原始值      | 命中方式                | nodeId | designContextStatus |
| -------------------------------------- | ----- | ------------------------ | --------------------------------- | ----------- | ----------------------- | ------ | ------------------- |
| `var(--fill-neutral-primary, #090A0B)` | color | `--fill-neutral-primary` | `foundation.fill.neutral.primary` | `{grey.14}` | Fast Path 0 (variables) | 1:2    | OK                  |

## 4. CSS 草案审核

CSS 草案文件：`./figma-plan.css`

```css
.welcome-page {
  min-height: 100%;
  background: var(--fill-neutral-primary);
}
```

## 5. 样式落地清单

### Level 1（组件局部 CSS）

- `.welcome-page`：页面根容器。

### Level 2（扩展 common component）

- （无）

### Level 3（建议新增 /theme 变量）

- （无）
