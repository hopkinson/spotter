import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));

function fixture(t, checkout = false) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'spotter-global-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const home = path.join(directory, 'user home');
  const project = path.join(directory, 'project');
  for (const folder of [home, project]) fs.mkdirSync(folder);
  const source = checkout ? path.join(directory, 'source') : root;
  if (checkout) {
    for (const name of ['scripts', 'rules', 'skills', 'bundled-skills']) {
      fs.cpSync(path.join(root, name), path.join(source, name), { recursive: true });
    }
  }
  const run = (args = [], before = '', env = {}) => spawnSync(process.execPath, [
    '--input-type=module', '-e', `
      import os from 'node:os';
      os.homedir = () => ${JSON.stringify(home)};
      process.argv = [process.execPath, ${JSON.stringify(path.join(source, 'scripts/install.mjs'))}, ...${JSON.stringify(args)}];
      ${before}
      await import(${JSON.stringify(pathToFileURL(path.join(source, 'scripts/install.mjs')).href)});
    `,
  ], {
    cwd: project, encoding: 'utf8', timeout: 60_000,
    env: { ...process.env, HOME: home, USERPROFILE: home, CODEX_HOME: '', CLAUDE_CONFIG_DIR: '', ...env },
  });
  return { home, project, source, run };
}

function put(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const read = file => fs.readFileSync(file, 'utf8');
function ok(result) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
}

test('source metadata upgrades legacy receipts transactionally and pinned updates preserve edited files', t => {
  const { home, run } = fixture(t, true);
  ok(run(['--global']));
  const receipt = path.join(home, '.spotter/global-install.json');
  assert.equal(JSON.parse(read(receipt)).sourceCommit, undefined);
  const sha = 'a'.repeat(40);
  ok(run(['--global', '--source-commit', sha]));
  assert.equal(JSON.parse(read(receipt)).sourceCommit, sha);
  const entry = path.join(home, '.agents/skills/spot-plan/SKILL.md');
  fs.appendFileSync(entry, '\nLocal changes.\n');
  const before = read(receipt);
  const failed = run(['--global', '--source-commit', 'b'.repeat(40)]);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /locally edited/);
  assert.equal(read(receipt), before);
  assert.match(read(entry), /Local changes/);
});

