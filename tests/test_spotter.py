import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOG_SCRIPT = ROOT / "skills/spot-log/scripts/log.py"


class SpotterTests(unittest.TestCase):
    def test_manifest_discovers_entries_and_bundled_licenses(self):
        manifest = json.loads((ROOT / ".agents/skills.json").read_text(encoding="utf-8"))
        discovered = {
            path.parent.name
            for entry in manifest["entries"]
            for path in (ROOT / entry["path"]).glob("*/SKILL.md")
        }
        self.assertTrue(
            {"spot-plan", "spot-review", "spot-release", "spot-log", "spot-update"} <= discovered
        )
        for name in (
            "spot-before-after-sketch", "spot-ponytail", "spot-ponytail-review",
            "spot-diagnosing-bugs", "spot-communicating-concisely",
        ):
            self.assertIn(name, discovered)
            self.assertTrue((ROOT / "bundled-skills" / name / "LICENSE").is_file())
            skill = (ROOT / "bundled-skills" / name / "SKILL.md").read_text(encoding="utf-8")
            self.assertIn(f"\nname: {name}\n", skill)

    def test_rules_and_skills_are_tool_neutral(self):
        claude = (ROOT / "CLAUDE.md").read_text(encoding="utf-8")
        self.assertIn("@rules/AGENTS.md", claude)
        gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn("__pycache__/", gitignore)
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("https://github.com/hopkinson/spotter.git", readme)
        rules = (ROOT / "rules/AGENTS.md").read_text(encoding="utf-8")
        plan = (ROOT / "PLAN.md").read_text(encoding="utf-8")
        self.assertIn("正文末尾用一句话写清当前进度、待确认项和下一步", rules)
        self.assertIn("正常流程不报幕实际使用的 skill", rules)
        self.assertNotIn("用一行写实际使用的 skill", rules)
        self.assertNotIn("用一行说明实际使用的 skill", plan)
        sources = [ROOT / "rules/AGENTS.md", *(ROOT / "skills").glob("*/SKILL.md")]
        offenders = [str(p.relative_to(ROOT)) for p in sources
                     if "AGY" in p.read_text(encoding="utf-8")]
        self.assertEqual(offenders, [])

    def test_weekly_uses_latest_state_in_range(self):
        with tempfile.TemporaryDirectory() as directory:
            command = [
                sys.executable, "-X", "utf8", str(LOG_SCRIPT),
                "--log", str(Path(directory) / "worklog.jsonl"),
            ]
            evidence = "pytest -k amount: 1 passed（修复前 failed）"
            common = ["--project", "试点", "--task", "回款日期", "--evidence", evidence]
            for day, status, result in (
                ("2026-11-02", "local", "本地验收"),
                ("2026-11-04", "live", "线上验收"),
                ("2026-11-09", "blocked", "区间外"),
            ):
                subprocess.run(
                    command + ["add", *common, "--date", day, "--status", status, "--result", result],
                    check=True, capture_output=True,
                )
            output = subprocess.check_output(
                command + ["weekly", "--since", "2026-11-02", "--until", "2026-11-08"],
                encoding="utf-8",
            )
            self.assertIn("线上验收｜已上线并验证", output)
            self.assertIn(evidence, output)
            self.assertNotIn("本地验收", output)
            self.assertNotIn("区间外", output)

    def test_no_legacy_name_references(self):
        legacies = ("ds" + "h", "clean" + "rep", "re" + "p-")
        ignored_suffixes = {".png", ".pyc"}
        matched = []
        for path in ROOT.rglob("*"):
            if not path.is_file() or path.suffix in ignored_suffixes or ".git" in path.parts:
                continue
            if any(word in path.name.lower() for word in legacies):
                matched.append(f"filename: {path.relative_to(ROOT)}")
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            for line_no, line in enumerate(text.splitlines(), 1):
                if any(word in line.lower() for word in legacies):
                    matched.append(f"{path.relative_to(ROOT)}:{line_no}: {line.strip()}")
        self.assertEqual(matched, [], "Found legacy references:\n" + "\n".join(matched))


if __name__ == "__main__":
    unittest.main()
