# Spotter 项目安装说明

需要 Node.js 22+ 和 Git。全局模式可从任意目录运行；项目模式从目标项目根目录运行。

## 全局安装（Codex / Claude Code）

使用当前源码时，在 Spotter 仓库根目录运行：

```text
node scripts/install.mjs --global codex claude-code
node scripts/install.mjs --global
```

第一条安装两个客户端，第二条更新已记录的客户端。只使用一个客户端时只指定 `codex` 或 `claude-code`。首次未指定客户端时默认安装 Codex。发布后的包可使用 `npx --yes --allow-git=root github:hopkinson/spotter --global codex claude-code`。

| 内容 | Codex | Claude Code |
| --- | --- | --- |
| 公共入口 | `~/.agents/skills/spot-*` | `~/.claude/skills/spot-*` |
| 内部辅助文件 | `~/.agents/bundled-skills` | `~/.claude/bundled-skills` |
| 公共规则受管段 | `~/.codex/AGENTS.md` | `~/.claude/CLAUDE.md` |

两端使用同一源码版本、同一条更新命令，但各有自己的副本。全局安装记录为 `~/.spotter/global-install.json`，中断恢复目录为 `~/.spotter/global-install-staging`，与项目安装记录隔离。现有规则正文和其他工具不改动；已有同名但无归属记录的文件会拦截安装，不会自动接管。当前仅支持默认用户目录；对应客户端设置了非默认 `CODEX_HOME` 或 `CLAUDE_CONFIG_DIR` 时明确报错。

全局安装器不会修改业务项目、自动启用 hook 或创建快捷方式。新会话中检查两端入口是否可见，并确认公共规则和辅助文件实际被加载。辅助脚本从实际安装位置调用，工作目录始终保持在业务项目根目录。前端 hook 与显式固定的快捷方式仍按项目启用；全局工具会让它们引用本机全局辅助文件。此类机器路径不应提交为团队配置。

```text
node scripts/install.mjs --global --remove
node scripts/install.mjs --global --recover
```

移除前，先在启用过的项目中关闭相关 hook、移除固定快捷方式；安装器不遍历项目清理这些配置。移除仅处理全局安装记录中的内容；保留个人正文和项目数据。中断后先确认安装进程已退出，再恢复；恢复时发现文件被继续编辑就停止并保留备份。

## 已有项目迁移

先在指定项目核对 `.spotter-install.json`、受管规则段和目录修改情况，再确认移除范围。通过原项目的 `--remove` 移除旧副本，保留项目业务规则、项目数据及其他工具；被修改过的受管文件会拦截，需要先人工核对。全局安装和旧项目迁移分开执行，不自动扫描所有仓库。项目固定版本与全局版本的入口可能重名；迁移后必须开新会话检查，不能假设全局版本已替代项目版本。

团队需要独立固定版本时继续使用以下项目安装方式。

## 安装与更新

```text
npx --yes --allow-git=root github:hopkinson/spotter codex
```

- 可改用 `claude-code`、`antigravity-cli`，也可同时指定多个工具。已有 Spotter checkout 时，可从目标项目运行 `node ../spotter/scripts/install.mjs codex`，按实际路径调整命令。
- 脚本从同一个 checkout 安装主入口、内部辅助文件和协作规则。Codex 与 Antigravity CLI 共用 `.agents/` 和 `AGENTS.md`，Claude Code 使用 `.claude/` 和 `CLAUDE.md`。保留项目规则正文和 `.spotter-install.json`，后者记录安装归属和版本内容校验值。
- 更新已安装的工具时，运行 `npx --yes --allow-git=root github:hopkinson/spotter`。在仓库名后加 `#` 和 Git 标签或提交号可指定版本。再次指定工具可追加安装。

## 冲突与移除

- 发现同名文件、旧版手动安装、标记异常或 Spotter 管理内容被改过时，脚本会在写入前报出冲突。旧版迁移时，先备份并核对旧的 Spotter 技能目录、辅助目录和规则段，仅移开这些内容，然后运行安装。保留项目自己的规则和技能。
- 手动启用过的前端 hook 或快捷方式先用对应命令关闭。用 `$spot-graph` 启用过提交后刷新时，先运行 `$spot-graph --off`。再在目标项目运行 `npx --yes --allow-git=root github:hopkinson/spotter --remove`。移除范围是脚本安装的内容和规则标记段，项目规则文件和私人日志会保留。
- 安装、更新或移除意外中断时，先确认安装进程已退出，再在目标项目运行 `npx --yes --allow-git=root github:hopkinson/spotter --recover`。未完成的改动会回滚，已完成的安装只清理暂存文件。若提示文件又被编辑过，保留 `.spotter-install-staging` 中的恢复清单和备份。

## 验证

重开编码助手，确认 `spot-plan` 等入口可见，并检查助手是否加载项目规则。AGY 可用 `/skills` 检查入口。
