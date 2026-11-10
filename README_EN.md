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

> **The biggest dilemma in AI coding isn't generating code—it's losing control.** When AI writes all the code without line-by-line human review, developers quickly lose track of what the system does, what actually changed, and what subtle bugs were introduced.

Spotter sets up 4 guardrails that shift your oversight from tedious manual code reviews to high-leverage checkpoints (specifications, assertions, and architecture traces):

- **Don't know what the system does?** ➜ [`/spot-trace`](skills/spot-trace/SKILL.md) maps UI sketches, interaction states, and end-to-end call chains into an architecture overview.
- **Worried AI will modify code blindly?** ➜ [`/spot-plan`](skills/spot-plan/SKILL.md) aligns on before/after sketches and acceptance criteria before touching any code.
- **Unsure what was actually changed?** ➜ [`/spot-review`](skills/spot-review/SKILL.md) performs read-only independent review to highlight critical diffs and catch regressions.
- **Forgetting changes over time?** ➜ [`/spot-log`](skills/spot-log/SKILL.md) records verification evidence and logs changes into project records and weekly reports.

## Cut the Fluff & Black Box: Transparent Before-and-After

Often the problem isn't that AI can't write code—it's the verbose, unreadable answers and black-box changes. Spotter strips away chatter and delivers only **concrete visual comparisons and verifiable evidence**:

* **Add Features ([`/spot-plan`](skills/spot-plan/SKILL.md))** ➜ Delivers **Before/After UI Sketches** + **Proposed Core Diff**
* **Fix Bugs ([`/spot-bug`](skills/spot-bug/SKILL.md))** ➜ Delivers **Reproduced Call Traces** + **Minimal Failing Tests**
* **Trace Architecture ([`/spot-trace`](skills/spot-trace/SKILL.md))** ➜ Delivers **Interaction State Flows** + **Exact Code Inventories**
* **Clean & Refactor ([`/spot-refactor`](skills/spot-refactor/SKILL.md))** ➜ Delivers **Dead Code / Orphan Asset Lists** + **Guard Tests**
* **Review Diffs ([`/spot-review`](skills/spot-review/SKILL.md))** ➜ Delivers **`[Blocker]` / `[Nit]` Checklists**, stripping away redundancies
* **Weekly Reports ([`/spot-log`](skills/spot-log/SKILL.md))** ➜ Delivers **Terminal Test Evidence** + **Structured Work Logs**

---

### Real-world Flow: Adding an "Export to Excel" Button (`/spot-plan`)

1. **You ask**:
   ```text
   /spot-plan Add an "Export Excel" button on the order list page
   ```

2. **AI inspects read-only and shows a clear before/after preview** (without touching code):
   ```text
   [Before] [ Search ] [ Status: All ▼ ]                 [ + New Order ]
   [After]  [ Search ] [ Status: All ▼ ]  [ Export Excel ] [ + New Order ]
   -------------------------------------------------------------
   Proposed Changes:
   - Frontend: app/pages/orders.vue (add button)
   - Backend: server/api/orders/export.ts (stream xlsx)
   [Next Step] Reply "go ahead"
   ```

3. **You reply "go ahead"** ➜ AI applies changes, executes the project's test suite, and delivers terminal passing evidence.

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
