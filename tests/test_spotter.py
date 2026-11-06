import json
import os
import re
import runpy
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
LOG_SCRIPT = ROOT / "skills/spot-log/scripts/log.py"
IMPECCABLE = ROOT / "bundled-skills/spot-impeccable/scripts"
PREVIEW = ROOT / "bundled-skills/spot-design-taste-frontend/scripts/lib/preview.mjs"
BUNDLED_SKILLS = (
    "spot-before-after-sketch",
    "spot-ponytail",
    "spot-ponytail-review",
    "spot-diagnosing-bugs",
    "spot-communicating-concisely",
    "spot-grilling",
    "spot-verification-before-completion",
    "spot-impeccable",
    "spot-design-taste-frontend",
)


class SpotterTests(unittest.TestCase):
    def test_manifest_discovers_entries_and_bundled_licenses(self):
        manifest = json.loads((ROOT / ".agents/skills.json").read_text(encoding="utf-8"))
        discovered = {
            path.parent.name
            for entry in manifest["entries"]
            for path in (ROOT / entry["path"]).glob("*/SKILL.md")
        }
        self.assertEqual(
            discovered,
            {"spot-plan", "spot-review", "spot-release", "spot-log", "spot-update"},
        )
        for name in BUNDLED_SKILLS:
            self.assertNotIn(name, discovered)
            self.assertTrue((ROOT / "bundled-skills" / name / "LICENSE").is_file())
            skill = (ROOT / "bundled-skills" / name / "SKILL.md").read_text(encoding="utf-8")
            self.assertIn(f"\nname: {name}\n", skill)
        self.assertTrue((ROOT / "bundled-skills/spot-impeccable/scripts").is_dir())
        self.assertTrue((ROOT / "bundled-skills/spot-impeccable/reference").is_dir())
        self.assertTrue((ROOT / "bundled-skills/spot-design-taste-frontend/scripts").is_dir())
        self.assertTrue((ROOT / "bundled-skills/spot-design-taste-frontend/references").is_dir())
        impeccable_skill = (ROOT / "bundled-skills/spot-impeccable/SKILL.md").read_text(encoding="utf-8")
        self.assertIn(".agents/bundled-skills/spot-impeccable/scripts/context.mjs", impeccable_skill)
        self.assertNotIn(".agents/skills/impeccable/", impeccable_skill)
        self.assertNotIn(".agents/skills/spot-impeccable/", impeccable_skill)
        hook_admin = ROOT / "bundled-skills/spot-impeccable/scripts/hook-admin.mjs"
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            (project / ".agents/bundled-skills/spot-impeccable/scripts").mkdir(parents=True)
            subprocess.run(
                ["node", str(hook_admin), "on"],
                cwd=project,
                check=True,
                capture_output=True,
                text=True,
            )
            hooks_json = (project / ".codex/hooks.json").read_text(encoding="utf-8")
            self.assertIn(".agents/bundled-skills/spot-impeccable/scripts/hook.mjs", hooks_json)

    def test_install_updates_one_snapshot_and_preserves_project_files(self):
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            source = temp / "source"
            project = temp / "project"
            project.mkdir()
            for name in ("skills", "bundled-skills", "rules", "scripts"):
                shutil.copytree(ROOT / name, source / name)
            command = [sys.executable, str(source / "scripts/install.py")]
            agents = project / "AGENTS.md"
            claude = project / "CLAUDE.md"
            agents.write_bytes(b"# Project rules\r\n")
            claude.write_bytes(b"# Claude project rules\n")
            other_skill = project / ".agents/skills/local-skill/SKILL.md"
            other_skill.parent.mkdir(parents=True)
            other_skill.write_bytes(b"Project skill\n")

            def run(*args, check=True):
                return subprocess.run(command + list(args), cwd=project, check=check,
                                      capture_output=True, text=True, encoding="utf-8")

            run("codex", "claude-code", "antigravity-cli")
            receipt = project / ".spotter-install.json"
            first_receipt = receipt.read_bytes()
            run()
            self.assertEqual(receipt.read_bytes(), first_receipt)
            old_rule = agents.read_bytes()
            self.assertTrue(old_rule.startswith(b"# Project rules\r\n<!-- spotter:begin -->\r\n"))
            self.assertEqual(old_rule.count(b"<!-- spotter:begin -->"), 1)

            entry = "skills/spot-plan/SKILL.md"
            helper = "bundled-skills/spot-grilling/SKILL.md"
            installed_entry = project / ".agents" / entry
            original_entry = installed_entry.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
            installed_entry.write_bytes(original_entry)
            run()
            installed_entry.write_bytes(original_entry + b"\nLocal change.\n")
            changed = b"\nUpdated checkout.\n"
            for relative in (entry, helper, "rules/AGENTS.md"):
                file = source / relative
                file.write_bytes(file.read_bytes() + changed)
            conflict = run(check=False)
            self.assertNotEqual(conflict.returncode, 0)
            self.assertIn("locally edited", conflict.stderr)
            self.assertEqual(agents.read_bytes(), old_rule)
            self.assertEqual(receipt.read_bytes(), first_receipt)
            self.assertEqual(installed_entry.read_bytes(), original_entry + b"\nLocal change.\n")
            installed_entry.write_bytes(original_entry)
            agents.write_bytes(old_rule + b"Project addition.\r\n")

            run()
            for folder, rule in ((".agents", agents), (".claude", claude)):
                home = project / folder
                self.assertEqual(
                    {item.parent.name for item in (home / "skills").glob("spot-*/SKILL.md")},
                    {item.parent.name for item in (source / "skills").glob("*/SKILL.md")},
                )
                for relative in (entry, helper):
                    self.assertEqual((home / relative).read_bytes(), (source / relative).read_bytes())
                for name in ("spot-plan", "spot-review", "spot-update"):
                    skill = home / "skills" / name / "SKILL.md"
                    references = re.findall(r"`(\.\./\.\./bundled-skills/[^`]+)`", skill.read_text(encoding="utf-8"))
                    self.assertTrue(references, name)
                    for reference in references:
                        self.assertTrue((skill.parent / reference).is_file(), reference)
                self.assertIn(b"Updated checkout.", rule.read_bytes())

            run("--remove")
            self.assertFalse(receipt.exists())
            self.assertEqual(agents.read_bytes(), b"# Project rules\r\nProject addition.\r\n")
            self.assertEqual(claude.read_bytes(), b"# Claude project rules\n")
            self.assertEqual(other_skill.read_bytes(), b"Project skill\n")
            for folder in (".agents", ".claude"):
                home = project / folder
                self.assertFalse((home / "bundled-skills").exists())
                self.assertFalse(list((home / "skills").glob("spot-*")))

    def test_install_rejects_unmanaged_rules_before_writing(self):
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            agents = project / "AGENTS.md"
            agents.write_bytes(b"<!-- spotter:begin -->\n")
            result = subprocess.run(
                [sys.executable, str(ROOT / "scripts/install.py")],
                cwd=project, capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(b"Invalid Spotter markers", result.stderr)
            self.assertEqual(sorted(project.iterdir()), [agents])

    def test_install_rolls_back_when_rules_change_during_write(self):
        install = runpy.run_path(str(ROOT / "scripts/install.py"))["install"]
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            rules = project / "AGENTS.md"
            updated = b"# Project rules\nEditor saved another line.\n"
            rules.write_bytes(b"# Project rules\n")
            staging = project / ".spotter-install-staging"
            staging.mkdir()
            rename = Path.rename

            def save_before_backup(path, destination):
                if path == rules:
                    rules.write_bytes(updated)
                return rename(path, destination)

            with patch.object(Path, "rename", save_before_backup):
                with self.assertRaisesRegex(ValueError, "File changed during installation"):
                    install(project, ["codex"], False, staging)

            self.assertEqual(rules.read_bytes(), updated)
            self.assertFalse((project / ".spotter-install.json").exists())
            self.assertFalse((project / ".agents/bundled-skills").exists())
            self.assertFalse(list((project / ".agents/skills").glob("spot-*")))

    def test_frontend_shortcut_stays_in_project_and_reads_bundled_skill(self):
        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory)
            (parent / ".git").mkdir()
            project = parent / "project"
            bundle = Path(".agents/bundled-skills/spot-impeccable")
            for base, folder in ((parent, bundle), (project, bundle), (project, Path(".claude") / Path(*bundle.parts[1:]))):
                helper = base / folder
                (helper / "scripts").mkdir(parents=True)
                (helper / "SKILL.md").write_text("Bundled workflow", encoding="utf-8")
            script = project / bundle / "scripts/pin.mjs"
            shutil.copyfile(ROOT / bundle.relative_to(".agents") / "scripts/pin.mjs", script)

            def run(action, cwd=project, check=True):
                return subprocess.run(["node", str(script), action, "polish"], cwd=cwd,
                                      check=check, capture_output=True, text=True)

            self.assertNotEqual(run("pin", cwd=parent, check=False).returncode, 0)
            run("pin")
            self.assertFalse((parent / ".agents/skills/polish").exists())
            for folder in (".agents", ".claude"):
                shortcut = project / folder / "skills/polish/SKILL.md"
                reference = re.search(r"Read `([^`]+)`", shortcut.read_text(encoding="utf-8"))[1]
                self.assertEqual((shortcut.parent / reference).resolve(),
                                 project / folder / "bundled-skills/spot-impeccable/SKILL.md")
            notes = project / ".agents/skills/polish/notes.txt"
            notes.write_text("Keep", encoding="utf-8")
            shortcut = notes.with_name("SKILL.md")
            original = shortcut.read_bytes()
            edited = original + b"\nLocal instruction\n"
            shortcut.write_bytes(edited)
            for action in ("pin", "unpin"):
                self.assertNotEqual(run(action, check=False).returncode, 0)
                self.assertEqual(shortcut.read_bytes(), edited)
                self.assertTrue((project / ".claude/skills/polish/SKILL.md").is_file())
            shortcut.write_bytes(original)
            run("unpin")
            self.assertTrue(notes.is_file())
            for folder in (".agents", ".claude"):
                self.assertFalse((project / folder / "skills/polish/SKILL.md").exists())

    def test_recovers_after_process_dies_with_rules_in_staging(self):
        script = ROOT / "scripts/install.py"
        interrupt = """
import os
import runpy
import sys
from pathlib import Path

rename = Path.rename
def stop_after_backup(path, destination):
    result = rename(path, destination)
    if path.name == 'AGENTS.md':
        os._exit(77)
    return result

Path.rename = stop_after_backup
runpy.run_path(sys.argv.pop(), run_name='__main__')
"""
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            rules = project / "AGENTS.md"
            rules.write_bytes(b"# Project rules\r\n")
            crashed = subprocess.run([sys.executable, "-c", interrupt, str(script)], cwd=project)
            self.assertEqual(crashed.returncode, 77)
            self.assertFalse(rules.exists())
            recovery = [sys.executable, str(script), "--recover"]
            rules.write_bytes(b"Concurrent edit\n")
            blocked = subprocess.run(recovery, cwd=project, capture_output=True)
            self.assertNotEqual(blocked.returncode, 0)
            self.assertEqual(rules.read_bytes(), b"Concurrent edit\n")
            rules.rename(project / "saved-edit.md")
            subprocess.run(recovery, cwd=project, check=True, capture_output=True)
            self.assertEqual(rules.read_bytes(), b"# Project rules\r\n")
            self.assertEqual((project / "saved-edit.md").read_bytes(), b"Concurrent edit\n")
            self.assertFalse((project / ".spotter-install-staging").exists())
            self.assertFalse((project / ".agents/bundled-skills").exists())

    def test_git_ignore_treats_shell_syntax_as_a_literal_filename(self):
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            subprocess.run(["git", "init", "-q"], cwd=project, check=True, capture_output=True)
            fixture = "$(touch${IFS}audit-marker).html"
            (project / fixture).write_text("<p>Fixture</p>", encoding="utf-8")
            (project / ".gitignore").write_text("ignored.html\n", encoding="utf-8")
            program = """
import assert from 'node:assert/strict';
const { isGeneratedFile } = await import(process.argv[1]);
assert.equal(isGeneratedFile(process.argv[2]), false);
assert.equal(isGeneratedFile('ignored.html'), true);
"""
            module = IMPECCABLE / "lib/is-generated.mjs"
            subprocess.run(["node", "--input-type=module", "-e", program, module.as_uri(), fixture],
                           cwd=project, check=True, capture_output=True, timeout=10)
            self.assertFalse((project / "audit-marker").exists())

    def test_preview_only_serves_public_files_and_survives_missing_index(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            root = base / "public"
            root.mkdir()
            (root / "index.html").write_text("<h1>Preview</h1>", encoding="utf-8")
            (root / "empty").mkdir()
            (root / ".env").write_text("fake secret", encoding="utf-8")
            outside = base / "outside"
            outside.mkdir()
            (outside / "file.txt").write_text("private", encoding="utf-8")
            link = root / "linked"
            if os.name == "nt":
                subprocess.run(["cmd", "/d", "/c", "mklink", "/j", str(link), str(outside)],
                               check=True, capture_output=True)
            else:
                link.symlink_to(outside, target_is_directory=True)
            program = """
import assert from 'node:assert/strict';
const { preview } = await import(process.argv[1]);
const { url, server } = await preview('index.html');
try {
    for (const [path, status] of [
        ['/empty/', 404], ['/.env', 403], ['/linked/file.txt', 403], ['/index.html', 200],
    ]) {
        const response = await fetch(new URL(path, url));
        assert.equal(response.status, status, path);
        if (status === 200) assert.equal(await response.text(), '<h1>Preview</h1>');
    }
} finally {
    server.close();
}
"""
            subprocess.run(["node", "--input-type=module", "-e", program, PREVIEW.as_uri()],
                           cwd=root, check=True, capture_output=True, timeout=15)

    def test_question_rejects_forged_and_unlisted_answers(self):
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            payload = project / "question.json"
            payload.write_text('{"options":[{"id":"valid","label":"Valid"}]}', encoding="utf-8")
            command = ["node", str(IMPECCABLE / "serve-question.mjs"),
                       "--payload", str(payload), "--no-open", "--timeout", "10"]
            with subprocess.Popen(command, cwd=project, stdout=subprocess.PIPE,
                                  stderr=subprocess.PIPE, encoding="utf-8") as server:
                try:
                    line = server.stdout.readline()
                    self.assertTrue(line.startswith("QUESTION URL: "), line)
                    url = line.removeprefix("QUESTION URL: ").strip()
                    with urlopen(url, timeout=3) as response:
                        page = response.read().decode("utf-8")
                    token = re.search(r"'x-answer-token': '([a-f0-9]+)'", page)[1]

                    def submit(body, headers):
                        request = Request(url + "answer", data=body, headers=headers)
                        with urlopen(request, timeout=3) as response:
                            return response.status

                    for body, headers, status in (
                        (b'{"optionId":"valid"}', {"Origin": "https://unrelated.invalid"}, 403),
                        (b'{"optionId":"unlisted"}', {"X-Answer-Token": token}, 400),
                        (b" " * 16385, {"X-Answer-Token": token}, 413),
                    ):
                        with self.assertRaises(HTTPError) as denied:
                            submit(body, headers)
                        self.assertEqual(denied.exception.code, status)
                        denied.exception.close()
                    self.assertEqual(submit(b'{"optionId":"valid"}', {"X-Answer-Token": token}), 200)
                    output, errors = server.communicate(timeout=5)
                    self.assertEqual(server.returncode, 0, errors)
                    self.assertIn('ANSWER: {"optionId":"valid","steer":""}', output)
                finally:
                    if server.poll() is None:
                        server.kill()

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
        legacy_pattern = re.compile(
            r"(?<![a-z0-9])(" + "ds" + "h(?![a-z0-9])|" + "clean" + "rep(?![a-z0-9])|" + "re" + "p-)",
            re.IGNORECASE,
        )
        ignored_suffixes = {".png", ".pyc"}
        matched = []
        for path in ROOT.rglob("*"):
            if not path.is_file() or path.suffix in ignored_suffixes or ".git" in path.parts:
                continue
            if legacy_pattern.search(path.name):
                matched.append(f"filename: {path.relative_to(ROOT)}")
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            for line_no, line in enumerate(text.splitlines(), 1):
                if legacy_pattern.search(line):
                    matched.append(f"{path.relative_to(ROOT)}:{line_no}: {line.strip()}")
        self.assertEqual(matched, [], "Found legacy references:\n" + "\n".join(matched))


if __name__ == "__main__":
    unittest.main()
