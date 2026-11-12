import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkUpdates } from '../skills/spot-update/scripts/check.mjs';
import { sourceCommit } from '../scripts/install-source.mjs';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const DAY = 86400000;

function fixture(t, revision = A, global = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spotter-update-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.spotter'));
  const receipt = path.join(root, global ? '.spotter/global-install.json' : '.spotter-install.json');
  const install = sha => fs.writeFileSync(receipt, JSON.stringify({ tools: ['codex'], hashes: {}, ...(sha ? { sourceCommit: sha } : {}) }));
  install(revision);
  return { root, receipt, install, options: { root, global, now: DAY * 10 } };
}

function upstream(sha = B, seen = []) {
  return async (url, options) => {
    assert.ok(options.signal);
    seen.push(url);
    return { ok: true, json: async () => url.includes('/compare/')
      ? { status: 'ahead', commits: [{ commit: { message: 'Fix edge case\nDetails' } }] }
      : { sha, commit: { message: 'Latest change' } } };
  };
}

test('global checks share persisted cooldown, deduplicate candidates and pin installation', async t => {
  const { options, receipt } = fixture(t);
  const bytes = fs.readFileSync(receipt);
  const seen = [];
  const fetchImpl = upstream(B, seen);
  const first = await checkUpdates({ ...options, fetchImpl });
  assert.equal(first.status, 'update');
  assert.deepEqual(first.summaries, ['Fix edge case']);
  assert.ok(first.command.includes(`#${B} --global --source-commit ${B}`));
  assert.equal((await checkUpdates({ ...options, now: options.now + 1, fetchImpl })).status, 'cached');
  assert.equal(seen.length, 2);
  assert.equal((await checkUpdates({ ...options, now: options.now + DAY, fetchImpl })).status, 'already-notified');
  const saved = JSON.parse(fs.readFileSync(path.join(options.root, '.spotter/update-check.json')));
  assert.equal(saved.candidate.sha, B);
  assert.deepEqual(fs.readFileSync(receipt), bytes);
  assert.equal((await checkUpdates({ ...options, now: options.now + DAY * 2, fetchImpl: upstream(C) })).candidate, C);
});

test('unknown legacy baseline is never called current and project command stays local', async t => {
  const { options } = fixture(t, null, false);
  const result = await checkUpdates({ ...options, fetchImpl: upstream() });
  assert.equal(result.status, 'unknown-baseline');
  assert.equal(result.installed, null);
  assert.ok(!result.command.includes('--global'));
  assert.equal((await checkUpdates({ ...options, now: options.now + DAY, fetchImpl: upstream() })).status, 'already-notified');
});

test('upstream rollback, divergent history and unavailable comparison never suggest a normal upgrade', async t => {
  for (const relationship of ['behind', 'diverged', 'offline']) {
    const { options } = fixture(t);
    const result = await checkUpdates({ ...options, fetchImpl: async (url, request) => {
      if (url.includes('/compare/')) {
        if (relationship === 'offline') throw new Error('comparison unavailable');
        return { ok: true, json: async () => ({ status: relationship, commits: [] }) };
      }
      return upstream()(url, request);
    } });
    assert.equal(result.status, relationship === 'offline' ? 'unverified' : 'history-changed');
    assert.equal(result.command, undefined);
  }
});

test('same candidate recovers from comparison failure on the next due or forced check', async t => {
  for (const force of [false, true]) {
    const { options } = fixture(t);
    const first = await checkUpdates({ ...options, fetchImpl: async (url, request) => {
      if (url.includes('/compare/')) throw new Error('temporary failure');
      return upstream()(url, request);
    } });
    assert.equal(first.status, 'unverified');
    const calls = [];
    const recovered = await checkUpdates({ ...options, force,
      now: options.now + (force ? 1 : DAY), fetchImpl: upstream(B, calls) });
    assert.equal(recovered.status, 'update');
    assert.ok(calls.some(url => url.includes('/compare/')));
  }
});

test('install changes invalidate comparison cache and known current stays quiet', async t => {
  const { options, install } = fixture(t);
  await checkUpdates({ ...options, fetchImpl: upstream() });
  install(B);
  assert.equal((await checkUpdates({ ...options, fetchImpl: upstream() })).status, 'current');
  install(A);
  assert.equal((await checkUpdates({ ...options, fetchImpl: upstream(C) })).status, 'update');
});

test('offline, rate limiting, malformed upstream and timeouts do not block or modify installation', async t => {
  for (const fetchImpl of [async () => { throw new Error('offline'); },
    async () => ({ ok: false, status: 429 }), upstream('invalid'),
    async (_, { signal }) => new Promise((resolve, reject) => {
      // Keep the isolated test alive while exercising the real abort signal.
      const timer = setTimeout(resolve, 1000);
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    })]) {
    const { options, receipt } = fixture(t);
    const before = fs.readFileSync(receipt);
    assert.equal((await checkUpdates({ ...options, fetchImpl, timeoutMs: 10 })).status, 'unavailable');
    assert.equal((await checkUpdates({ ...options, fetchImpl })).status, 'cached');
    assert.deepEqual(fs.readFileSync(receipt), before);
    assert.ok(!fs.existsSync(path.join(options.root, '.spotter/update-check.lock')));
  }
});

test('concurrent tasks perform only one network check and force bypasses cooldown', async t => {
  const { options } = fixture(t);
  let release;
  const pending = checkUpdates({ ...options, fetchImpl: async (...args) => {
    await new Promise(resolve => { release = resolve; });
    return upstream(A)(...args);
  } });
  assert.equal((await checkUpdates({ ...options, fetchImpl: upstream() })).status, 'busy');
  release();
  assert.equal((await pending).status, 'current');
  assert.equal((await checkUpdates({ ...options, force: true, fetchImpl: upstream() })).status, 'update');
});

test('corrupt state is preserved and clock reversal cannot suppress checks indefinitely', async t => {
  const { options } = fixture(t);
  const file = path.join(options.root, '.spotter/update-check.json');
  fs.writeFileSync(file, '{broken');
  assert.equal((await checkUpdates({ ...options, fetchImpl: upstream() })).status, 'unavailable');
  assert.equal(fs.readFileSync(file, 'utf8'), '{broken');
  fs.writeFileSync(file, JSON.stringify({ lastCheckedAt: options.now + DAY, installedCommit: A }));
  assert.equal((await checkUpdates({ ...options, fetchImpl: upstream() })).status, 'update');
});

test('source revision requires a clean exact checkout or explicit pinned package provenance', t => {
  const { root } = fixture(t);
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: 'pipe' }).trim();
  assert.equal(sourceCommit(root), null);
  assert.equal(sourceCommit(root, B), B);
  assert.throws(() => sourceCommit(root, 'main'), /full lowercase/);
  git('init');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  git('add', 'package.json');
  git('commit', '-m', 'Initial');
  const head = git('rev-parse', 'HEAD');
  assert.equal(sourceCommit(root), head);
  fs.appendFileSync(path.join(root, 'package.json'), '\n');
  assert.equal(sourceCommit(root), null);
  assert.throws(() => sourceCommit(root, head), /clean source checkout/);
});
