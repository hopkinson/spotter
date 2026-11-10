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

## Why Spotter?

> **The biggest dilemma in AI coding isn't generating code—it's losing control.** Traditional AI assistants generate verbose polite chatter, overly nested lists, and unverified black-box code changes that leave developers in the dark.

Spotter injects three core guardrails into your AI coding assistant:

1. **Default Concise Mode**: Cuts all conversational filler ("Sure!", "I'd be happy to..."). The first sentence gives the direct conclusion or result, uses `X → Y` cause-and-effect, and stays readable in a single screen. Full background details appear only when asked to "expand".
2. **Read-Only Inspection & Visual Previews**: Never modifies business code without human approval. AI inspects read-only, generates before/after sketch previews and proposed diffs, and waits for your "proceed".
3. **Verified Evidence Loop**: After modifications, AI automatically executes the project's tests/builds in the terminal and delivers actual terminal evidence with exit code 0—never false verbal promises.

### Real-world Flow: Adding an "Export Excel" Button (`/spot-plan`)

1. **You ask**:
   ```text
   /spot-plan Add an "Export Excel" button on the order list page
   ```

2. **AI inspects read-only and shows a clear before/after preview & diff** (without touching code):
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

## Quick Start

Requires Node.js 22+ and Git. Run from your project root:

```bash
# Codex (restart and use $spot-plan)
npx --yes --allow-git=root github:hopkinson/spotter codex

# Claude Code / Antigravity CLI (restart and use /spot-plan)
npx --yes --allow-git=root github:hopkinson/spotter claude-code
npx --yes --allow-git=root github:hopkinson/spotter antigravity-cli
```

## Commands & Deliverables Quick Reference

> Note: In Codex, use the `$` prefix (e.g. `$spot-plan`). For state machine details and evidence ladders, see [Workflow Specification](docs/WORKFLOW_SPEC.md).

| Everyday Scenario | Command | Core Deliverables (Verifiable Evidence) |
| :--- | :--- | :--- |
| Add a feature | [`/spot-plan`](skills/spot-plan/SKILL.md) | **Before/After UI Sketch** + proposed core diff, confirmed before editing |
| Fix a bug | [`/spot-bug`](skills/spot-bug/SKILL.md) | **Reproduced call trace** + failing regression test & fix diff |
| Explore a feature | [`/spot-trace`](skills/spot-trace/SKILL.md) | **Interaction state flow** + exact code inventory (read-only) |
| Review diffs | [`/spot-review`](skills/spot-review/SKILL.md) | **`[Blocker]` / `[Nit]` checklist**, stripping out redundant code |
| Cumulative risk audit | [`/spot-audit`](skills/spot-audit/SKILL.md) | **Vulnerability & test gap audit** (read-only) |
| Code health / cleanup | [`/spot-refactor`](skills/spot-refactor/SKILL.md) | **Dead code & orphan asset lists** + guard test assertions |
| Prepare release / deploy | [`/spot-release`](skills/spot-release/SKILL.md) | **Preflight checks**, push on approval & monitor deployment |
| Maintain code graph | [`/spot-graph`](skills/spot-graph/SKILL.md) | **Incremental code graph**, auto-refreshed on commit |
| Write weekly report | [`/spot-log`](skills/spot-log/SKILL.md) | **Task audit logs** ➜ auto-generated structured weekly report |
| Upgrade bundled skills | [`/spot-update`](skills/spot-update/SKILL.md) | **Upstream version & license check**, upgraded on approval |

## Update and Remove

To update installed tools:

```bash
npx --yes --allow-git=root github:hopkinson/spotter
```

To remove Spotter, disable any manual graph refresh or hooks first, then run:

```bash
npx --yes --allow-git=root github:hopkinson/spotter --remove
```

The command cleans up installed skills and marked rule sections while preserving project rules and private logs. See [Installation Guide](INSTALL.md) for details.

## Contributing

Issues and pull requests are welcome. `npm test` checks packaging and the installer. Use [Workflow Replay Cases](tests/workflow-replay.md) to check behavior across scenarios.

## License & Third-Party Sources

This project is licensed under the [MIT License](LICENSE). Third-party skills in `bundled-skills/` retain their original licenses; see [Third-party skill sources](bundled-skills/SOURCES.md).
