# Spotter 项目安装说明

需要 Node.js 22+ 和 Git。全局模式可从任意目录运行；项目模式从目标项目根目录运行。

## 全局安装（Codex / Claude Code / Antigravity）

无需克隆仓库，从任意目录按使用的客户端选择一条：

```text
npx --yes --allow-git=root github:hopkinson/spotter codex --global
npx --yes --allow-git=root github:hopkinson/spotter claude-code --global
npx --yes --allow-git=root github:hopkinson/spotter antigravity-cli --global
# 后续统一更新已记录的客户端
npx --yes --allow-git=root github:hopkinson/spotter --global
```

可同时指定多个客户端，例如 `npx --yes --allow-git=root github:hopkinson/spotter codex antigravity-cli --global`。首次未指定客户端时默认安装 Codex。已有源码时，也可在 Spotter 仓库根目录运行 `node scripts/install.mjs codex --global`；无客户端参数的 `node scripts/install.mjs --global` 更新已记录的客户端。

| 内容 | Codex | Antigravity | Claude Code（可选） |
| --- | --- | --- | --- |
| 公共入口 | `~/.agents/skills/spot-*` | 共用 Codex 的入口 | `~/.claude/skills/spot-*` |
| 内部辅助文件 | `~/.agents/bundled-skills` | 共用 Codex 的辅助文件 | `~/.claude/bundled-skills` |
| 公共规则受管段 | `~/.codex/AGENTS.md` | `~/.gemini/config/AGENTS.md` | `~/.claude/CLAUDE.md` |

Codex 和 Antigravity 共用一份工具文件，Claude Code 使用独立副本；都由同一条命令更新。Antigravity 的 `~/.gemini/config/skills.json` 发现清单指向共享目录并只登记本包入口，适用于 App、CLI 和 IDE。它使用[官方发现清单机制](https://antigravity.google/docs/customization-discovery)，无需创建或修改目录链接。

全局安装记录为 `~/.spotter/global-install.json`，中断恢复目录为 `~/.spotter/global-install-staging`，与项目安装记录隔离。现有规则正文和其他工具不改动；已有同名但无归属记录的文件会拦截安装，不会自动接管。已有未受管的发现清单也会拦截，保留原文件供人工处理；未标记的旧公共规则需备份、区分个人内容后再迁移。当前仅支持默认用户目录；对应客户端设置了非默认 `CODEX_HOME` 或 `CLAUDE_CONFIG_DIR` 时明确报错。

普通安装会追加客户端。需要将已安装组合切换为 Codex＋Antigravity 时，先备份，再显式运行：

```text
npx --yes --allow-git=root github:hopkinson/spotter codex antigravity-cli --global --replace-tools
```

替换会在同一事务中移除未选客户端的受管副本和规则段、更新发现清单及安装记录。保留个人规则正文、其他工具和用户已有的目录链接；被修改过的受管文件会拦截整次切换。共享文件只在最后一个使用它的客户端被移除时清理。`--replace-tools` 仅用于全局模式，必须指定至少一个客户端，不能与 `--remove` 或 `--recover` 合用。

全局安装器不会修改业务项目、自动启用 hook 或创建快捷方式。新会话中检查两端入口是否可见，并确认公共规则和辅助文件实际被加载。辅助脚本从实际安装位置调用，工作目录始终保持在业务项目根目录。前端 hook 与显式固定的快捷方式仍按项目启用；全局工具会让它们引用本机全局辅助文件。此类机器路径不应提交为团队配置。

```text
npx --yes --allow-git=root github:hopkinson/spotter --global --remove
npx --yes --allow-git=root github:hopkinson/spotter --global --recover
```

移除前，先在启用过的项目中关闭相关 hook、移除固定快捷方式；安装器不遍历项目清理这些配置。移除仅处理全局安装记录中的内容；保留个人正文和项目数据。中断后先确认安装进程已退出，再恢复；恢复时发现文件被继续编辑就停止并保留备份。

## 已有项目迁移

先在指定项目核对 `.spotter-install.json`、受管规则段和目录修改情况，再确认移除范围。通过原项目的 `--remove` 移除旧副本，保留项目业务规则、项目数据及其他工具；被修改过的受管文件会拦截，需要先人工核对。全局安装和旧项目迁移分开执行，不自动扫描所有仓库。项目固定版本与全局版本的入口可能重名；迁移后必须开新会话检查，不能假设全局版本已替代项目版本。

团队需要独立固定版本时继续使用以下项目安装方式。

## 安装与更新

### 自动检查工具自身更新

安装本版后，助手在开始新的开发任务时按协作规则运行已安装的 `skills/spot-update/scripts/check.mjs`。它依赖助手加载规则，不是客户端启动钩子，也没有后台服务。全局规则包含脚本的实际路径并传入 `--global`；项目安装从业务项目根目录运行 `.agents/skills/spot-update/scripts/check.mjs`（Claude Code 使用 `.claude/`）。

检查跟随 GitHub `main`，按安装范围在 `.spotter/update-check.json` 保存时间、已提醒候选和固定提交命令。全局安装的多个项目/客户端共享用户主目录中的记录，项目安装独立记录；24 小时内不重复联网，同一候选不重复提醒。失败尝试也限频，断网、超时和 GitHub 限流不阻塞业务任务。显式检查可加 `--force`；命令只检查，不安装。

有更新时只提醒，回复「更新」后由助手读取已展示的候选，安装固定提交。例如（将两处 `<SHA>` 替换为同一个完整提交号）：

```text
npx --yes --allow-git=root github:hopkinson/spotter#<SHA> --global --source-commit <SHA>
```

项目安装省略 `--global`。不要把固定 SHA 改回 `main`；安装时 main 已前进也不能替换已确认候选。上游回退或分叉单列为历史变化，比较接口不可用时标为关系未核实，不按普通升级引导安装。缓存命令仅供展示，执行时用已校验 SHA 和原范围按固定模板重建，不执行缓存字符串。安装器保留原有本地修改拦截、事务回滚和恢复流程。完成后核对安装记录 `sourceCommit`，开启新聊天加载规则。

旧安装无提交号时标为“基线未知”，不把当前远端 HEAD 当作已安装版本。安装器从干净的当前源码仓库、包的 `gitHead` 或明确固定的 `--source-commit` 获取来源；无法确认时保留未知。`--source-commit` 是固定包 URL 的来源声明，不能用于给任意本地副本冒标版本；在 Git 源码安装中还会核对干净状态和提交号。

检查状态和安装记录分开保存，不修改业务文件或安装校验值。并发检查用独占锁；若进程被强制终止留下 `.spotter/update-check.lock`，确认该检查进程已退出后再手动移除锁。损坏的检查记录保留并报告，不自动覆盖。卸载后检查缓存可能保留，但不会自行运行。

### 手动安装与更新

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
