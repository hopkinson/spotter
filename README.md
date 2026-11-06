<div align="center">
  <img src="assets/logo.svg" width="120" alt="Spotter logo" />
  <h1>Spotter</h1>
  <p><b>把日常开发习惯变成 AI 编码助手的工作流。</b></p>
  <p>中文 · <a href="README_EN.md">English</a></p>
</div>

先弄清问题，再按风险选择流程。小改动直接做并验证，中风险任务确认一次再开工，高风险或明确要求完整流程时确认两次。

## 为什么用 Spotter

AI 能快速写出代码，但项目还需要明确的需求、可核实的根因和可靠的验证。Spotter 用规则和技能把这些步骤串起来：

| 场景 | 没有约定时可能发生 | Spotter 的做法 |
| --- | --- | --- |
| 修 Bug | 猜测原因后直接修改 | 先核实原因，无法复现时说明证据缺口，再按风险确定确认次数 |
| 做需求 | 自行补全需求，做完才发现理解有偏差 | 先问清会改变结果的取舍，再对齐行为、方案和验收场景。显式调用 `/spot-plan` 时走两次确认 |
| 交付改动 | 只说“完成了”，不知道验证过什么 | 确认方案后实施，报告运行过的验证和未覆盖的部分 |
| 审查代码 | 只看 diff，漏掉调用链和边界 | 用 `/spot-review` 结合需求、调用方和测试，报告具体问题和验证缺口 |
| 发布 | 把本地通过、推送成功和线上验证混为一谈 | 用 `/spot-release` 做预检；授权后跟踪部署，区分各阶段的证据 |
| 写周报 | 事后回忆工作，难以区分进展和结果 | 用 `/spot-log` 从本机记录生成草稿，区分本地通过与线上验证 |

这些是 Spotter 要求助手遵循的工作方式，实际效果仍取决于工具是否加载规则和技能，以及项目提供的验证条件。

维护者可以用 [工作流回放案例](tests/workflow-replay.md) 检查规则、技能或模型变更后的实际表现；仓库自动测试检查打包与脚本，不能代替助手行为回放。

业务项目中反复出现的问题，优先沉淀为项目内可运行的检查并接入现有测试或 CI，例如数据库时区回归；Spotter 记录实际执行结果和未覆盖的边界。

## 技能

Spotter 提供五个公开入口；内部辅助技能由规则和入口按需调用。

| 技能 | 什么时候用 | 做什么 |
| --- | --- | --- |
| [`spot-plan`](skills/spot-plan/SKILL.md) | 开始新需求或调整现有行为 | 澄清需求、边界和验收标准，用草图对齐后等你确认。 |
| [`spot-review`](skills/spot-review/SKILL.md) | 需要审查一组改动时 | 只读审查正确性、测试和冗余，报告具体问题与验证缺口。 |
| [`spot-release`](skills/spot-release/SKILL.md) | 准备发布或跟踪部署时 | 检查构建、回归和迁移；授权后推送、跟踪部署并核对线上结果。 |
| [`spot-log`](skills/spot-log/SKILL.md) | 记录任务结果或写周报时 | 把结果和验证证据保存在本机，按需生成周报草稿。需要 Python 3。 |
| [`spot-update`](skills/spot-update/SKILL.md) | 维护 Spotter 随包技能时 | 在 Spotter 仓库中检查上游版本和许可，报告候选更新；确认后再升级。 |

不同工具调用技能的方式可能不同；命令不可用时，可以直接说「用 spot-plan 帮我……」。

## 安装

用同一个命令为当前项目安装或更新主入口、内部辅助文件和协作规则。支持 Codex、Claude Code 和 Antigravity CLI。需要 Git 和 Python 3.12+。详见 [安装说明](INSTALL.md)。

### AGY 临时试用

不想安装 Node.js 时，AGY 也可以直接加载本仓库：

```bash
git clone https://github.com/hopkinson/spotter.git
agy --add-dir <Spotter目录>
```

请在目标项目中启动 `agy`，把 `<Spotter目录>` 换成克隆后的绝对路径。Windows PowerShell 同样可用。下次启动不带 `--add-dir` 即停止使用；在 AGY 中用 `/skills` 查看技能。

## 参与贡献

欢迎提 Issue 和 PR。改动请附带可运行的测试。

## 许可与第三方来源

本项目使用 [MIT 许可证](LICENSE)。`bundled-skills/` 中的第三方技能保留各自原许可，来源和版本见 [第三方技能来源](bundled-skills/SOURCES.md)。
