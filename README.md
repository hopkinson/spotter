# Spotter

给 AI 编码助手用的一套**个人工作流**：一组规则 + 技能，让 AI 写代码时**先确认再动手，交付时留下测试和证据**。

支持情况：

| 工具 | 状态 |
| --- | --- |
| Antigravity CLI（`agy`） | ✅ 已实测 |
| Codex CLI | ⚠️ 未实测，按官方目录约定适配 |
| Claude Code | ⚠️ 未实测，按官方目录约定适配 |
| 其他支持 `SKILL.md` / `AGENTS.md` 的工具 | 应该能用，未验证 |

> 技能是普通的 `SKILL.md` 文件，规则是普通的 `AGENTS.md`，不绑定某个工具。

## 它解决什么问题？

AI 写代码常见的坑：没听懂就开改、改完没验证、一次改一大堆。Spotter 把流程拆成两次确认：

```
改前（没有 Spotter）            改后（有 Spotter）
────────────────────            ────────────────────────────
你：修一下这个 Bug              你：修一下这个 Bug
AI：（直接改代码）              AI：先复现，给出有证据的根因
你：？改对了吗                  你：确认根因            ← 第一次确认
                               AI：给最小改动方案 + 测试方案
                               你：确认方案            ← 第二次确认
                               AI：写测试 → 改代码 → 跑验证，报告结果
```

## 5 分钟上手

先下载本仓库：

```bash
git clone https://github.com/hopkinson/spotter.git
```

下面每段命令都给两个版本：**macOS / Linux**（终端，bash 或 zsh）和 **Windows**（PowerShell）。

再按你用的工具选一种。下面 `<Spotter>` 指刚下载的目录，`<项目>` 指你要让 AI 工作的代码仓库。

### Antigravity CLI

macOS / Linux：

```bash
SPOT_ROOT="$(pwd)"                       # 在 Spotter 目录里执行
cd ~/path/to/project                     # 换成你的项目路径
agy --add-dir "$SPOT_ROOT"
```

Windows：

```powershell
$SpotRoot = (Get-Location).Path          # 在 Spotter 目录里执行
Set-Location 'C:/path/to/project'        # 换成你的项目路径
agy --add-dir $SpotRoot
```

- 想指定模型：`agy models` 查看，再加 `--model <模型 ID>`。
- 在 `agy` 里输入 `/skills`，能看到 `spot-` 开头的技能就说明装好了。
- 不想用了：下次启动去掉 `--add-dir`。

### Codex CLI

按 Codex 官方约定：项目技能放 `<项目>/.agents/skills/`，个人技能放 `~/.codex/skills/`，规则放项目根的 `AGENTS.md`。

macOS / Linux：

```bash
mkdir -p <项目>/.agents/skills
cp -R <Spotter>/skills/*         <项目>/.agents/skills/
cp -R <Spotter>/bundled-skills/* <项目>/.agents/skills/
cp <Spotter>/rules/AGENTS.md     <项目>/AGENTS.md
```

Windows：

```powershell
New-Item -ItemType Directory -Force <项目>\.agents\skills | Out-Null
Copy-Item -Recurse <Spotter>\skills\*         <项目>\.agents\skills\
Copy-Item -Recurse <Spotter>\bundled-skills\* <项目>\.agents\skills\
Copy-Item <Spotter>\rules\AGENTS.md           <项目>\AGENTS.md
```

### Claude Code

按 Claude Code 官方约定：项目技能放 `<项目>/.claude/skills/`，规则放项目根的 `CLAUDE.md`。

macOS / Linux：

```bash
mkdir -p <项目>/.claude/skills
cp -R <Spotter>/skills/*         <项目>/.claude/skills/
cp -R <Spotter>/bundled-skills/* <项目>/.claude/skills/
cp <Spotter>/rules/AGENTS.md     <项目>/CLAUDE.md
```

Windows：

