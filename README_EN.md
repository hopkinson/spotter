<div align="center">
  <img src="assets/logo.svg" width="120" alt="Spotter logo" />
  <h1>Spotter</h1>
  <p><b>Trace clearly. Control risk. Prove delivery.</b></p>
  <p>Feature tracing · Read-only bug diagnosis · Code graphs · Risk-tiered workflows · Independent review & audit · Reusable learnings</p>
  <p><a href="README.md">中文</a> · English</p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
    <img src="https://img.shields.io/badge/node-%E2%89%A522-339933" alt="Node 22+" />
    <img src="https://img.shields.io/badge/Codex%20%7C%20Claude%20Code%20%7C%20Antigravity%20%7C%20Pi-supported-8A2BE2" alt="Supported assistants" />
    <img src="https://img.shields.io/badge/commands-11-orange" alt="11 commands" />
  </p>
</div>

## Why Spotter?

> **The biggest dilemma in AI coding isn't generating code—it's losing control.** Traditional AI assistants generate verbose polite chatter, overly nested lists, and unverified black-box code changes that leave developers in the dark.

Spotter injects three core guardrails into your AI coding assistant:

1. **Default Concise Mode**: Cuts all conversational filler ("Sure!", "I'd be happy to..."). The first sentence gives the direct conclusion or result, uses `X → Y` cause-and-effect, and stays readable in a single screen. Full background details appear only when asked to "expand".
2. **Risk-Tiered Approval & Visual Previews**: Clear, local, reversible edits can proceed directly with verification. Medium-risk changes require one approval of the sketch and minimal plan. High-risk changes involving permissions, money, date semantics, persistence, migrations, or cross-module writes require separate approvals of requirements and implementation.
3. **Verified Evidence Loop**: Follows a three-tier verification ladder (project tests → type check / production build → zero-dependency probe) and delivers terminal exit code 0 evidence. Completed features, bug fixes, and refactors automatically recommend `/spot-review` (`[Blocker]` blocks delivery; `[Nit]` offers one-reply fixes)—never false verbal promises.

### Key Highlights

- **End-to-End Closed Loop**: `/spot-plan` or `/spot-bug` → verified terminal execution → `/spot-review` graded gating → `/spot-release` multi-adapter delivery (GitHub Actions, native Git, or npm).
- **Anti-Guessing Circuit Breaker (`/spot-bug`)**: Tests 2–3 falsifiable hypotheses, inserts temporary `[DEBUG-xxx]` probes after 2 failed attempts (cleaned up before diffing), suggests context reset after 3 failures, and renders before/after sketches when relevant.
- **Author-Scoped Weekly Reports (`/spot-weekly`)**: Filters Git commits by the current author to exclude collaborator noise and aggregates work into a pragmatic "Progress + Blockers + Next Week" draft.
- **Local Bloat & Audit Threshold Hints**: Run `npm run hint` or `npm run hook:install` to flag changed files over 300 lines and un-audited branch growth (≥10 commits or +500 insertions) on `pre-commit`.

### Example: Adding "Export CSV" to Order List (High-Risk Two-Step Approval, `/spot-plan`)

1. **You ask**:
   ```text
   /spot-plan Add an "Export CSV" button to the order list using current filters
   ```

2. **AI inspects read-only and presents before/after sketches & boundaries** (without touching code):
   ```text
   [Before]
   +--------------------------------------------------------------------+
   | Orders       [ Search ID... ]   [ Status: All ▼ ]    [ + New Order ] |
   +--------------------------------------------------------------------+
   | Order ID  Customer  Amount     Status     Actions                  |
   | #10042    Acme      $1,200     Paid       View                     |
   +--------------------------------------------------------------------+

   [After] (Reuses active filters; adds server-side permission & tenant checks)
   +--------------------------------------------------------------------+
   | Orders       [ Search ID... ]   [ Status: All ▼ ] [Export] [+ New] |
   +---------------------------------------------------▲----------------+
                                                       └── Disabled / HTTP 403 if unauthorized
   ----------------------------------------------------------------------
   1st Approval (Scope): Verify sketch & edge cases (empty / cross-tenant) → Reply "confirm scope"
   2nd Approval (Impl):  Review minimal core diff & regression matrix      → Reply "go ahead"
   ```

3. **After approval**: AI applies changes, runs permission-aware regression tests with terminal `exit code 0` evidence, and recommends `/spot-review` for independent gating.

Because this example involves data export and permission boundaries, it uses two-step approval; local copy tweaks take the lightweight path directly, while standard features under `/spot-plan` use one-step approval. For full end-to-end walkthroughs of bug diagnosis, tracing, releases, and weekly reports, see the [Workflow Specification](docs/WORKFLOW_SPEC.md).

## Quick Start

For personal workflows shared across projects, install globally for Codex, Claude Code, Antigravity, or Pi. Requires Node.js 22+ and Git. Run from any directory; no repository clone is needed:

```bash
# Choose your client; multiple clients can also be specified together
npx --yes --allow-git=root github:hopkinson/spotter codex --global
npx --yes --allow-git=root github:hopkinson/spotter claude-code --global
npx --yes --allow-git=root github:hopkinson/spotter antigravity-cli --global
npx --yes --allow-git=root github:hopkinson/spotter pi --global
# Update all recorded clients
npx --yes --allow-git=root github:hopkinson/spotter --global
```

