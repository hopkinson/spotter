---
name: spot-update
description: 按需检查 Spotter 随包技能的上游版本和许可，报告升级候选。Use when asked to 检查技能更新.
---

读取相对本技能目录的 `../../bundled-skills/SOURCES.md`，按里面的上游和锁定版本检查。Git 快照可用 `git ls-remote <上游地址> HEAD`，版本发布用上游 release 或包版本。上游不可达时报告该项未核实。

只报告有变化的技能、当前版本、候选版本、关键变化和许可状态。升级前在隔离环境验证编码助手能加载候选版，并回放相关 Spotter 场景。用户确认具体版本后再替换快照，同步更新来源和许可证。检查阶段不安装新版。
