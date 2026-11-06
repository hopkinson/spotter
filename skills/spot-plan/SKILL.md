---
name: spot-plan
description: 澄清新需求、交互或行为边界，交付可验收的需求并停在第一次确认。Use for Spotter requirement discovery and design discussion.
---

先加载 `grilling`，它是 `grill-me` 的实际工作流。找不到就报告缺失并停在需求阶段。

1. 先查项目里已有的入口、组件和约束。事实靠检查，影响行为的取舍才问用户。
2. 一轮只问当前能决定的事项，给出推荐答案。页面或流程的差异能用图说清时，用 `spot-before-after-sketch`，两块分开画。只看到片段时标记「改前（待确认）」。
3. 定稿列出行为、边界和可执行的验收场景。每个关键场景至少给输入、动作和预期结果。
4. 等用户确认这一版需求。确认后用 `spot-ponytail` 拟实施和测试方案，再等第二次确认。第一次确认之后的动作是出方案。
