<div align="center">
  <img src="assets/logo.svg" width="120" alt="Spotter logo" />
  <h1>Spotter</h1>
  <p><b>Trace clearly. Control risk. Prove delivery.</b></p>
  <p>Feature tracing · Read-only bug diagnosis · Code graphs · Risk-tiered workflows · Independent review & audit · Reusable learnings</p>
  <p><a href="README.md">中文</a> · English</p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
    <img src="https://img.shields.io/badge/node-%E2%89%A522-339933" alt="Node 22+" />
    <img src="https://img.shields.io/badge/Codex%20%7C%20Claude%20Code%20%7C%20Antigravity-supported-8A2BE2" alt="Supported assistants" />
    <img src="https://img.shields.io/badge/commands-10-orange" alt="10 commands" />
  </p>
</div>

## Why Spotter?

> **The biggest dilemma in AI coding isn't generating code—it's losing control.** Traditional AI assistants generate verbose polite chatter, overly nested lists, and unverified black-box code changes that leave developers in the dark.

Spotter injects three core guardrails into your AI coding assistant:

1. **Default Concise Mode**: Cuts all conversational filler ("Sure!", "I'd be happy to..."). The first sentence gives the direct conclusion or result, uses `X → Y` cause-and-effect, and stays readable in a single screen. Full background details appear only when asked to "expand".
2. **Risk-Tiered Approval & Visual Previews**: Clear, local, reversible edits can proceed directly with verification. Medium-risk changes require one approval of the sketch and minimal plan. High-risk changes involving permissions, money, date semantics, persistence, migrations, or cross-module writes require separate approvals of requirements and implementation.
3. **Verified Evidence Loop**: After modifications, AI automatically executes the project's tests/builds in the terminal and delivers actual terminal evidence with exit code 0—never false verbal promises.

### Example: Renaming a List Button (One Approval, `/spot-plan`)

1. **You ask**:
   ```text
   /spot-plan Rename the order list's "New" button to "New Order"
   ```

2. **AI inspects read-only and shows a clear before/after preview & diff** (without touching code):
   ```text
   [Before] [ Search ] [ Status: All ▼ ]                 [ + New ]
   [After]  [ Search ] [ Status: All ▼ ]           [ + New Order ]
   -------------------------------------------------------------
   Proposed Changes:
   - Frontend: app/pages/orders.vue (illustrative project path)
   - Core diff: - New / + New Order (button text only)
   [Next Step] Reply "go ahead"
   ```

3. **You reply "go ahead"** ➜ AI applies changes, executes the project's test suite, and delivers terminal passing evidence.

This example explicitly invokes `/spot-plan`, so it uses one approval. The same local text edit requested directly can take the lightweight path. High-risk changes require requirements approval followed by approval of the proposed diff; releases and production operations follow separate release authorization rules.

## Quick Start

For personal workflows shared across projects, install globally for Codex, Claude Code, or Antigravity. Requires Node.js 22+ and Git. Run from any directory; no repository clone is needed:

```bash
# Choose your client; multiple clients can also be specified together
npx --yes --allow-git=root github:hopkinson/spotter codex --global
npx --yes --allow-git=root github:hopkinson/spotter claude-code --global
npx --yes --allow-git=root github:hopkinson/spotter antigravity-cli --global
# Update all recorded clients
npx --yes --allow-git=root github:hopkinson/spotter --global
```

Codex and Antigravity share one copy of the tools; Antigravity uses its native discovery manifest. Claude Code uses a separate copy. Adding clients preserves existing ones; replacing the client set requires `--global --replace-tools` with the selected clients. Global installation rejects unmanaged files and does not modify projects. Existing project installations require a separate, reviewed migration. See [installation details](INSTALL.md).

Requires Node.js 22+ and Git. Run from your project root:

```bash
# Codex (restart and use $spot-plan)
npx --yes --allow-git=root github:hopkinson/spotter codex

# Claude Code / Antigravity CLI (restart and use /spot-plan)
npx --yes --allow-git=root github:hopkinson/spotter claude-code
npx --yes --allow-git=root github:hopkinson/spotter antigravity-cli
```

Start a new session after installation, confirm entries such as `spot-plan` are visible, and ask the assistant to verify that shared rules and bundled helpers are actually loaded. Visible entries alone do not prove rules are loaded.

## Commands & Deliverables Quick Reference

> Note: In Codex, use the `$` prefix (e.g. `$spot-plan`). For state machine details and evidence ladders, see [Workflow Specification](docs/WORKFLOW_SPEC.md).

| Everyday Scenario | Command | Core Deliverables (Verifiable Evidence) |
| :--- | :--- | :--- |
| Add a feature | [`/spot-plan`](skills/spot-plan/SKILL.md) | **Before/After UI Sketch** + proposed core diff, confirmed before editing |
| Fix a bug | [`/spot-bug`](skills/spot-bug/SKILL.md) | **Reproduced call trace** + failing regression test & fix diff |
| Explore a feature | [`/spot-trace`](skills/spot-trace/SKILL.md) | **Interaction state flow** + exact code inventory (read-only) |
| Review diffs | [`/spot-review`](skills/spot-review/SKILL.md) | **`[Blocker]` / `[Nit]` checklist**, identifying redundancy and minimal fixes (read-only) |
| Cumulative risk audit | [`/spot-audit`](skills/spot-audit/SKILL.md) | **Vulnerability & test gap audit** (read-only) |
| Code health / cleanup | [`/spot-refactor`](skills/spot-refactor/SKILL.md) | **Dead code & orphan asset lists** + guard test assertions |
| Prepare release / deploy | [`/spot-release`](skills/spot-release/SKILL.md) | **Preflight checks**, push on approval & monitor deployment |
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
