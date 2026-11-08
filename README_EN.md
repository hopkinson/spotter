<div align="center">
  <img src="assets/logo.svg" width="120" alt="Spotter logo" />
  <h1>Spotter</h1>
  <p><b>Clarify first. Prove after. Remember everything.</b></p>
  <p>Risk-aware workflows with knowledge graph, audits &amp; weekly reports — for Codex / Claude Code / Antigravity</p>
  <p><a href="README.md">中文</a> · English</p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
    <img src="https://img.shields.io/badge/node-%E2%89%A522-339933" alt="Node 22+" />
    <img src="https://img.shields.io/badge/Codex%20%7C%20Claude%20Code%20%7C%20Antigravity-supported-8A2BE2" alt="Supported assistants" />
    <img src="https://img.shields.io/badge/commands-8-orange" alt="8 commands" />
  </p>
</div>

## Why Spotter

Spotter installs project rules and skills for your coding assistant. They spell out what to agree on before work starts and what evidence to show when it’s done.

| You ask | What can slip through | What Spotter does |
| --- | --- | --- |
| “Add an export feature” | The feature ships with an extra download wrapper before anyone agrees on the format or who can export | Clarifies format and access first, aligns on a before-and-after sketch and acceptance cases, then reuses existing download and permission logic |
| “Fix the login timeout” | The timeout changes before anyone finds the cause | Reproduces the issue, traces the cause and its callers, and checks that any required regression test fails before the fix and passes after it. Reports the checks run and any gaps |
| “Look over this change” | The diff looks fine, but affected callers and edge cases go unchecked | Reviews requirements, call chains, and tests without editing the code. Separate audits cover accumulated risks, and refactor reviews focus on code structure |
| “Ship it” | A successful push passes for a production check | Checks builds, regressions, and migrations. After authorization, pushes and tracks deployment. Reports local and production results separately and identifies the step that failed |
| “Build a code graph for this repo” | Each session has to rediscover how the modules fit together | Enables CodeGraph and refreshes the graph incrementally after successful commits |
| “Write this week’s report” | Progress is pieced together from memory, and pushed changes get mixed up with live ones | Drafts from local task records and distinguishes local checks, successful pushes, and verified production changes |

Clear, low-risk changes can start right away. Medium-risk changes need one go-ahead. High-risk work and explicit `spot-plan` requests confirm the requirements and implementation plan separately.

## Quick start

Requires Node.js 22+ and Git. Run this from your project root.

```bash
npx --yes --allow-git=root github:hopkinson/spotter codex
```

- **Codex.** Restart and try `$spot-plan I want to add a CSV export`.
- **Claude Code / Antigravity CLI.** Replace the final argument with `claude-code` or `antigravity-cli`, then restart and use `/spot-plan`.

Check that the assistant loads your project rules and can find `spot-plan`. If it’s missing from the menu, ask the assistant to “use spot-plan to work through the export requirements.”

## Commands

In Codex, use the `$` prefix, as in `$spot-plan`.

| Usage | When to use it |
| --- | --- |
| [`/spot-plan I want to add ...`](skills/spot-plan/SKILL.md) | Before building a feature, confirm the requirements with a sketch and acceptance criteria, then confirm the implementation plan with a proposed diff |
| [`/spot-review`](skills/spot-review/SKILL.md) | Get a read-only review of correctness, tests, and redundancy for a set of changes |
| [`/spot-audit [base commit or tag]`](skills/spot-audit/SKILL.md)<br>`/spot-audit --full` | Check accumulated changes for security, concurrency, and data-loss risks. The default scope starts at the merge base with the default branch and includes uncommitted changes. On the default branch, pass a base or use `--full` to scan the repo |
| [`/spot-refactor [path]`](skills/spot-refactor/SKILL.md) | Find mixed responsibilities and duplication and get focused refactoring suggestions. Pass a file or directory, or omit the path to scan the repo |
| [`/spot-release`](skills/spot-release/SKILL.md) | Prepare a release, ship it, or track a deployment. Production retries, manual migrations, and rollbacks require separate authorization |
| [`/spot-graph`](skills/spot-graph/SKILL.md)<br>`/spot-graph --off` | Enable post-commit refreshes from the repo’s main worktree. Use `--off` to disable refreshes and keep the graph |
| [`/spot-log`](skills/spot-log/SKILL.md) or “write this week’s report” | Save task results and verification evidence locally, or draft a weekly report from those records |
| [`/spot-update`](skills/spot-update/SKILL.md) | In the Spotter repo, check upstream versions and licenses of bundled skills, then upgrade after confirming the candidate versions |

## Update and remove

To update the tools you’ve installed, run this from your project root.

```bash
npx --yes --allow-git=root github:hopkinson/spotter
```

To remove Spotter, first disable any graph refresh, frontend hooks, or shortcuts you enabled manually. Then run the following command from your project root.

```bash
npx --yes --allow-git=root github:hopkinson/spotter --remove
```

The command removes the installed skills and the marked rule block, leaving your own rule files and private logs in place. See the [installation guide](INSTALL.md) for version pinning, conflicts, and recovery after an interruption.

## Contributing

Issues and pull requests are welcome. `npm test` checks packaging and the installer. Behavior depends on which rules and skills the assistant loads and what the project can verify. Use the [workflow replay cases](tests/workflow-replay.md) to check that behavior.

## License and third-party sources

This project is licensed under the [MIT License](LICENSE). Third-party skills in `bundled-skills/` retain their own licenses; see [third-party skill sources](bundled-skills/SOURCES.md) for origins and versions.
