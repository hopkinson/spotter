---
name: spot-plan
description: 澄清新需求、交互或行为边界，按项目规则确认可验收的方案。显式调用时走两次确认。Use for Spotter requirement discovery and design discussion.
---

先读取 `../../bundled-skills/spot-grilling/SKILL.md`（未找到时退回本机 `spot-grilling`），它是 `grill-me` 的实际工作流。找不到就报告缺失并停在需求阶段。

1. 先查项目里已有的入口、组件和约束。事实靠检查，影响行为的取舍才问用户。
2. 一轮只问当前能决定的事项，优先调宿主选择题工具；纯文本提问每题限两行（一句话问题 + 推荐答案），不写多段铺垫。
3. 用 `spot-before-after-sketch` 写一张用户看得懂的改前/改后草图，配简短的验收场景。按项目规则选择确认路径。中风险任务把 `spot-ponytail` 的最小方案合进这次展示，等一次开工确认；澄清问题的回答用来确定范围。
4. 完整路径先展示需求和验收标准，等第一次确认。然后用 `spot-ponytail` 展示核心改动对比草图和测试用例两列表（`测什么情况｜应该看到什么结果`，最多 4 行），等第二次确认后实施。用户显式调用本技能时走完整路径。
