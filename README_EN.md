<div align="center">
  <img src="assets/logo.svg" width="120" alt="Spotter logo" />
  <h1>Spotter</h1>
  <p><b>Trace clearly. Control risk. Prove delivery.</b></p>
  <p>Feature tracing · Read-only bug diagnosis · Code graphs · Risk-tiered workflows · Independent review & audit · Weekly summaries</p>
  <p><a href="README.md">中文</a> · English</p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
    <img src="https://img.shields.io/badge/node-%E2%89%A522-339933" alt="Node 22+" />
    <img src="https://img.shields.io/badge/Codex%20%7C%20Claude%20Code%20%7C%20Antigravity-supported-8A2BE2" alt="Supported assistants" />
    <img src="https://img.shields.io/badge/commands-10-orange" alt="10 commands" />
  </p>
</div>

## Why Spotter

Spotter installs project rules and skills for your coding assistant. They spell out what to agree on before work starts and what evidence to show when it’s done.

| You ask | What can slip through | What Spotter does |
| --- | --- | --- |
| “Add an export feature” | The feature ships with an extra download wrapper before anyone agrees on the format or who can export | Clarifies format and access first, aligns on a before-and-after sketch and acceptance cases, then reuses existing download and permission logic |
| “Trace this feature” or “map out the login flow” | Changes miss edge states, related configs, or real source files due to a lack of end-to-end visibility | Uses `/spot-trace` to trace the full route read-only: wireframe sketches, interaction states, end-to-end call and data chains, exact code inventory, and implementation steps |
| “Fix the login timeout” | The timeout changes before anyone finds the cause | Uses `/spot-bug` for read-only diagnosis: reproduces the issue, traces the cause and callers, proposes a diff and regression test, and waits for confirmation before touching code |
| “Look over this change” | The diff looks fine, but affected callers and edge cases go unchecked | Reviews requirements, call chains, and tests without editing the code. Separate audits cover accumulated risks, and refactor reviews focus on code structure |
| “Ship it” | A successful push passes for a production check | Checks builds, regressions, and migrations. After authorization, pushes and tracks deployment. Reports local and production results separately and identifies the step that failed |
| “Build a code graph for this repo” | Each session has to rediscover how the modules fit together | Enables CodeGraph and refreshes the graph incrementally after successful commits |
| “Write this week’s report” | Progress is pieced together from memory, and pushed changes get mixed up with live ones | Drafts from local task records and distinguishes local checks, successful pushes, and verified production changes |

Clear, low-risk changes can start right away. Medium-risk changes need one go-ahead. High-risk work and explicit `spot-plan` requests confirm the requirements and implementation plan separately. Bug investigations use `spot-bug` for read-only diagnosis and proposed diffs, while `spot-trace` maps out end-to-end feature routes before any code is modified.

## Quick start

Requires Node.js 22+ and Git. Run this from your project root.

```bash
npx --yes --allow-git=root github:hopkinson/spotter codex
```

- **Codex.** Restart and try `$spot-plan I want to add a CSV export`.
- **Claude Code / Antigravity CLI.** Replace the final argument with `claude-code` or `antigravity-cli`, then restart and use `/spot-plan`.

Check that the assistant loads your project rules and can find `spot-plan`. If it’s missing from the menu, ask the assistant to “use spot-plan to work through the export requirements.”

## Commands

In Codex, use the `$` prefix, as in `$spot-plan`. For detailed command state machines, tiered hand-offs, and evidence ladders, see [Workflow Specification](docs/WORKFLOW_SPEC.md).

| Command | Purpose & Core Action | Usage / Options |
| :--- | :--- | :--- |
| [`/spot-plan`](skills/spot-plan/SKILL.md) | **Requirements & Plan Alignment**<br>Confirm requirements with sketches and criteria, then approve proposed diffs | `/spot-plan I want to add ...` |
| [`/spot-bug`](skills/spot-bug/SKILL.md) | **Read-only Bug Diagnosis**<br>Circuit-breaker diagnosis, root-cause tracing, cross-repo pattern check & regression tests | `/spot-bug <symptom>` |
| [`/spot-trace`](skills/spot-trace/SKILL.md) | **Full-Route Exploration**<br>Map UI sketches, state flow, call hierarchy, touched code, and roadmap | `/spot-trace <feature>` |
| [`/spot-review`](skills/spot-review/SKILL.md) | **Read-only Diff Review**<br>Inspect correctness and test coverage with `[Blocker]` / `[Nit]` grading | Standalone |
| [`/spot-audit`](skills/spot-audit/SKILL.md) | **Cumulative Risk Audit**<br>Detect security vulnerabilities, concurrency flaws, and data-loss risks | `[base commit/tag]`<br>`--full` (whole repo) |
| [`/spot-refactor`](skills/spot-refactor/SKILL.md) | **Code Smells & Structure Check**<br>Spot mixed duties and duplicated implementations with minimal fixes | `[path]` (file/dir)<br>Omit to scan repo |
| [`/spot-release`](skills/spot-release/SKILL.md) | **Preflight & Deployment Tracking**<br>Verify builds and migrations, push with permission, and monitor deploys | Standalone |
| [`/spot-graph`](skills/spot-graph/SKILL.md) | **Knowledge Graph Maintenance**<br>Enable post-commit incremental code graph refresh on main worktree | `--off` (disable & keep) |
| [`/spot-log`](skills/spot-log/SKILL.md) | **Audit Evidence & Weekly Report**<br>Save local task logs and generate weekly status summaries | Alias: “write this week’s report” |
| [`/spot-update`](skills/spot-update/SKILL.md) | **Bundled Skills Upgrade**<br>Check upstream versions and licenses, then upgrade after confirmation | Standalone |

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
