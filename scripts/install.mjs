#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const sourceRoot = fs.realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const targets = new Map([
  ['codex', '.agents'],
  ['antigravity-cli', '.agents'],
  ['claude-code', '.claude'],
]);
const receipt = '.spotter-install.json';
const globalReceipt = '.spotter/global-install.json';
const globalRules = ['.codex/AGENTS.md', '.claude/CLAUDE.md'];
const journalName = 'journal.json';
const committed = 'committed.json';
const skillPath = /^\.(?:agents|claude)\/skills\/spot-[a-z0-9-]+$/;
const bundlePath = /^\.(?:agents|claude)\/bundled-skills$/;
const preparedName = /^new-(?:[0-9]+|receipt)$/;
const begin = '<!-- spotter:begin -->';
const end = '<!-- spotter:end -->';
const marker = /(?:^|(?<=\n))(<!-- spotter:begin -->|<!-- spotter:end -->)(?:\r?\n|$)/g;
const textSuffixes = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.py', '.sh', '.svg', '.toml', '.yaml', '.yml']);

function digest(content) {
  return createHash('sha256').update(content).digest('hex');
}

function stat(file) {
  const info = fs.lstatSync(file, { throwIfNoEntry: false });
  if (info?.isSymbolicLink()) {
    throw new Error(`Linked path requires manual review: ${file}`);
  }
  return info;
}

function readFile(file) {
  return stat(file) ? fs.readFileSync(file) : null;
}