test('global dual-client install updates once and preserves personal rules on removal', t => {
  const { home, project, source, run } = fixture(t, true);
  const codex = path.join(home, '.codex/AGENTS.md');
  const claude = path.join(home, '.claude/CLAUDE.md');
  put(codex, '# Personal Codex\r\n');
  put(claude, '# Personal Claude\n');
  put(path.join(project, 'AGENTS.md'), '# Project only\n');
  ok(run(['--global', 'codex', 'claude-code']));
  assert.deepEqual(fs.readdirSync(project), ['AGENTS.md']);
  const receipt = path.join(home, '.spotter/global-install.json');
  const initial = read(receipt);
  ok(run(['--global']));
  assert.equal(read(receipt), initial);
  for (const [folder, rules] of [['.agents', codex], ['.claude', claude]]) {
    const skill = path.join(home, folder, 'skills/spot-plan/SKILL.md');
    const refs = [...read(skill).matchAll(/`(\.\.\/\.\.\/bundled-skills\/[^`]+)`/g)];
    assert.ok(refs.length);
    for (const [, ref] of refs) assert.ok(fs.statSync(path.resolve(path.dirname(skill), ref)).isFile());
    assert.ok(read(rules).includes(path.join(home, folder, 'bundled-skills').replaceAll('\\', '/')));
  }
  fs.appendFileSync(path.join(source, 'skills/spot-plan/SKILL.md'), '\nUpdated shared entry.\n');
  fs.appendFileSync(path.join(source, 'rules/AGENTS.md'), '\nUpdated shared rule.\n');
  fs.appendFileSync(codex, 'Personal addition.\r\n');
  ok(run(['--global']));
  for (const folder of ['.agents', '.claude']) {
    assert.match(read(path.join(home, folder, 'skills/spot-plan/SKILL.md')), /Updated shared entry/);
  }
  for (const file of [codex, claude]) assert.match(read(file), /Updated shared rule/);
  ok(run(['--global', '--remove']));
  assert.equal(read(codex), '# Personal Codex\r\nPersonal addition.\r\n');
  assert.equal(read(claude), '# Personal Claude\n');
  assert.ok(!fs.existsSync(receipt));
  for (const folder of ['.agents', '.claude']) {
    assert.ok(!fs.existsSync(path.join(home, folder, 'bundled-skills')));
    assert.ok(!fs.existsSync(path.join(home, folder, 'skills/spot-plan')));
  }
});

test('global install rejects unmanaged and edited files before changing either client', t => {
  const { home, run } = fixture(t);
  const entry = path.join(home, '.claude/skills/spot-plan/SKILL.md');
  const codex = path.join(home, '.codex/AGENTS.md');
  put(codex, 'Keep Codex\n');
  put(entry, 'Unmanaged\n');
  const conflict = run(['--global', 'codex', 'claude-code']);
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr, /Unmanaged or locally edited/);
  assert.equal(read(codex), 'Keep Codex\n');
  assert.equal(read(entry), 'Unmanaged\n');
  assert.ok(!fs.existsSync(path.join(home, '.agents/bundled-skills')));
  fs.rmSync(path.dirname(entry), { recursive: true });
  ok(run(['--global', 'codex', 'claude-code']));
  const receipt = read(path.join(home, '.spotter/global-install.json'));
  fs.appendFileSync(entry, 'Local edit\n');
  for (const args of [['--global'], ['--global', '--remove']]) {
    assert.notEqual(run(args).status, 0);
    assert.equal(read(path.join(home, '.spotter/global-install.json')), receipt);
    assert.match(read(entry), /Local edit/);
  }
});

test('global interrupted transaction recovers both clients and preserves concurrent edits', t => {
  const { home, run } = fixture(t);
  const rules = path.join(home, '.codex/AGENTS.md');
  put(rules, 'Before Codex\n');
  put(path.join(home, '.claude/CLAUDE.md'), 'Before Claude\n');
  const crashed = run(['--global', 'codex', 'claude-code'], `
    const fs = (await import('node:fs')).default;
    const rename = fs.renameSync;
    fs.renameSync = (file, destination) => {
      rename(file, destination);
      if (file === ${JSON.stringify(rules)}) process.exit(77);
    };
  `);
  assert.equal(crashed.status, 77, crashed.stderr);
  put(rules, 'Concurrent save\n');
  assert.notEqual(run(['--global', '--recover']).status, 0);
  assert.equal(read(rules), 'Concurrent save\n');
  fs.unlinkSync(rules);
  ok(run(['--global', '--recover']));
  assert.equal(read(rules), 'Before Codex\n');
  assert.equal(read(path.join(home, '.claude/CLAUDE.md')), 'Before Claude\n');
  assert.ok(!fs.existsSync(path.join(home, '.spotter/global-install-staging')));
  assert.ok(!fs.existsSync(path.join(home, '.agents/bundled-skills')));
  assert.ok(!fs.existsSync(path.join(home, '.claude/bundled-skills')));
});

test('global scope rejects unsupported clients, custom roots and receipt path escapes', t => {
  const { home, project, run } = fixture(t);
  assert.notEqual(run(['--global', 'unknown-client']).status, 0);
  const custom = run(['--global', 'codex'], '', { CODEX_HOME: path.join(home, 'custom') });
  assert.notEqual(custom.status, 0);
  assert.match(custom.stderr, /CODEX_HOME/);
  assert.notEqual(run(['--global', 'claude-code'], '', { CLAUDE_CONFIG_DIR: path.join(home, 'custom') }).status, 0);
  ok(run(['--global', 'codex']));
  const receipt = path.join(home, '.spotter/global-install.json');
  const saved = read(receipt);
  const malicious = JSON.parse(saved);
  malicious.hashes['AGENTS.md'] = null;
  put(receipt, JSON.stringify(malicious));
  put(path.join(home, 'AGENTS.md'), 'Outside global scope\n');
  assert.notEqual(run(['--global', '--remove']).status, 0);
  assert.equal(read(path.join(home, 'AGENTS.md')), 'Outside global scope\n');
  put(receipt, saved);
  ok(run(['codex']));
  ok(run(['--global', '--remove']));
  assert.ok(fs.existsSync(path.join(project, '.agents/skills/spot-plan/SKILL.md')));
  assert.ok(fs.existsSync(path.join(project, '.spotter-install.json')));
});

test('global installation refuses a linked management directory', t => {
  const { home, project, run } = fixture(t);
  fs.symlinkSync(project, path.join(home, '.spotter'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = run(['--global', 'codex']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Linked path/);
  assert.deepEqual(fs.readdirSync(project), []);
});

test('globally installed frontend hooks run against the project without local bundles', t => {
  const { home, project, run } = fixture(t);
  ok(run(['--global', 'codex', 'claude-code']));
  const script = path.join(home, '.agents/bundled-skills/spot-impeccable/scripts/hook-admin.mjs');
  const enabled = spawnSync(process.execPath, [script, 'on'], {
    cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  ok(enabled);
  const enableAgain = spawnSync(process.execPath, [script, 'on'], {
    cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  ok(enableAgain);
  for (const manifest of ['.codex/hooks.json', '.claude/settings.local.json']) {
    const file = path.join(project, manifest);
    assert.ok(fs.existsSync(file), manifest);
    const hooks = JSON.parse(read(file)).hooks;
    assert.equal(hooks.PostToolUse.length, 1);
    const command = hooks.PostToolUse[0].hooks[0].command;
    assert.ok(!command.includes('CLAUDE_PROJECT_DIR'));
    const executed = spawnSync(command, {
      cwd: project, shell: true, input: '{}', encoding: 'utf8', timeout: 30_000,
      env: { ...process.env, HOME: home, USERPROFILE: home },
    });
    ok(executed);
  }
  assert.ok(!fs.existsSync(path.join(project, '.agents/bundled-skills')));
  assert.ok(!fs.existsSync(path.join(project, '.claude/bundled-skills')));
});

test('global frontend shortcuts stay local and point to the matching global helper', t => {
  const { home, project, run } = fixture(t);
  ok(run(['--global', 'codex', 'claude-code']));
  const script = path.join(home, '.agents/bundled-skills/spot-impeccable/scripts/pin.mjs');
  const pin = action => spawnSync(process.execPath, [script, action, 'polish'], {
    cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home },
  });
  ok(pin('pin'));
  for (const folder of ['.agents', '.claude']) {
    const shortcut = path.join(project, folder, 'skills/polish/SKILL.md');
    assert.ok(read(shortcut).includes(path.join(home, folder, 'bundled-skills/spot-impeccable/SKILL.md').replaceAll('\\', '/')));
    assert.ok(!fs.existsSync(path.join(home, folder, 'skills/polish')));
  }
  ok(pin('unpin'));
  assert.ok(!fs.existsSync(path.join(project, '.agents/skills/polish')));
  assert.ok(!fs.existsSync(path.join(project, '.claude/skills/polish')));
});

test('Antigravity discovers shared global tools through its native manifest', t => {
  const { home, project, run } = fixture(t);
  const rules = path.join(home, '.gemini/config/AGENTS.md');
  put(rules, '# Personal Antigravity\r\n');
  ok(run(['--global', 'antigravity-cli']));
  const manifest = JSON.parse(read(path.join(home, '.gemini/config/skills.json')));
  assert.equal(manifest.entries.length, 1);
  const entry = manifest.entries[0];
  assert.equal(path.resolve(entry.path), path.join(home, '.agents/skills'));
  assert.equal(entry.include_only.length, 10);
  for (const name of entry.include_only) assert.ok(fs.existsSync(path.join(entry.path, name, 'SKILL.md')));
  assert.ok(!fs.existsSync(path.join(home, '.gemini/config/skills')));
  assert.ok(read(rules).startsWith('# Personal Antigravity\r\n'));
  assert.ok(read(rules).includes(path.join(home, '.agents/bundled-skills').replaceAll('\\', '/')));
  assert.deepEqual(fs.readdirSync(project), []);
  ok(run(['--global', '--remove']));
  assert.equal(read(rules), '# Personal Antigravity\r\n');
  assert.ok(!fs.existsSync(path.join(home, '.gemini/config/skills.json')));
});

test('replace-tools switches Claude to Antigravity and preserves shared tools and user links', t => {
  const { home, run } = fixture(t);
  const codex = path.join(home, '.codex/AGENTS.md');
  const claude = path.join(home, '.claude/CLAUDE.md');
  const agy = path.join(home, '.gemini/config/AGENTS.md');
  put(codex, '# Personal Codex\n');
  put(claude, '# Personal Claude\n');
  put(agy, '# Personal Antigravity\n');
  put(path.join(home, '.claude/skills/user-tool/SKILL.md'), 'Keep this tool\n');
  ok(run(['--global', 'codex', 'claude-code']));
  const originalCodex = read(codex);
  const shared = path.join(home, '.agents/skills');
  const link = path.join(home, '.gemini/config/skills');
  fs.symlinkSync(shared, link, process.platform === 'win32' ? 'junction' : 'dir');
  ok(run(['--global', '--replace-tools', 'codex', 'antigravity-cli']));
  const receiptPath = path.join(home, '.spotter/global-install.json');
  const receipt = JSON.parse(read(receiptPath));
  assert.deepEqual(receipt.tools, ['antigravity-cli', 'codex']);
  assert.ok(!Object.keys(receipt.hashes).some(name => name.startsWith('.claude/')));
  assert.equal(read(codex), originalCodex);
  assert.equal(read(claude), '# Personal Claude\n');
  assert.equal(read(path.join(home, '.claude/skills/user-tool/SKILL.md')), 'Keep this tool\n');
  assert.ok(!fs.existsSync(path.join(home, '.claude/bundled-skills')));
  assert.ok(!fs.existsSync(path.join(home, '.claude/skills/spot-plan')));
  assert.equal(fs.realpathSync(link), fs.realpathSync(shared));
  const firstReceipt = read(receiptPath);
  ok(run(['--global']));
  assert.equal(read(receiptPath), firstReceipt);
  ok(run(['--global', '--replace-tools', 'antigravity-cli']));
  assert.equal(read(codex), '# Personal Codex\n');
  assert.ok(fs.existsSync(path.join(shared, 'spot-plan/SKILL.md')));
  ok(run(['--global', '--replace-tools', 'codex']));
  assert.equal(read(agy), '# Personal Antigravity\n');
  assert.ok(!fs.existsSync(path.join(home, '.gemini/config/skills.json')));
  assert.ok(fs.existsSync(path.join(shared, 'spot-plan/SKILL.md')));
  assert.equal(fs.realpathSync(link), fs.realpathSync(shared));
});

test('replace-tools blocks edited removed clients and unmanaged discovery manifests', t => {
  const { home, run } = fixture(t);
  ok(run(['--global', 'codex', 'claude-code']));
  const receiptPath = path.join(home, '.spotter/global-install.json');
  const receipt = read(receiptPath);
  const skill = path.join(home, '.claude/skills/spot-plan/SKILL.md');
  const original = read(skill);
  put(skill, original + '\nUser edit.\n');
  const args = ['--global', '--replace-tools', 'codex', 'antigravity-cli'];
  const conflict = run(args);
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr, /locally edited/);
  assert.equal(read(receiptPath), receipt);
  assert.equal(read(skill), original + '\nUser edit.\n');
  assert.ok(!fs.existsSync(path.join(home, '.gemini/config/AGENTS.md')));
  put(skill, original);
  const manifest = path.join(home, '.gemini/config/skills.json');
  const userManifest = '{"entries":[{"path":"custom-tools"}]}\n';
  put(manifest, userManifest);
  const discoveryConflict = run(args);
  assert.notEqual(discoveryConflict.status, 0);
  assert.match(discoveryConflict.stderr, /Unmanaged or locally edited/);
  assert.equal(read(manifest), userManifest);
  assert.equal(read(receiptPath), receipt);
  assert.ok(fs.existsSync(path.join(home, '.claude/bundled-skills')));
});

test('replace-tools interruption restores removed clients, rules, manifest and receipt', t => {
  const { home, run } = fixture(t);
  const claude = path.join(home, '.claude/CLAUDE.md');
  const agy = path.join(home, '.gemini/config/AGENTS.md');
  put(claude, '# Personal Claude\n');
  put(agy, '# Personal Antigravity\n');
  ok(run(['--global', 'codex', 'claude-code']));
  const receiptPath = path.join(home, '.spotter/global-install.json');
  const receipt = read(receiptPath);
  const claudeBefore = read(claude);
  const manifest = path.join(home, '.gemini/config/skills.json');
  const crashed = run(['--global', '--replace-tools', 'codex', 'antigravity-cli'], `
    const fs = (await import('node:fs')).default;
    const rename = fs.renameSync;
    fs.renameSync = (file, destination) => {
      rename(file, destination);
      if (destination === ${JSON.stringify(manifest)}) process.exit(77);
    };
  `);
  assert.equal(crashed.status, 77, crashed.stderr);
  ok(run(['--global', '--recover']));
  assert.equal(read(receiptPath), receipt);
  assert.equal(read(claude), claudeBefore);
  assert.equal(read(agy), '# Personal Antigravity\n');
  assert.ok(!fs.existsSync(manifest));
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/spot-plan/SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.agents/skills/spot-plan/SKILL.md')));
  assert.ok(!fs.existsSync(path.join(home, '.spotter/global-install-staging')));
});

test('replace-tools rejects ambiguous combinations before modifying the home directory', t => {
  const { home, run } = fixture(t);
  for (const args of [
    ['--replace-tools', 'codex'], ['--global', '--replace-tools'],
    ['--global', '--replace-tools', '--remove'], ['--global', '--replace-tools', '--recover'],
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /replace-tools/);
    assert.deepEqual(fs.readdirSync(home), []);
  }
});
