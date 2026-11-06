# Spotter 项目安装说明

需要 Git 和 Python 3.12+。先核对目标项目的规则和工具，再从目标项目根目录运行以下命令。Spotter 安装在当前项目中。

## 安装与更新

```text
git clone https://github.com/hopkinson/spotter.git ../spotter
python ../spotter/scripts/install.py codex
```

- 可改用 `claude-code`、`antigravity-cli`，也可同时指定多个工具。已有 Spotter checkout 时，直接使用该 checkout 中的脚本路径。
- 脚本从同一个 checkout 安装 5 个主入口、内部辅助文件和协作规则。Codex 与 Antigravity CLI 共用 `.agents/` 和 `AGENTS.md`，Claude Code 使用 `.claude/` 和 `CLAUDE.md`。保留项目规则正文和 `.spotter-install.json`，后者记录安装归属和版本内容校验值。
- 更新时，先把 Spotter checkout 切换到所需版本，再在目标项目运行 `python ../spotter/scripts/install.py`。它更新已安装的工具。再次指定工具可追加安装。

## 冲突与移除

- 发现同名文件、旧版手动安装、标记异常或 Spotter 管理内容被改过时，脚本会在写入前报出冲突。旧版迁移时，先备份并核对旧的 Spotter 技能目录、辅助目录和规则段，仅移开这些内容，然后运行安装。保留项目自己的规则和技能。
- 手动启用过的前端 hook 或快捷方式先用对应命令关闭，再在目标项目运行 `python ../spotter/scripts/install.py --remove`。移除范围是脚本安装的内容和规则标记段，项目规则文件和私人日志会保留。
- 安装、更新或移除意外中断时，先确认安装进程已退出，再在目标项目运行 `python ../spotter/scripts/install.py --recover`。未完成的改动会回滚，已完成的安装只清理暂存文件。若提示文件又被编辑过，保留 `.spotter-install-staging` 中的恢复清单和备份。

## 验证

重开编码助手，确认 `spot-plan` 等入口可见，并检查助手是否加载项目规则。AGY 可用 `/skills` 检查入口。前端辅助工具运行时需要 Node.js。