function treeDigest(directory) {
  stat(directory);
  const names = fs.readdirSync(directory);
  const sortKey = process.platform === 'win32' ? name => name.toLowerCase() : name => name;
  names.sort((a, b) => sortKey(a) < sortKey(b) ? -1 : Number(sortKey(a) > sortKey(b)));
  const normalized = [];
  const raw = [];
  for (const name of names) {
    const file = path.join(directory, name);
    const info = stat(file);
    let hashes;
    if (info?.isDirectory()) {
      hashes = treeDigest(file);
    } else if (info?.isFile()) {
      const content = fs.readFileSync(file);
      const normalizedContent = textSuffixes.has(path.extname(name)) || name === 'LICENSE'
        ? Buffer.from(content.toString('latin1').replaceAll('\r\n', '\n'), 'latin1')
        : content;
      hashes = [digest(normalizedContent), digest(content)];
    } else {
      throw new Error(`Unsupported file: ${file}`);
    }
    // Match the Python installer's JSON encoding so existing receipts and journals still verify.
    const key = JSON.stringify(name).replace(/[\x7f-\uffff]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
    normalized.push(`${key}: "${hashes[0]}"`);
    raw.push(`${key}: "${hashes[1]}"`);
  }
  return [digest(`{${normalized.join(', ')}}`), digest(`{${raw.join(', ')}}`)];
}

function fingerprint(file) {
  const info = stat(file);
  if (!info) return null;
  return info.isDirectory() ? treeDigest(file)[1] : digest(fs.readFileSync(file));
}

function managedPath(project, name, global = false) {
  const files = global ? [...globalRules, globalReceipt] : ['AGENTS.md', 'CLAUDE.md', receipt];
  if (typeof name !== 'string' || !(files.includes(name) || skillPath.test(name) || bundlePath.test(name))) {
    throw new Error(`Invalid managed path: ${name}`);
  }
  let file = project;
  for (const part of name.split('/')) {
    file = path.join(file, part);
    stat(file);
  }
  return file;
}

function rollback(project, staging, journal, global = false) {
  const actions = [];
  const seen = new Set();
  if (!Array.isArray(journal)) throw new Error('Invalid installation journal.');
  for (const [index, entry] of journal.entries()) {
    if (!Array.isArray(entry) || entry.length !== 4) throw new Error('Invalid installation journal.');
    const [name, staged, before, after] = entry;
    if (seen.has(name) || typeof staged !== 'string' || !preparedName.test(staged)) {
      throw new Error('Invalid installation journal.');
    }
    seen.add(name);
    const file = managedPath(project, name, global);
    const prepared = path.join(staging, staged);
    const backup = path.join(staging, `old-${index}`);
    const exists = Boolean(stat(file));
    const replaced = exists && after !== null && !stat(prepared);
    if (stat(backup) || (before === null && replaced)) {
      if (exists && (!replaced || fingerprint(file) !== after)) {
        throw new Error(`File changed after installation: ${file}`);
      }
      actions.push([file, prepared, backup, exists]);
    } else if (before !== null && !exists) {
      throw new Error(`Missing original file and backup: ${file}`);
    }
  }
  for (const [file, prepared, backup, exists] of actions.reverse()) {
    if (exists) fs.renameSync(file, prepared);
    if (stat(backup)) {
      if (stat(file)) throw new Error(`File appeared during recovery: ${file}`);
      fs.renameSync(backup, file);
    }
  }
}

function recover(project, staging, global = false) {
  if (!stat(staging)?.isDirectory()) throw new Error('No interrupted Spotter installation.');
  const names = fs.readdirSync(staging);
  for (const name of names) {
    if (![journalName, committed, 'journal.tmp'].includes(name) && !preparedName.test(name) && !/^old-[0-9]+$/.test(name)) {
      throw new Error(`Unexpected file in recovery directory: ${path.join(staging, name)}`);
    }
  }
  const markerFile = path.join(staging, committed);
  const complete = stat(markerFile)?.isFile();
  const journal = path.join(staging, journalName);
  const content = readFile(journal);
  if (content !== null) {
    rollback(project, staging, JSON.parse(content), global);
    fs.renameSync(journal, markerFile);
  } else if (!complete && names.some(name => name.startsWith('old-'))) {
    throw new Error(`Missing recovery journal. Keep the backups in ${staging} for manual recovery.`);
  }
}

function clearStaging(staging) {
  stat(staging);
  // Keep the completion marker until every backup has been cleaned up.
  for (const name of fs.readdirSync(staging)) {
    if (name !== committed) fs.rmSync(path.join(staging, name), { recursive: true, force: true });
  }
  fs.rmSync(path.join(staging, committed), { force: true });
  fs.rmdirSync(staging);
}

function ruleChange(file, bytes, expected, source) {
  new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  // Use byte offsets to preserve the project rules verbatim, including their BOM and line endings.
  const content = bytes.toString('latin1');
  const markers = [...content.matchAll(marker)];
  const markerCount = content.split(begin).length + content.split(end).length - 2;
  if (markerCount !== markers.length || (markers.length && (markers.length !== 2 || markers[0][1] !== begin || markers[1][1] !== end))) {
    throw new Error(`Invalid Spotter markers: ${file}`);
  }
  const start = markers[0]?.index ?? content.length;
  const finish = markers.length ? markers[1].index + markers[1][0].length : start;
  const current = markers.length
    ? digest(Buffer.from(content.slice(start, finish).replaceAll('\r\n', '\n').replace(/\n+$/, ''), 'latin1'))
    : null;
  if (current !== expected) throw new Error(`Unmanaged or locally edited Spotter rules: ${file}`);
  if (source === null) return [Buffer.from(content.slice(0, start) + content.slice(finish), 'latin1'), null];
  if (!markers.length && content.includes(source.split('\n', 1)[0])) {
    throw new Error(`Possible unmarked Spotter rules: ${file}`);
  }

  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const block = [begin, source.replace(/^[ \t\r\n\v\f]+|[ \t\r\n\v\f]+$/g, ''), end].join('\n');
  let prefix = content.slice(0, start);
  if (prefix && !prefix.endsWith('\n')) prefix += newline;
  const updated = prefix + block.replaceAll('\n', newline) + newline + content.slice(finish);
  return [Buffer.from(updated, 'latin1'), digest(Buffer.from(block, 'latin1'))];
}

function install(project, tools, remove, staging, global = false) {
  const receiptName = global ? globalReceipt : receipt;
  const previousBytes = readFile(managedPath(project, receiptName, global));
  const previous = previousBytes === null ? { tools: [], hashes: {} } : JSON.parse(previousBytes);
  if (!previous || Object.keys(previous).length !== 2 || !Array.isArray(previous.tools)
      || !previous.tools.every(tool => targets.has(tool) && (!global || tool !== 'antigravity-cli')) || !previous.hashes
      || typeof previous.hashes !== 'object' || Array.isArray(previous.hashes)) {
    throw new Error(`Invalid Spotter installation receipt: ${path.join(project, receiptName)}`);
  }
  if (remove && previousBytes === null) throw new Error('No Spotter installation receipt in this project.');
  const selected = [...new Set([...previous.tools, ...tools])].sort();
  if (!selected.length) selected.push('codex');
  if (global) {
    for (const [tool, variable, folder] of [['codex', 'CODEX_HOME', '.codex'], ['claude-code', 'CLAUDE_CONFIG_DIR', '.claude']]) {
      if (selected.includes(tool) && process.env[variable]
          && path.resolve(process.env[variable]) !== path.join(project, folder)) {
        throw new Error(`Custom ${variable} is not supported by global installation. Use the default directory or project installation.`);
      }
    }
  }
  const rules = fs.readFileSync(path.join(sourceRoot, 'rules/AGENTS.md'), 'latin1').replaceAll('\r\n', '\n');
  const skillRoot = path.join(sourceRoot, 'skills');
  const skills = fs.readdirSync(skillRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && stat(path.join(skillRoot, entry.name, 'SKILL.md'))?.isFile());
  if (!skills.length) throw new Error('Spotter entry skills are missing from the source checkout.');
  const payload = new Map();
  for (const folder of new Set(selected.map(tool => targets.get(tool)))) {
    const ruleName = global
      ? (folder === '.agents' ? globalRules[0] : globalRules[1])
      : (folder === '.agents' ? 'AGENTS.md' : 'CLAUDE.md');
    const helperRoot = path.join(project, folder, 'bundled-skills').replaceAll('\\', '/');
    const globalText = Buffer.from(rules, 'latin1').toString('utf8').replace(
      /^- 内部辅助 skill 默认.*$/m,
      () => `- 内部辅助文件从 \`${helperRoot}/<name>/SKILL.md\` 读取；不在菜单注册。可选文件未加载时继续，关键文件未找到时停在该阶段说明缺什么能力。运行辅助脚本时使用其实际安装路径，工作目录保持在业务项目根目录。`,
    );
    payload.set(ruleName, global ? Buffer.from(globalText, 'utf8').toString('latin1') : rules);
    payload.set(`${folder}/bundled-skills`, path.join(sourceRoot, 'bundled-skills'));
    for (const { name } of skills) payload.set(`${folder}/skills/${name}`, path.join(skillRoot, name));
  }

  const hashes = {};
  const changes = [];
  const names = [...new Set([...payload.keys(), ...Object.keys(previous.hashes)])].sort();
  // Stage all changes before touching project files.
  for (const [index, name] of names.entries()) {
    if (!payload.has(name) && !skillPath.test(name)) throw new Error(`Invalid receipt entry: ${name}`);
    const file = managedPath(project, name, global);
    const expected = Object.hasOwn(previous.hashes, name) ? previous.hashes[name] : null;
    const source = remove ? null : payload.get(name) ?? null;
    const staged = `new-${index}`;
    const prepared = path.join(staging, staged);
    let before;
    let newHash;
    if ((global ? globalRules : ['AGENTS.md', 'CLAUDE.md']).includes(name)) {
      const original = readFile(file);
      const [content, hash] = ruleChange(file, original ?? Buffer.alloc(0), expected, source);
      if (!original?.equals(content)) fs.writeFileSync(prepared, content);
      before = original === null ? null : digest(original);
      newHash = hash;
    } else {
      const [current, raw] = stat(file) ? treeDigest(file) : [null, null];
      before = raw;
      if (expected !== current && expected !== before) throw new Error(`Unmanaged or locally edited skill files: ${file}`);
      newHash = source === null ? null : treeDigest(source)[0];
      if (current === newHash) {
        if (newHash !== null) hashes[name] = newHash;
        continue;
      }
      if (source !== null) {
        fs.cpSync(source, prepared, { recursive: true });
        newHash = treeDigest(prepared)[0];
      }
    }
    if (newHash !== null) hashes[name] = newHash;
    if (stat(prepared) || newHash === null) changes.push([name, staged, before, fingerprint(prepared)]);
  }

  const preparedReceipt = path.join(staging, 'new-receipt');
  if (!remove) fs.writeFileSync(preparedReceipt, JSON.stringify({ tools: selected, hashes }, null, 2) + '\n');
  changes.push([receiptName, 'new-receipt', previousBytes === null ? null : digest(previousBytes), fingerprint(preparedReceipt)]);
  const tempJournal = path.join(staging, 'journal.tmp');
  const journal = path.join(staging, journalName);
  const markerFile = path.join(staging, committed);
  fs.writeFileSync(tempJournal, JSON.stringify(changes), { flush: true });
  fs.renameSync(tempJournal, journal);
  try {
    for (const [index, [name, staged, before]] of changes.entries()) {
      const file = managedPath(project, name, global);
      const prepared = path.join(staging, staged);
      const backup = path.join(staging, `old-${index}`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (stat(managedPath(project, name, global))) fs.renameSync(file, backup);
      if (fingerprint(backup) !== before) throw new Error(`File changed during installation: ${file}`);
      if (stat(prepared)) {
        if (stat(file)) throw new Error(`File appeared during installation: ${file}`);
        fs.renameSync(prepared, file);
      }
    }
  } catch (error) {
    try {
      rollback(project, staging, changes, global);
      fs.renameSync(journal, markerFile);
    } catch (rollbackError) {
      throw new Error(`Rollback stopped. Backups are in ${staging}: ${rollbackError.message}`);
    }
    throw error;
  }
  fs.renameSync(journal, markerFile);
}

function main() {
  const { positionals: tools, values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: { help: { type: 'boolean', short: 'h' }, global: { type: 'boolean' }, remove: { type: 'boolean' }, recover: { type: 'boolean' } },
  });
  if (values.help) {
    console.log('Install or update Spotter in the current project or globally.\nUsage: spotter [--global] [codex] [claude-code] | [--global] --remove | [--global] --recover\nProject installation also supports antigravity-cli. Global mode supports default user directories only.');
    return;
  }
  if (tools.some(tool => !targets.has(tool)) || (values.remove && values.recover) || ((values.remove || values.recover) && tools.length)) {
    throw new Error('Choose codex, claude-code, antigravity-cli, --remove, or --recover.');
  }
  if (values.global && tools.includes('antigravity-cli')) throw new Error('Global installation supports codex and claude-code only.');
  const project = fs.realpathSync(values.global ? os.homedir() : process.cwd());
  const relative = path.relative(sourceRoot, project);
  if (!values.global && (!relative || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`)))) {
    throw new Error('Run this command from the target project, outside the Spotter source checkout.');
  }
  if (values.global) {
    managedPath(project, globalReceipt, true);
    fs.mkdirSync(path.join(project, '.spotter'), { recursive: true });
  }
  const staging = path.join(project, values.global ? '.spotter/global-install-staging' : '.spotter-install-staging');
  if (values.recover) {
    recover(project, staging, values.global);
    clearStaging(staging);
    console.log('Spotter installation recovered.');
    return;
  }
  try {
    fs.mkdirSync(staging);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`${error.message}. If no installer is running, use --recover.`);
    throw error;
  }
  try {
    install(project, tools, values.remove, staging, values.global);
  } finally {
    if (fs.realpathSync(staging) === staging && !stat(path.join(staging, journalName))) clearStaging(staging);
  }
  console.log(values.remove ? 'Spotter removed.' : 'Spotter installed. Start a new session to check skill discovery.');
}

try {
  main();
} catch (error) {
  console.error(`Spotter stopped: ${error.message}`);
  process.exitCode = 1;
}
