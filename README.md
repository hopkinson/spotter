<div align="center">
  <img src="assets/logo.svg" width="120" alt="Spotter logo" />
  <h1>Spotter</h1>
  <p><b>查得清全景，控得住风险，交得出证据。</b></p>
  <p>全景走查 · 只读诊断 · 知识图谱 · 风险分级工作流 · 独立审查与审计 · 周报沉淀</p>
  <p>中文 · <a href="README_EN.md">English</a></p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
    <img src="https://img.shields.io/badge/node-%E2%89%A522-339933" alt="Node 22+" />
    <img src="https://img.shields.io/badge/Codex%20%7C%20Claude%20Code%20%7C%20Antigravity-supported-8A2BE2" alt="Supported assistants" />
    <img src="https://img.shields.io/badge/commands-10-orange" alt="10 commands" />
  </p>
</div>

## 为什么需要 Spotter？

> **AI 编程最大的痛点不是写不出代码，而是「代码黑盒与失控」**：代码全是 AI 写的，人看不懂、没空 review，久而久之连系统在干嘛、改动了什么、隐藏了什么暗坑一无所知。

Spotter 为开发者建立 4 道防线，将审查权从「逐行肉眼查代码」转移为「抓规格、断言与全景」：

- **不知系统在干嘛？** ➜ 用 [`/spot-trace`](skills/spot-trace/SKILL.md) 产出界面草图、交互状态与调用链路，随时补全全局地图。
- **怕 AI 自作主张瞎改？** ➜ 用 [`/spot-plan`](skills/spot-plan/SKILL.md) 强制改前草图与验收标准对齐，人类点开工前绝不动业务代码。
- **改了什么心里没底？** ➜ 用 [`/spot-review`](skills/spot-review/SKILL.md) 独立只读审查，剥离冗余代码，输出关键 diff 与真实影响。
- **时间久了全忘光？** ➜ 用 [`/spot-log`](skills/spot-log/SKILL.md) 自动将任务验证证据沉淀为项目日志与周报。

## 核心特色：像资深工程师一样协作

普通 Agent 容易无脑修改业务代码；Spotter 强制遵循 **分级确认与证据闭环**：

```text
[ 用户指令 ] ➜ "帮我加个导出"
     │
     ▼ (第 1 次确认：需求对齐)
[ 改前/改后草图 ] ➜ 明确字段、格式与操作入口
[ 验收标准 ]     ➜ 格式校验、权限控制与超量截断
     │
     ▼ (第 2 次确认：方案核准)
[ 拟议 diff ]   ➜ 定位到文件与函数，展示最小修改范围
[ 极简测试 ]     ➜ 确认真实边界用例
     │
     ▼ (开工与验证)
[ 交付证据 ]     ➜ 运行结果 + 留存周报日志
```

## 快速开始

在目标项目根目录按客户端运行（依赖 Node 22+ / Git）：

```bash
# Codex（重启后使用 $spot-plan）
npx --yes --allow-git=root github:hopkinson/spotter codex

# Claude Code / Antigravity CLI（重启后使用 /spot-plan）
npx --yes --allow-git=root github:hopkinson/spotter claude-code
npx --yes --allow-git=root github:hopkinson/spotter antigravity-cli
```

## 场景与命令矩阵

> 注：Codex 环境使用 `$` 前缀（如 `$spot-plan`）。各命令底层状态机流转、分级接力与证据阶梯详见 [工作流全景规范](docs/WORKFLOW_SPEC.md)。

| 你想做什么（日常说法） | 对应命令 | 它会做什么（一句话） |
| :--- | :--- | :--- |
| 加个导出功能 | [`/spot-plan`](skills/spot-plan/SKILL.md) | 澄清需求并给 diff 方案，确认后开工 |
| 修一下登录超时 | [`/spot-bug`](skills/spot-bug/SKILL.md) | 只读复现链路，给回归用例与修复 diff |
| 理一下这个功能 | [`/spot-trace`](skills/spot-trace/SKILL.md) | 梳理全景链路与改动清单（只读） |
| 帮我看看改动 | [`/spot-review`](skills/spot-review/SKILL.md) | 独立审查正确性、测试与冗余（只读） |
| 阶段风险审计 | [`/spot-audit`](skills/spot-audit/SKILL.md) | 排查隐性漏洞与测试缺口（只读） |
| 代码体检 / 闲置清理 | [`/spot-refactor`](skills/spot-refactor/SKILL.md) | 体检死代码与闲置文件，确认后清理 |
| 准备发布 / 部署 | [`/spot-release`](skills/spot-release/SKILL.md) | 预检环境，授权后推送并盯部署 |
| 建个代码图谱 | [`/spot-graph`](skills/spot-graph/SKILL.md) | 启用图谱，提交后自动增量刷新 |
| 写本周周报 | [`/spot-log`](skills/spot-log/SKILL.md) | 提取工作记录，自动起草周报 |
| 升级随包技能 | [`/spot-update`](skills/spot-update/SKILL.md) | 检查上游版本与许可证变动 |

## 更新与移除

在目标项目根目录更新已安装的工具。

```bash
npx --yes --allow-git=root github:hopkinson/spotter
```

移除前先关闭手动启用的图谱刷新、前端 hook 或快捷方式，再运行以下命令。

```bash
npx --yes --allow-git=root github:hopkinson/spotter --remove
```

移除命令清理脚本安装的技能和规则标记段，保留项目规则文件和私人日志。指定版本、处理冲突和中断恢复见 [安装说明](INSTALL.md)。

## 参与贡献

欢迎提 Issue 和 PR。`npm test` 检查打包与安装脚本。规则和技能的实际表现取决于助手是否加载它们，以及项目具备哪些验证条件，可用 [工作流回放案例](tests/workflow-replay.md) 检查。

## 许可与第三方来源

本项目使用 [MIT 许可证](LICENSE)。`bundled-skills/` 中的第三方技能保留各自原许可，来源和版本见 [第三方技能来源](bundled-skills/SOURCES.md)。
