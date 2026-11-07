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

一行安装（在项目根目录运行，Claude Code / Antigravity 把最后的 `codex` 换成 `claude-code` / `antigravity-cli`）：

```bash
npx --yes --allow-git=root github:hopkinson/spotter codex
```

**3 步开始：** 安装 → 重启助手 → 说一句 `/spot-plan 我想加……`

## 用起来的区别（示意）

**① 修 Bug：「修一下登录超时」**

| 没有 Spotter | 有 Spotter |
| --- | --- |
| 「已修复 ✅」<br>原因是猜的还是查的？有没有测试？验证过什么？都不知道 | 1. 复现：本地稳定复现（无法复现会说明证据缺口）<br>2. 根因：token 刷新早于过期判断<br>3. 修复：先 grep 所有调用方，在共享代码一次修掉，只改约 3 行<br>4. 回归用例：修前红 → 修后绿<br>5. 验证：`npm test` 15/15<br>6. 末尾两行：跳过了什么、有什么风险、未覆盖什么 |

**② 做需求：「加个导出功能」**

| 没有 Spotter | 有 Spotter |
| --- | --- |
| 直接写了 400 行<br>做完才发现：要的是 CSV 不是 Excel，还要按权限过滤 | `/spot-plan` 先问 2 个会改变结果的取舍（格式？谁能导出？）<br>→ 改前/改后草图 + 验收用例<br>→ 你确认后才动手；高风险（权限、金额）再确认一次方案和 diff<br>→ 最小实现：复用现有下载组件和权限校验，不加依赖 |

**③ 改动体量（内置 ponytail 最小实现）**

| 没有 Spotter | 有 Spotter |
| --- | --- |
| 顺手加了 ExportService 抽象、配置项、重试、3 个新依赖<br>diff 600 行，评审的人要先读懂没人要的东西 | 按顺序取第一个可行方案：不需要 → 现成的 → 标准库 → 已装依赖 → 最少代码<br>diff 40 行，含受影响的调用方和测试<br>没要的功能只用一句话点名<br>「最小」指方案最省，不是少做 |

**④ 审查与审计：「帮我看看这次改动」**

| 没有 Spotter | 有 Spotter |
| --- | --- |
| 看了 diff，LGTM<br>调用方、边界、测试有没有漏？不知道 | `/spot-review`：对照需求，追调用链和测试，报告具体问题和验证缺口<br>`/spot-audit`：累积改动的漏洞、并发、数据丢失；`--full` 扫全仓<br>`/spot-refactor src/`：哪些文件值得拆，给最小改法 |

**⑤ 发布与周报：「发布吧」**

| 没有 Spotter | 有 Spotter |
| --- | --- |
| 「已推送 ✅」<br>本地通过、推送成功、线上没问题混在一起<br>周五靠回忆写周报，分不清进展和结果 | `/spot-release`：预检（构建、回归、迁移）→ 你授权 → 推送 → 跟踪部署 → 线上验收；失败时报告失败步骤，重试和回滚等你确认<br>`/spot-log`：从本机记录生成周报草稿，区分「本地通过」和「线上验证」 |

## 为什么用 Spotter

AI 写得快，但需求、根因和验证容易含糊。Spotter 用规则和技能把每一步钉住：

| 场景 | 常见问题 | Spotter 的做法 | 命令 |
| --- | --- | --- | --- |
| 做需求 | 自行补全，做完才发现理解偏差 | 先问清取舍，用草图和验收用例对齐 | `/spot-plan` |
| 修 Bug | 猜原因直接改 | 先复现、查根因，再按风险定确认次数 | 自动 |
| 交付 | 只说「完成了」 | 报告跑过的验证和未覆盖部分 | 自动 |
| 审查 | 只看 diff，漏调用链 | 结合需求、调用方和测试，只读报告 | `/spot-review` |
| 阶段审计 | 累积改动藏着漏洞和数据风险 | 只读排查安全、并发、数据丢失；`--full` 扫全仓 | `/spot-audit` |
| 重构 | 文件越写越大，无从下手 | 找职责混杂和重复实现，给最小改法 | `/spot-refactor` |
| 代码图谱 | 助手每次重新摸索代码结构 | 提交后自动增量刷新 CodeGraph | `/spot-graph` |
| 发布 | 本地通过、推送、线上验证混为一谈 | 预检；授权后跟踪部署，分阶段给证据 | `/spot-release` |
| 周报 | 事后回忆，分不清进展和结果 | 从本机记录生成草稿 | `/spot-log` |
| 维护技能 | 随包技能上游变了不知道 | 检查上游版本和许可，确认后升级 | `/spot-update` |