Codex, Antigravity, and Pi share one copy of the tools; Antigravity uses its native discovery manifest. Claude Code uses a separate copy. Pi reads user rules only from its own agent directory, so its managed rule section is written to `~/.pi/agent/AGENTS.md`. Adding clients preserves existing ones; replacing the client set requires `--global --replace-tools` with the selected clients. Global installation rejects unmanaged files and does not modify projects. Existing project installations require a separate, reviewed migration. See [installation details](INSTALL.md).

Requires Node.js 22+ and Git. Run from your project root:

```bash
# Codex (restart and use $spot-plan)
npx --yes --allow-git=root github:hopkinson/spotter codex

# Claude Code / Antigravity CLI (restart and use /spot-plan)
npx --yes --allow-git=root github:hopkinson/spotter claude-code
npx --yes --allow-git=root github:hopkinson/spotter antigravity-cli

# Pi (restart and use /skill:spot-plan)
npx --yes --allow-git=root github:hopkinson/spotter pi
```

Start a new session after installation, confirm entries such as `spot-plan` are visible, and ask the assistant to verify that shared rules and bundled helpers are actually loaded. Visible entries alone do not prove rules are loaded.

## Commands & Deliverables Quick Reference

> Note: In Codex, use the `$` prefix (e.g. `$spot-plan`). In Pi, use the `/skill:` prefix (e.g. `/skill:spot-plan`).

> [!TIP]
> **More Walkthroughs & Full State Machine**: The [Workflow Specification (WORKFLOW_SPEC.md)](docs/WORKFLOW_SPEC.md) includes **11 end-to-end command examples** (prompts, before/after sketches, and terminal deliverables), plus risk-tiered approval flows, the verification evidence ladder, and closeout rules.

| Everyday Scenario | Command | Core Deliverables (Verifiable Evidence) |
| :--- | :--- | :--- |
| Add a feature | [`/spot-plan`](skills/spot-plan/SKILL.md) | **Before/After UI Sketch** + proposed core diff, confirmed before editing |
| Fix a bug | [`/spot-bug`](skills/spot-bug/SKILL.md) | **Reproduced call trace** + failing regression test & fix diff |
| Explore a feature | [`/spot-trace`](skills/spot-trace/SKILL.md) | **Interaction state flow** + exact code inventory (read-only) |
| Review diffs | [`/spot-review`](skills/spot-review/SKILL.md) | **`[Blocker]` / `[Nit]` checklist**, identifying redundancy and minimal fixes (read-only) |
| Cumulative risk audit | [`/spot-audit`](skills/spot-audit/SKILL.md) | **Vulnerability & test gap audit** (read-only) |
| Code health / cleanup | [`/spot-refactor`](skills/spot-refactor/SKILL.md) | **Structure, progressive layout & dead-code lists** + guard test assertions |
| Prepare release / deploy | [`/spot-release`](skills/spot-release/SKILL.md) | **Preflight checks**, release & monitor via GitHub Actions / Git / npm on approval |
| Maintain code graph | [`/spot-graph`](skills/spot-graph/SKILL.md) | **Incremental code graph**, auto-refreshed on commit |
| Capture reusable learnings | [`/spot-learn`](skills/spot-learn/SKILL.md) | **Draft reusable rules**, saved to project rules or global preferences after approval |
| Draft weekly report | [`/spot-weekly`](skills/spot-weekly/SKILL.md) | **Progress report draft**, aggregated from Git commits by week or `--limit` days |
| Upgrade bundled skills | [`/spot-update`](skills/spot-update/SKILL.md) | **Upstream version & license check**, upgraded on approval |

## Update and Remove

Choose commands for your installation mode. Global operations use `--global`; project operations run from the target project root.

To update installed tools:

```bash
# Global installation
npx --yes --allow-git=root github:hopkinson/spotter --global
# Project installation
npx --yes --allow-git=root github:hopkinson/spotter
```

To remove Spotter, disable any manual graph refresh or hooks first, then run:

```bash
# Global installation
npx --yes --allow-git=root github:hopkinson/spotter --global --remove
# Project installation
npx --yes --allow-git=root github:hopkinson/spotter --remove
```

Removal only cleans up tools and marked rule sections owned by the corresponding installation record, preserving personal rule text and project data. Global installation does not remove existing project copies; review each project separately before migration. See [Installation Guide](INSTALL.md) for version pinning, conflicts, and recovery.

## Contributing

Issues and pull requests are welcome. `npm test` checks packaging and the installer. Use [Workflow Replay Cases](tests/workflow-replay.md) to check behavior across scenarios.

Spotter provides collaboration rules and tools loaded by the assistant; results depend on the assistant loading and following them. When tests, builds, or browser access are unavailable, report the verification gap rather than claiming an unverified result passed.

## License & Third-Party Sources

This project is licensed under the [MIT License](LICENSE). Third-party skills in `bundled-skills/` retain their original licenses; see [Third-party skill sources](bundled-skills/SOURCES.md).
