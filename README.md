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

## 为什么用 Spotter

Spotter 给编码助手装上一套项目规则和技能，把开工前要确认的事、交付时要给的证据说清楚。

| 你说 | 容易漏掉的事 | Spotter 怎么做 |
| --- | --- | --- |
| 「加个导出功能」 | 写完才发现格式和导出权限没说清，还多了一层下载封装 | 先问清格式和权限，用改前／改后草图和验收用例对齐，再复用已有的下载组件和权限校验 |
| 「整理下登录流程」或「理一下这个功能」 | 缺少全局视野，改代码容易漏掉关联配置、涉及源码文件或边界状态分支 | 用 `/spot-trace` 只读梳理功能全景：输出界面/场景草图、交互状态流转、调用与数据链路、精准源码清单及落地排查路线 |
| 「修一下登录超时」 | 改了超时值，却没查到实际原因 | 用 `/spot-bug` 只读定位：先复现、追查调用链与根因，给出拟议 diff 与回归用例，等待确认后再动代码 |
| 「帮我看看这次改动」 | 看完 diff 就给结论，漏了受影响的调用方和边界 | 对照需求、调用链和测试给出只读审查。阶段性积累的风险可以另做审计，结构问题可以单独评估重构 |
| 「发布吧」 | 推送成功就算交付，线上结果没查 | 先检查构建、回归和迁移，经授权后推送并跟踪部署。分别报告本地和线上结果，失败时指出卡在哪一步 |
| 「给这个仓库建个代码图谱」 | 助手每次都要重新摸索模块关系 | 启用 CodeGraph，成功提交后增量刷新代码图谱 |
| 「写本周周报」 | 靠回忆拼进展，已推送和已上线容易混在一起 | 从本机任务记录起草，区分本地通过、已推送和线上已验证 |

开工确认次数按风险分。明确的小改动直接做，中风险方案确认一次，高风险改动或显式调用 `spot-plan` 时分别确认需求与实现方案。Bug 排查走 `spot-bug` 只读诊断，理清全景走 `spot-trace`，确认拟议方案后再动手。

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

| 命令 | 场景与核心动作 | 示例 / 参数 |
| :--- | :--- | :--- |
| [`/spot-plan`](skills/spot-plan/SKILL.md) | **需求澄清与方案对齐**<br>开工前用草图和验收标准确认需求，再用拟议 diff 确认实现方案 | `/spot-plan 我想加……` |
| [`/spot-bug`](skills/spot-bug/SKILL.md) | **Bug 只读定位**<br>复现问题并追查根因与链路，给出拟议 diff 与回归用例，等待确认 | `/spot-bug <报错或现象>` |
| [`/spot-trace`](skills/spot-trace/SKILL.md) | **功能全景走查**<br>梳理界面草图、交互流转、调用链路、涉及代码清单与落地实施路线 | `/spot-trace <功能或模块>`<br>或「整理xxx功能」 |
| [`/spot-review`](skills/spot-review/SKILL.md) | **改动只读审查**<br>独立审查一组改动的正确性、测试覆盖与冗余代码 | 直接运行 |
| [`/spot-audit`](skills/spot-audit/SKILL.md) | **累积风险审计**<br>排查安全漏洞、并发隐患与数据丢失风险，默认查与主分支共同祖先改动 | `[起点提交或标签]`<br>`--full` 扫全仓 |
| [`/spot-refactor`](skills/spot-refactor/SKILL.md) | **结构异味体检**<br>只读检查职责混杂、重复实现与大文件，给出最小改法 | `[路径]`（文件或目录）<br>缺省则扫全仓 |
| [`/spot-release`](skills/spot-release/SKILL.md) | **发布预检与盯部署**<br>预检构建与迁移，经授权后推送并跟踪部署，失败即时停步报告 | 直接运行 |
| [`/spot-graph`](skills/spot-graph/SKILL.md) | **代码图谱维护**<br>在目标仓库主工作树启用提交后自动增量刷新 | `--off` 停用刷新并保留图谱 |
| [`/spot-log`](skills/spot-log/SKILL.md) | **任务存证与周报**<br>保存任务结果与验证证据到本机，按需一键生成中文周报草稿 | 或「写本周周报」 |
| [`/spot-update`](skills/spot-update/SKILL.md) | **随包技能更新**<br>在 Spotter 仓库检查上游版本和许可，确认候选版本后再升级 | 直接运行 |

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
