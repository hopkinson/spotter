<div align="center">
  <img src="assets/logo.svg" width="120" alt="Spotter logo" />
  <h1>Spotter</h1>
  <p><b>Turn everyday engineering habits into workflows for AI coding assistants.</b></p>
  <p><a href="README.md">中文</a> · English</p>
</div>

## Why Spotter

AI can write code quickly, but projects still need clear requirements, verifiable root causes, and reliable validation. Spotter connects these steps through rules and skills:

Make and verify small, low-risk changes directly. Confirm the plan once for medium-risk work. Use two confirmations for high-risk work or when the user explicitly requests the full workflow.

| Situation | Without a shared approach | With Spotter |
| --- | --- | --- |
| Fixing a bug | Guess the cause and start editing | Check the cause first, report any gaps in reproduction, and match the confirmation process to the risk. |
| Building a feature | Fill in missing requirements and discover a mismatch later | Resolve decisions that affect the outcome, then agree on behavior, approach, and acceptance cases. An explicit `/spot-plan` request uses two confirmations. |
| Delivering changes | Say “done” without explaining what was checked | Implement the confirmed plan and report the checks run and what remains uncovered. |
| Reviewing code | Look only at the diff and miss callers or edge cases | Use `/spot-review` to examine requirements, callers, and tests, and report concrete findings and verification gaps. |
| Releasing | Mix up local success, a successful push, and production verification | Use `/spot-release` for preflight checks; after authorization, follow deployment and distinguish evidence at each stage. |
| Writing a weekly report | Rely on memory and blur progress with results | Use `/spot-log` to draft a report from local records, distinguishing local checks from production verification. |

These are the working practices Spotter asks assistants to follow. Results depend on whether the tool loads the rules and skills and on the verification available in the project.

Maintainers can use the [workflow replay cases](tests/workflow-replay.md) to check assistant behavior after changes to rules, skills, or models. Repository tests do not replace those replays.

## Skills

Spotter provides five public entry points. Rules and entry points call internal helper skills as needed.

| Skill | When to use it | What it does |
| --- | --- | --- |
| [`spot-plan`](skills/spot-plan/SKILL.md) | Starting a feature or changing behavior | Clarifies requirements, boundaries, and acceptance criteria; aligns on a sketch and waits for confirmation. |
| [`spot-review`](skills/spot-review/SKILL.md) | Reviewing a set of changes | Performs a read-only review of correctness, tests, and redundancy; reports findings and verification gaps. |
| [`spot-release`](skills/spot-release/SKILL.md) | Preparing or tracking a release | Checks builds, regressions, and migrations; after authorization, pushes, follows deployment, and checks production results. |
| [`spot-log`](skills/spot-log/SKILL.md) | Recording task results or writing a weekly report | Saves results and verification evidence locally and drafts reports on request. Requires Python 3. |
| [`spot-update`](skills/spot-update/SKILL.md) | Maintaining bundled skills | Checks upstream versions and licenses in the Spotter repository, reports update candidates, and waits for confirmation before upgrading. |

Invocation varies by tool. If a command is unavailable, ask your assistant to use the skill by name.

## Install

Use one command to install or update public entry points, internal helpers, and collaboration rules in your project. The installer supports Codex, Claude Code, and Antigravity CLI and requires Git and Python 3.12+. See the [installation guide](INSTALL.md).

### Try temporarily with AGY

To try Spotter without installing Node.js:

```bash
git clone https://github.com/hopkinson/spotter.git
agy --add-dir <Spotter-directory>
```

Start `agy` in your target project and replace `<Spotter-directory>` with the absolute path to the clone. This also works in Windows PowerShell. Omit `--add-dir` on the next launch to stop using it; use `/skills` in AGY to inspect available skills.

## Contributing

Issues and pull requests are welcome. Please include runnable tests with changes.

## License and third-party sources

This project is licensed under the [MIT License](LICENSE). Third-party skills in `bundled-skills/` retain their own licenses; see [third-party skill sources](bundled-skills/SOURCES.md) for origins and versions.
