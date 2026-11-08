<div align="center">
  <img src="assets/logo.svg" width="120" alt="Spotter logo" />
  <h1>Spotter</h1>
  <p><b>先问清，再动手，改完有证据；图谱记得住，审计查得到，周报交得了差。</b></p>
  <p>风险分级工作流 · 知识图谱 · 独立审查 · audit 审计 · 周报沉淀 — 适用于 Codex / Claude Code / Antigravity</p>
  <p>中文 · <a href="README_EN.md">English</a></p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
    <img src="https://img.shields.io/badge/node-%E2%89%A522-339933" alt="Node 22+" />
    <img src="https://img.shields.io/badge/Codex%20%7C%20Claude%20Code%20%7C%20Antigravity-supported-8A2BE2" alt="Supported assistants" />
    <img src="https://img.shields.io/badge/commands-8-orange" alt="8 commands" />
  </p>
</div>

## 为什么用 Spotter

Spotter 给编码助手装上一套项目规则和技能，把开工前要确认的事、交付时要给的证据说清楚。

| 你说 | 容易漏掉的事 | Spotter 怎么做 |
| --- | --- | --- |
| 「加个导出功能」 | 写完才发现格式和导出权限没说清，还多了一层下载封装 | 先问清格式和权限，用改前／改后草图和验收用例对齐，再复用已有的下载组件和权限校验 |
| 「修一下登录超时」 | 改了超时值，却没查到实际原因 | 先复现、追根因和调用方。需要回归用例时，验证修前失败、修后通过。收尾列出实测结果和证据缺口 |
| 「帮我看看这次改动」 | 看完 diff 就给结论，漏了受影响的调用方和边界 | 对照需求、调用链和测试给出只读审查。阶段性积累的风险可以另做审计，结构问题可以单独评估重构 |
| 「发布吧」 | 推送成功就算交付，线上结果没查 | 先检查构建、回归和迁移，经授权后推送并跟踪部署。分别报告本地和线上结果，失败时指出卡在哪一步 |
| 「给这个仓库建个代码图谱」 | 助手每次都要重新摸索模块关系 | 启用 CodeGraph，成功提交后增量刷新代码图谱 |
| 「写本周周报」 | 靠回忆拼进展，已推送和已上线容易混在一起 | 从本机任务记录起草，区分本地通过、已推送和线上已验证 |

开工确认次数按风险分。明确的小改动直接做，中风险方案确认一次，高风险改动或显式调用 `spot-plan` 时分别确认需求与实现方案。

## 快速开始

需要 Node.js 22+ 和 Git。在目标项目根目录运行以下命令。

```bash
npx --yes --allow-git=root github:hopkinson/spotter codex
```

- **Codex** 重启后试一句 `$spot-plan 我想加个 CSV 导出`。
- **Claude Code / Antigravity CLI** 安装时把命令末尾换成 `claude-code` / `antigravity-cli`，重启后用 `/spot-plan`。

确认助手加载了项目规则，并能找到 `spot-plan`。如果入口没出现在菜单里，可以直接说「用 spot-plan 帮我梳理导出需求」。

## 命令

Codex 用 `$` 前缀，例如 `$spot-plan`。

| 用法 | 什么时候用 |
| --- | --- |
| [`/spot-plan 我想加……`](skills/spot-plan/SKILL.md) | 新需求开工前，用草图和验收标准确认需求，再用拟议 diff 确认实现方案 |
| [`/spot-review`](skills/spot-review/SKILL.md) | 只读审查一组改动的正确性、测试和冗余 |
| [`/spot-audit [起点提交或标签]`](skills/spot-audit/SKILL.md)<br>`/spot-audit --full` | 排查累积改动的安全、并发和数据丢失风险。默认从与默认分支的共同祖先查起，含未提交改动。在默认分支上指定起点，或用 `--full` 扫全仓 |
| [`/spot-refactor [路径]`](skills/spot-refactor/SKILL.md) | 只读检查职责混杂和重复实现，给出最小改法。路径可为文件或目录，省略则扫全仓 |
| [`/spot-release`](skills/spot-release/SKILL.md) | 准备发布、发布或盯部署。生产重试、手动迁移和回滚需要单独授权 |
| [`/spot-graph`](skills/spot-graph/SKILL.md)<br>`/spot-graph --off` | 在目标仓库主工作树启用提交后刷新。加 `--off` 关闭刷新并保留图谱 |
| [`/spot-log`](skills/spot-log/SKILL.md) 或「写本周周报」 | 保存任务结果和验证证据到本机，或从记录生成周报草稿 |
| [`/spot-update`](skills/spot-update/SKILL.md) | 在 Spotter 仓库检查随包技能的上游版本和许可，确认候选版本后再升级 |

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
