# artifact 层（规划中）

承载跨环节的数据产物，方法论定义两个：

- **未闭环清单**（open-issues）：三个评审环节里所有"没当场闭环的疑点"的统一收口
- **校准清单**（calibration）：自测阶段发现的遗漏 → 归因 → 反哺给一致性检查器扩规则

## 分层原因

未闭环清单、校准清单跨多个 skill 读写：

- `consistency-checker` 输出未认领项 → 未闭环清单
- 自测阶段发现遗漏 → 校准清单
- 校准清单回喂 → 扩展 consistency-checker 规则库

多方读写必须独立成层，不能挂在任何单一 skill 下。

## 现状

- `open-issues/` 未启动
- `calibration/` 未启动

先建 `consistency-checker` 骨架并投产，再启动本层。字段 schema 已由方法论定义，实现时按方法论字段表落地。
