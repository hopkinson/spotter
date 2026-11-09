<div align="center">
  <img src="assets/logo.svg" width="120" alt="Spotter logo" />
  <h1>Spotter</h1>
  <p><b>先问清，再动手，改完有证据；图谱记得住，审计查得到，周报交得了差。</b></p>
  <p>全景走查 · 只读诊断 · 风险分级工作流 · 知识图谱 · 独立审查与审计 · 周报沉淀 — 适用于 Codex / Claude Code / Antigravity</p>
  <p>中文 · <a href="README_EN.md">English</a></p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
    <img src="https://img.shields.io/badge/node-%E2%89%A522-339933" alt="Node 22+" />
    <img src="https://img.shields.io/badge/Codex%20%7C%20Claude%20Code%20%7C%20Antigravity-supported-8A2BE2" alt="Supported assistants" />
    <img src="https://img.shields.io/badge/commands-10-orange" alt="10 commands" />
  </p>
</div>

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

| 你说 / 场景 | 对应命令 (Codex 用 `$`) | Spotter 怎么做（核心防护） | 确认级别 |
| :--- | :--- | :--- | :--- |
| 「加个导出功能」 | [`/spot-plan`](skills/spot-plan/SKILL.md) | 漏掉权限与格式、过度封装 ➜ **草图确认需求 + 拟议 diff 确认方案** | 两次确认 |
| 「修一下登录超时」 | [`/spot-bug`](skills/spot-bug/SKILL.md) | 只改超时不查真因 ➜ **只读复现与链路追查，给回归用例与拟议 diff** | 确认后开工 |
| 「理一下这个功能」 | [`/spot-trace`](skills/spot-trace/SKILL.md) | 缺少全局视野 ➜ **梳理界面草图、交互流转、调用链与精确代码清单** | 只读走查 |
| 「帮我看看改动」 | [`/spot-review`](skills/spot-review/SKILL.md) | 漏看调用方与边界 ➜ **独立审查改动正确性、测试覆盖与多余代码** | 只读审查 |
| 「阶段风险审计」 | [`/spot-audit`](skills/spot-audit/SKILL.md) | 隐性安全/并发缺陷 ➜ **排查安全漏洞、并发隐患与数据丢失风险** | 只读审计 |
| 「代码体检重构」 | [`/spot-refactor`](skills/spot-refactor/SKILL.md) | 职责混杂/大文件 ➜ **只读体检结构异味与重复实现，给出最小改法** | 只读建议 |
| 「准备发布 / 部署」| [`/spot-release`](skills/spot-release/SKILL.md) | 推送成功线上崩 ➜ **预检迁移与构建，授权推送并全程跟踪部署** | 关键步骤确认 |
| 「建个代码图谱」 | [`/spot-graph`](skills/spot-graph/SKILL.md) | 每次重新摸索架构 ➜ **启用 CodeGraph，提交后自动增量刷新图谱** | 零确认 |
| 「写本周周报」 | [`/spot-log`](skills/spot-log/SKILL.md) | 靠回忆凑进展 ➜ **从本机任务凭证自动起草，区分本地通过与线上验证** | 零确认 |
| 「升级随包技能」 | [`/spot-update`](skills/spot-update/SKILL.md) | 依赖过时与许可漂移 ➜ **检查上游最新版本与开源许可** | 确认后升级 |

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