效果取决于工具是否加载规则和技能，以及项目的验证条件。维护者可用 [工作流回放案例](tests/workflow-replay.md) 检查改动后的实际表现；`npm test` 只检查打包与脚本。重复出现的问题，优先沉淀为项目内可运行的检查并接入测试或 CI。

## 命令

| 命令 | 用法 | 说明 |
| --- | --- | --- |
| [`/spot-plan`](skills/spot-plan/SKILL.md) | `/spot-plan 我想加……` | 澄清需求、边界和验收标准，草图对齐后等你确认 |
| [`/spot-review`](skills/spot-review/SKILL.md) | `/spot-review` | 只读审查一组改动的正确性、测试和冗余 |
| [`/spot-audit`](skills/spot-audit/SKILL.md) | `/spot-audit [起点提交或标签]`<br>`/spot-audit --full` | 默认查相对默认分支的累积改动（含未提交）；在默认分支上开发时指定起点；`--full` 扫全仓 |
| [`/spot-refactor`](skills/spot-refactor/SKILL.md) | `/spot-refactor [路径]` | 只读找值得重构的代码，路径可为文件或目录，省略则扫全仓。编码收尾时若本轮改动有具体维护问题，也会附一句建议 |
| [`/spot-release`](skills/spot-release/SKILL.md) | `/spot-release` | 预检构建、回归和迁移；授权后推送、跟踪部署、核对线上结果 |
| [`/spot-log`](skills/spot-log/SKILL.md) | `/spot-log` 或「写本周周报」 | 结果和验证证据存本机，按需生成周报草稿 |
| [`/spot-graph`](skills/spot-graph/SKILL.md) | `/spot-graph`<br>`/spot-graph --off` | 在目标仓库主工作树运行一次，之后每次成功提交静默刷新图谱，失败时提示；`--off` 关闭 |
| [`/spot-update`](skills/spot-update/SKILL.md) | `/spot-update` | 仅在 Spotter 仓库中使用：检查随包技能的上游版本和许可，只报告候选，确认后再升级 |

**Codex** 把 `/` 换成 `$`（如 `$spot-plan`）。命令不可用时，直接说「用 spot-plan 帮我……」。

## 安装

需要 Node.js 22+ 和 Git。在目标项目根目录运行：

```bash
npx --yes --allow-git=root github:hopkinson/spotter codex
```

用 Claude Code 或 Antigravity CLI 时，把 `codex` 换成 `claude-code` 或 `antigravity-cli`。装好后重启助手。更新和移除命令见 [安装说明](INSTALL.md)。

## 移除

在目标项目根目录运行：

```bash
npx --yes --allow-git=root github:hopkinson/spotter --remove
```

只删除脚本安装的技能和规则标记段；项目自己的规则文件和私人日志保留。手动启用过的前端 hook 或快捷方式，先用对应命令关闭。移除中断时运行 `--recover`，详见 [安装说明](INSTALL.md)。

## 参与贡献

欢迎提 Issue 和 PR。运行 `npm test` 验证改动。

## 许可与第三方来源

本项目使用 [MIT 许可证](LICENSE)。`bundled-skills/` 中的第三方技能保留各自原许可，来源和版本见 [第三方技能来源](bundled-skills/SOURCES.md)。