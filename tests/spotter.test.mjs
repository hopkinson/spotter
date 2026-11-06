import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const installer = path.join(root, 'scripts/install.mjs');
const logScript = path.join(root, 'skills/spot-log/scripts/log.mjs');
const impeccable = path.join(root, 'bundled-skills/spot-impeccable/scripts');
const preview = path.join(root, 'bundled-skills/spot-design-taste-frontend/scripts/lib/preview.mjs');
const bundledSkills = [
  'spot-before-after-sketch', 'spot-ponytail', 'spot-ponytail-review', 'spot-diagnosing-bugs',
  'spot-communicating-concisely', 'spot-grilling', 'spot-verification-before-completion',
  'spot-impeccable', 'spot-design-taste-frontend',
];

function temp(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'spotter-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function node(cwd, ...args) {
  return execFileSync(process.execPath, args, { cwd, encoding: 'utf8', stdio: 'pipe', timeout: 30_000 });
}

function probe(cwd, ...args) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 30_000 });
  if (result.error) throw result.error;
  return result;
}

function put(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function entries(home) {
  return fs.readdirSync(home).filter(name => fs.existsSync(path.join(home, name, 'SKILL.md'))).sort();
}

test('manifest discovers public entries and bundled licenses', t => {
  const manifest = JSON.parse(read(path.join(root, '.agents/skills.json')));
  const discovered = manifest.entries.flatMap(entry => entries(path.join(root, entry.path))).sort();
  assert.deepEqual(discovered, ['spot-log', 'spot-plan', 'spot-release', 'spot-review', 'spot-update']);
  for (const name of bundledSkills) {
    assert.ok(!discovered.includes(name), name);
    const directory = path.join(root, 'bundled-skills', name);
    assert.ok(fs.statSync(path.join(directory, 'LICENSE')).isFile());
    assert.ok(read(path.join(directory, 'SKILL.md')).replaceAll('\r\n', '\n').includes(`\nname: ${name}\n`));
  }
  for (const name of ['spot-impeccable', 'spot-design-taste-frontend']) {
    for (const directory of ['scripts', 'reference' + (name === 'spot-impeccable' ? '' : 's')]) {
      assert.ok(fs.statSync(path.join(root, 'bundled-skills', name, directory)).isDirectory());
    }
  }
  const impeccableSkill = read(path.join(impeccable, '../SKILL.md'));
  assert.ok(impeccableSkill.includes('.agents/bundled-skills/spot-impeccable/scripts/context.mjs'));
  assert.doesNotMatch(impeccableSkill, /\.agents\/skills\/(?:spot-)?impeccable\//);
  const project = temp(t);
  fs.mkdirSync(path.join(project, '.agents/bundled-skills/spot-impeccable/scripts'), { recursive: true });
  node(project, path.join(impeccable, 'hook-admin.mjs'), 'on');
  assert.ok(read(path.join(project, '.codex/hooks.json')).includes('.agents/bundled-skills/spot-impeccable/scripts/hook.mjs'));
});

test('installation updates one snapshot and preserves project files', t => {
  const directory = temp(t);
  const source = path.join(directory, 'source');
  const project = path.join(directory, 'project');
  fs.mkdirSync(project);
  for (const name of ['skills', 'bundled-skills', 'rules', 'scripts']) {
    fs.cpSync(path.join(root, name), path.join(source, name), { recursive: true });
  }
  const script = path.join(source, 'scripts/install.mjs');
  const agents = path.join(project, 'AGENTS.md');
  const claude = path.join(project, 'CLAUDE.md');
  const otherSkill = path.join(project, '.agents/skills/local-skill/SKILL.md');
  put(agents, '# Project rules\r\n');
  put(claude, '# Claude project rules\n');
  put(otherSkill, 'Project skill\n');
  node(project, script, 'codex', 'claude-code', 'antigravity-cli');
  const receipt = path.join(project, '.spotter-install.json');
  const firstReceipt = read(receipt);
  node(project, script);
  assert.equal(read(receipt), firstReceipt);
  const oldRule = read(agents);
  assert.ok(oldRule.startsWith('# Project rules\r\n<!-- spotter:begin -->\r\n'));
  assert.equal(oldRule.split('<!-- spotter:begin -->').length - 1, 1);

  const entry = 'skills/spot-plan/SKILL.md';
  const helper = 'bundled-skills/spot-grilling/SKILL.md';
  const installedEntry = path.join(project, '.agents', entry);
  const originalEntry = read(installedEntry).replaceAll('\r\n', '\n').replaceAll('\n', '\r\n');
  put(installedEntry, originalEntry);
  node(project, script);
  const editedEntry = originalEntry + '\nLocal change.\n';
  put(installedEntry, editedEntry);
  for (const name of [entry, helper, 'rules/AGENTS.md']) {
    fs.appendFileSync(path.join(source, name), '\nUpdated checkout.\n');
  }
  const conflict = probe(project, script);
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr, /locally edited/);
  assert.equal(read(agents), oldRule);
  assert.equal(read(receipt), firstReceipt);
  assert.equal(read(installedEntry), editedEntry);
  put(installedEntry, originalEntry);
  fs.appendFileSync(agents, 'Project addition.\r\n');

  node(project, script);
  for (const [folder, rule] of [['.agents', agents], ['.claude', claude]]) {
    const home = path.join(project, folder);
    assert.deepEqual(entries(path.join(home, 'skills')).filter(name => name.startsWith('spot-')), entries(path.join(source, 'skills')));
    for (const name of [entry, helper]) {
      assert.deepEqual(fs.readFileSync(path.join(home, name)), fs.readFileSync(path.join(source, name)));
    }
    for (const name of ['spot-plan', 'spot-review', 'spot-update']) {
      const skill = path.join(home, 'skills', name, 'SKILL.md');
      const refs = [...read(skill).matchAll(/`(\.\.\/\.\.\/bundled-skills\/[^`]+)`/g)];
      assert.ok(refs.length, name);
      for (const [, ref] of refs) assert.ok(fs.statSync(path.resolve(path.dirname(skill), ref)).isFile(), ref);
    }
    assert.match(read(rule), /Updated checkout\./);
  }

  node(project, script, '--remove');
  assert.ok(!fs.existsSync(receipt));
  assert.equal(read(agents), '# Project rules\r\nProject addition.\r\n');
  assert.equal(read(claude), '# Claude project rules\n');
  assert.equal(read(otherSkill), 'Project skill\n');
  for (const folder of ['.agents', '.claude']) {
    assert.ok(!fs.existsSync(path.join(project, folder, 'bundled-skills')));
    assert.ok(!entries(path.join(project, folder, 'skills')).some(name => name.startsWith('spot-')));
  }
});

test('installation rejects unmanaged rules before writing', t => {
  const project = temp(t);
  put(path.join(project, 'AGENTS.md'), '<!-- spotter:begin -->\n');
  const result = probe(project, installer);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid Spotter markers/);
  assert.deepEqual(fs.readdirSync(project), ['AGENTS.md']);
});

test('updates files managed by the released Python installer', t => {
  const project = temp(t);
  const rules = path.join(project, 'AGENTS.md');
  const skill = path.join(project, '.agents/skills/spot-plan/SKILL.md');
  const helper = path.join(project, '.agents/bundled-skills/example.md');
  put(rules, '# Project rules\r\n<!-- spotter:begin -->\r\n# Spotter rules\r\n<!-- spotter:end -->\r\n');
  put(skill, 'Legacy skill\r\n');
  put(helper, 'Legacy helper\n');
  // Frozen output from commit 5ef8fba's installer using the files above.
  put(path.join(project, '.spotter-install.json'), JSON.stringify({
    tools: ['codex'],
    hashes: {
      '.agents/bundled-skills': 'ac2a3479e0ec837e4b31d963bd55c63ba371beb6ef2ceb24ff05522d505abbd5',
      '.agents/skills/spot-plan': 'b32ce8992602ba8ad561f46f323d85c3bd93e068e405c94ed222f40aac452920',
      'AGENTS.md': '2c8ba336b7a3849a0d2919e1523ebdcb9168521dba9ec382ec1cf439e1d5adc4',
    },
  }, null, 2).replaceAll('\n', '\r\n') + '\r\n');

  node(project, installer);
  assert.ok(read(rules).startsWith('# Project rules\r\n<!-- spotter:begin -->\r\n'));
  assert.deepEqual(fs.readFileSync(skill), fs.readFileSync(path.join(root, 'skills/spot-plan/SKILL.md')));
  assert.ok(!fs.existsSync(helper));
  assert.ok(fs.statSync(path.join(project, '.agents/bundled-skills/spot-grilling/SKILL.md')).isFile());
});

const npmCli = process.env.npm_execpath;
test('installs project rules and a runnable logger from the npm package', { skip: !npmCli && 'Run via npm test' }, t => {
  const directory = temp(t);
  const project = path.join(directory, 'project');
  fs.mkdirSync(project);
  node(root, npmCli, 'pack', '--offline', '--pack-destination', directory);
  const archives = fs.readdirSync(directory).filter(file => file.endsWith('.tgz'));
  assert.equal(archives.length, 1);
  const archive = path.join(directory, archives[0]);
  node(project, npmCli, 'exec', '--offline', '--yes', '--cache', path.join(directory, 'cache'), `--package=${archive}`, '--', 'spotter', 'codex');

  assert.match(read(path.join(project, 'AGENTS.md')), /<!-- spotter:begin -->/);
  const installedLog = path.join(project, '.agents/skills/spot-log/scripts/log.mjs');
  assert.match(node(project, installedLog, '--help'), /weekly/);
});

test('installation rolls back when rules change during write', t => {
  const project = temp(t);
  const rules = path.join(project, 'AGENTS.md');
  put(rules, '# Project rules\n');
  const updated = '# Project rules\nEditor saved another line.\n';
  const concurrentEdit = `
    import fs from 'node:fs';
    import path from 'node:path';
    const rename = fs.renameSync;
    fs.renameSync = (file, destination) => {
      if (path.basename(file) === 'AGENTS.md') fs.writeFileSync(file, ${JSON.stringify(updated)});
      return rename(file, destination);
    };
    await import(process.argv[1]);
  `;
  const result = probe(project, '--input-type=module', '-e', concurrentEdit, pathToFileURL(installer).href);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /File changed during installation/);
  assert.equal(read(rules), updated);
  assert.ok(!fs.existsSync(path.join(project, '.spotter-install.json')));
  assert.ok(!fs.existsSync(path.join(project, '.agents/bundled-skills')));
  assert.ok(!entries(path.join(project, '.agents/skills')).some(name => name.startsWith('spot-')));
});

test('frontend shortcut stays in the project and reads the bundled skill', t => {
  const parent = temp(t);
  fs.mkdirSync(path.join(parent, '.git'));
  const project = path.join(parent, 'project');
  const bundle = 'bundled-skills/spot-impeccable';
  for (const base of [path.join(parent, '.agents'), path.join(project, '.agents'), path.join(project, '.claude')]) {
    const helper = path.join(base, bundle);
    fs.mkdirSync(path.join(helper, 'scripts'), { recursive: true });
    put(path.join(helper, 'SKILL.md'), 'Bundled workflow');
  }
  const script = path.join(project, '.agents', bundle, 'scripts/pin.mjs');
  fs.copyFileSync(path.join(impeccable, 'pin.mjs'), script);
  assert.notEqual(probe(parent, script, 'pin', 'polish').status, 0);
  assert.ok(!fs.existsSync(path.join(parent, '.agents/skills/polish')));
  node(project, script, 'pin', 'polish');
  const shortcuts = ['.agents', '.claude'].map(folder => path.join(project, folder, 'skills/polish/SKILL.md'));
  for (const [index, folder] of ['.agents', '.claude'].entries()) {
    const shortcut = shortcuts[index];
    const [, ref] = /Read `([^`]+)`/.exec(read(shortcut));
    assert.equal(fs.realpathSync(path.resolve(path.dirname(shortcut), ref)), fs.realpathSync(path.join(project, folder, bundle, 'SKILL.md')));
  }
  const [shortcut, claudeShortcut] = shortcuts;
  const notes = path.join(path.dirname(shortcut), 'notes.txt');
  put(notes, 'Keep');
  const original = read(shortcut);
  const edited = original + '\nLocal instruction\n';
  put(shortcut, edited);
  for (const action of ['pin', 'unpin']) {
    assert.notEqual(probe(project, script, action, 'polish').status, 0);
    assert.equal(read(shortcut), edited);
    assert.ok(fs.existsSync(claudeShortcut));
  }
  put(shortcut, original);
  node(project, script, 'unpin', 'polish');
  assert.ok(fs.existsSync(notes));
  for (const file of shortcuts) assert.ok(!fs.existsSync(file));
});

test('recovers after the installer dies with rules in staging', t => {
  const project = temp(t);
  const rules = path.join(project, 'AGENTS.md');
  put(rules, '# Project rules\r\n');
  const interrupt = `
    import fs from 'node:fs';
    import path from 'node:path';
    const rename = fs.renameSync;
    fs.renameSync = (file, destination) => {
      rename(file, destination);
      if (path.basename(file) === 'AGENTS.md') process.exit(77);
    };
    await import(process.argv[1]);
  `;
  const crashed = probe(project, '--input-type=module', '-e', interrupt, pathToFileURL(installer).href);
  assert.equal(crashed.status, 77, crashed.stderr);
  assert.ok(!fs.existsSync(rules));
  put(rules, 'Concurrent edit\n');
  assert.notEqual(probe(project, installer, '--recover').status, 0);
  assert.equal(read(rules), 'Concurrent edit\n');
  const saved = path.join(project, 'saved-edit.md');
  fs.renameSync(rules, saved);
  node(project, installer, '--recover');
  assert.equal(read(rules), '# Project rules\r\n');
  assert.equal(read(saved), 'Concurrent edit\n');
  assert.ok(!fs.existsSync(path.join(project, '.spotter-install-staging')));
  assert.ok(!fs.existsSync(path.join(project, '.agents/bundled-skills')));
});

test('git ignore treats shell syntax as a literal filename', t => {
  const project = temp(t);
  execFileSync('git', ['init', '-q'], { cwd: project, stdio: 'pipe' });
  const fixture = '$(touch${IFS}audit-marker).html';
  put(path.join(project, fixture), '<p>Fixture</p>');
  put(path.join(project, '.gitignore'), 'ignored.html\n');
  const program = `
    import assert from 'node:assert/strict';
    const { isGeneratedFile } = await import(process.argv[1]);
    assert.equal(isGeneratedFile(process.argv[2]), false);
    assert.equal(isGeneratedFile('ignored.html'), true);
  `;
  node(project, '--input-type=module', '-e', program, pathToFileURL(path.join(impeccable, 'lib/is-generated.mjs')).href, fixture);
  assert.ok(!fs.existsSync(path.join(project, 'audit-marker')));
});

test('preview only serves public files and survives a missing index', t => {
  const base = temp(t);
  const publicRoot = path.join(base, 'public');
  const outside = path.join(base, 'outside');
  put(path.join(publicRoot, 'index.html'), '<h1>Preview</h1>');
  fs.mkdirSync(path.join(publicRoot, 'empty'));
  put(path.join(publicRoot, '.env'), 'fake secret');
  put(path.join(outside, 'file.txt'), 'private');
  fs.symlinkSync(outside, path.join(publicRoot, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  const program = `
    import assert from 'node:assert/strict';
    const { preview } = await import(process.argv[1]);
    const { url, server } = await preview('index.html');
    try {
      for (const [path, status] of [['/empty/', 404], ['/.env', 403], ['/linked/file.txt', 403], ['/index.html', 200]]) {
        const response = await fetch(new URL(path, url));
        assert.equal(response.status, status, path);
        if (status === 200) assert.equal(await response.text(), '<h1>Preview</h1>');
      }
    } finally {
      server.close();
    }
  `;
  node(publicRoot, '--input-type=module', '-e', program, pathToFileURL(preview).href);
});

test('question rejects forged and unlisted answers', { timeout: 15_000 }, async t => {
  const project = temp(t);
  const payload = path.join(project, 'question.json');
  put(payload, JSON.stringify({ options: [{ id: 'valid', label: 'Valid' }] }));
  const child = spawn(process.execPath, [path.join(impeccable, 'serve-question.mjs'), '--payload', payload, '--no-open', '--timeout', '10'], {
    cwd: project, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const closed = once(child, 'close');
  const lines = createInterface({ input: child.stdout });
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  try {
    const output = lines[Symbol.asyncIterator]();
    const { value: first } = await output.next();
    assert.match(first ?? '', /^QUESTION URL: /, stderr);
    const url = new URL(first.slice('QUESTION URL: '.length));
    const page = await (await fetch(url)).text();
    const [, token] = /'x-answer-token': '([a-f0-9]+)'/.exec(page);
    const valid = JSON.stringify({ optionId: 'valid' });
    for (const [body, headers, status] of [
      [valid, { Origin: 'https://unrelated.invalid' }, 403],
      [JSON.stringify({ optionId: 'unlisted' }), { 'X-Answer-Token': token }, 400],
      [' '.repeat(16_385), { 'X-Answer-Token': token }, 413],
      [valid, { 'X-Answer-Token': token }, 200],
    ]) {
      const response = await fetch(new URL('answer', url), { method: 'POST', body, headers });
      assert.equal(response.status, status);
      await response.text();
    }
    const answer = [];
    for await (const line of output) answer.push(line);
    const [exitCode] = await closed;
    assert.equal(exitCode, 0, stderr);
    assert.ok(answer.includes('ANSWER: {"optionId":"valid","steer":""}'), answer.join('\n'));
  } finally {
    if (child.exitCode === null) child.kill();
    await closed;
  }
});

test('weekly reads existing records and uses the latest state in range', t => {
  const project = temp(t);
  const log = path.join(project, 'worklog.jsonl');
  const evidence = 'node --test billing.test.mjs：1 项通过';
  const ref = 'https://example.com/change';
  put(log, JSON.stringify({
    project: '试点', task: '回款日期', date: '2026-11-02', status: 'local',
    result: '本地验收', evidence, ref, next_step: '',
  }) + '\r\n');
  const common = [logScript, '--log', log];
  const add = [...common, 'add', '--project', '试点', '--task', '回款日期', '--evidence', evidence];
  node(project, ...add, '--date', '2026-11-04', '--status', 'live', '--result', '上线验收');
  node(project, ...add, '--date', '2026-11-09', '--status', 'blocked', '--result', '区间外');
  const output = node(project, ...common, 'weekly', '--since', '2026-11-02', '--until', '2026-11-08');
  assert.ok(output.includes(`上线验收｜已上线并验证｜${evidence}｜${ref}`));
  assert.doesNotMatch(output, /本地验收|区间外/);
  assert.equal(node(project, ...common, 'weekly', '--until', '2026-11-05').split('\n')[0], '# 周报 2026-11-02 至 2026-11-05');
  assert.notEqual(probe(project, ...add, '--date', '2026-02-30', '--status', 'live', '--result', '日期无效').status, 0);
});

test('log add preserves dash-prefixed text values', t => {
  const project = temp(t);
  const log = path.join(project, 'worklog.jsonl');
  const command = [logScript, '--log', log, 'add', '--project', 'P', '--task', 'T', '--date', '2026-11-06'];
  const result = probe(project, ...command, '--result', '--evidence=- item passed', '--status', 'local');
  assert.notEqual(result.status, 0);
  assert.ok(!fs.existsSync(log));

  node(project, ...command, '--result', '-1', '--evidence', '- item passed', '--status', 'local');
  const record = JSON.parse(read(log));
  assert.equal(record.result, '-1');
  assert.equal(record.evidence, '- item passed');
  const report = node(project, logScript, '--log', log, 'weekly', '--since', '2026-11-02');
  assert.match(report, /P｜T｜-1｜本地通过｜- item passed/);
});

test('no legacy name references', () => {
  const legacy = new RegExp('(?<![a-z0-9])(' + 'ds' + 'h(?![a-z0-9])|' + 'clean' + 'rep(?![a-z0-9])|' + 're' + 'p-)', 'i');
  const matched = [];
  const decoder = new TextDecoder('utf-8', { fatal: true });
  function scan(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      if (['.git', 'node_modules', '__pycache__'].includes(item.name)) continue;
      const file = path.join(directory, item.name);
      if (item.isDirectory()) {
        scan(file);
      } else if (item.isFile() && !file.endsWith('.png')) {
        const name = path.relative(root, file);
        if (legacy.test(item.name)) matched.push(`filename: ${name}`);
        const bytes = fs.readFileSync(file);
        let content;
        try {
          content = decoder.decode(bytes);
        } catch {
          continue;
        }
        for (const [index, line] of content.split(/\r?\n/).entries()) {
          if (legacy.test(line)) matched.push(`${name}:${index + 1}: ${line.trim()}`);
        }
      }
    }
  }
  scan(root);
  assert.deepEqual(matched, []);
});