```powershell
New-Item -ItemType Directory -Force <项目>\.claude\skills | Out-Null
Copy-Item -Recurse <Spotter>\skills\*         <项目>\.claude\skills\
Copy-Item -Recurse <Spotter>\bundled-skills\* <项目>\.claude\skills\
Copy-Item <Spotter>\rules\AGENTS.md           <项目>\CLAUDE.md
```

本仓库根目录的 [`CLAUDE.md`](CLAUDE.md) 只有一行 `@rules/AGENTS.md`，直接引用同一份规则，所以只维护一处。

> 命令名（如 `/spot-plan`）在不同工具里触发方式可能不同；触发不了就直接说「用 spot-plan 帮我……」。

## 还需要装的技能

Spotter 的流程会调用下面四个技能，**不随包提供**（没有核实到可以公开发布的精确版本和许可）。请从上游安装；缺了的话，Spotter 会说明缺哪项并暂停对应阶段，不会硬往下做。

| 技能 | 用途 | 上游 |
| --- | --- | --- |
| `grilling`（即 `grill-me`） | 需求追问、对齐 | [Matt Pocock Skills](https://github.com/mattpocock/skills) |
| `verification-before-completion` | 收尾前核实证据 | [Aegis](https://github.com/ganyuanran/aegis) |
| `impeccable` | 前端布局、交互、可访问性 | [Impeccable](https://github.com/pbakaus/impeccable) |
| `design-taste-frontend` | 前端视觉把关 | [Taste Skill](https://github.com/Leonxlnx/taste-skill) |

安装时保留各技能自带的脚本和参考文件。

## 怎么用

| 你说 | Spotter 做什么 |
| --- | --- |
| 「帮我看看」 | 只读分析。报 Bug 时先给证据，等你确认 |
| `/spot-plan` | 把新需求聊清楚：行为、边界、验收场景 |
| 第一次确认 / 第二次确认 | 先给最小实施和测试方案，确认后才写测试、改代码、验证 |
| `/spot-review` | 在独立会话里审查指定的改动 |
| 「准备发布」「发布」「盯部署」 | `/spot-release`：发布前检查，授权后推送并跟踪部署 |
| 「写本周周报」 | `/spot-log`：从本机日志生成周报草稿（需要 Python 3） |
| 「检查技能更新」 | `/spot-update`：报告可升级的版本，确认后再升级 |

## 目录说明

| 路径 | 内容 |
| --- | --- |
| `rules/AGENTS.md` | 协作规则（唯一源） |
| `CLAUDE.md` | 让 Claude Code 引用上面的规则 |
| `skills/` | Spotter 自己写的技能 |
| `bundled-skills/` | 随包的第三方技能副本，带 `spot-` 前缀，避免与本机同名技能冲突 |
| `.agents/` | AGY 的加载清单 |
| `tests/` | 测试 |
| [`PLAN.md`](PLAN.md) | 实施计划和验收场景 |

## 验证仓库没问题

需要 Python 3。macOS / Linux 用 `python3`，Windows 用 `python`：

```bash
python3 -X utf8 -m unittest discover -s tests
```

```powershell
python -X utf8 -m unittest discover -s tests
```

## 常见问题

- **`/skills` 里看不到 `spot-` 技能？** 确认启动命令带了 `--add-dir $SpotRoot`，且路径指向本仓库。
- **Codex / Claude Code 没反应？** 它们还没实测。欢迎在 Issue 里反馈实际目录和触发方式。
- **推送、生产迁移、回滚会自动执行吗？** 不会，都要你明确授权。
- **用例和日志存在哪？** 用例存在你的业务仓库；工作日志默认写到 `~/.spotter/worklog.jsonl`。

## 参与贡献

欢迎提 Issue 和 PR。改动请附带可运行的测试。

## 许可与第三方来源

本项目使用 [MIT 许可证](LICENSE)。`bundled-skills/` 中的第三方技能保留各自原许可，来源和版本见 [第三方技能来源](bundled-skills/SOURCES.md)。
