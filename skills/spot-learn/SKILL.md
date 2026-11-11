---
name: spot-learn
description: 提取开发经验与踩坑教训，沉淀为项目规则或全局偏好。Use to persist reusable engineering rules, bug patterns, or platform conventions.
---

用本目录的 `scripts/learn.mjs` 记录规则或查看已沉淀知识。

### 规则存储位置
- **项目级（默认）**：优先写入当前项目 `.agents/rules/spot-workflow.md` 或 `rules/AGENTS.md`（团队/仓库隔离生效）。
- **全局级**：写入全局配置 `~/.spotter/rules.md` 或用户全局规则（跨项目共享生效）。也可通过 `--target <文件路径>` 显式指定。

### 核心操作与交互

1. **自动提炼 + 零心智确认（对话中）**：
   - 当遇到用户纠偏（如“不要 X，改为 Y”）、深坑排查成功（连续定位失败后解决/踩平台环境坑）或阶段性交付时，主动在回复末尾提炼 1 行规则草案。
   - 用户回复「沉淀」或执行命令，即可一键写入，无需用户自行起草。

2. **命令行调用**：
   - **新增沉淀**：
     ```bash
     node "<本技能目录>/scripts/learn.mjs" add --rule "规则内容" [--scope project|global] [--category 类别]
     ```
   - **查阅沉淀**：
     ```bash
     node "<本技能目录>/scripts/learn.mjs" list [--scope project|global]
     ```

3. **沉淀规范**：
   - 规则用极简祈使句，说明「场景与约束」或因果关系「X → Y」，避免口水话。
   - 自动去重：若目标文件中已存在相同规则，则提示已存在，不重复追加。
