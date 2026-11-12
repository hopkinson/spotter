#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const DAY = 24 * 60 * 60 * 1000;
const SHA = /^[a-f0-9]{40}$/;
const API = 'https://api.github.com/repos/hopkinson/spotter';

function regularPath(file) {
  if (fs.lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink()) {
    throw new Error(`Linked update path requires manual review: ${file}`);
  }
  return file;
}

function readJSON(file, fallback) {
  regularPath(file);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function save(file, state) {
  regularPath(file);
  const temporary = regularPath(`${file}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n', { flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

export async function checkUpdates({ root = process.cwd(), global = false, force = false,
  now = Date.now(), fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  let lock;
  let acquired = false;
  try {
    const directory = regularPath(path.join(root, '.spotter'));
    const receiptFile = global ? path.join(directory, 'global-install.json') : path.join(root, '.spotter-install.json');
    const receipt = readJSON(receiptFile, null);
    if (!receipt) return { status: 'not-installed' };
    const installed = SHA.test(receipt.sourceCommit ?? '') ? receipt.sourceCommit : null;
    fs.mkdirSync(directory, { recursive: true });
    lock = regularPath(path.join(directory, 'update-check.lock'));
    try {
      const fd = fs.openSync(lock, 'wx');
      acquired = true;
      fs.closeSync(fd);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      return { status: 'busy', lock };
    }
    const file = path.join(directory, 'update-check.json');
    const state = readJSON(file, {});
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Invalid update-check state.');
    const elapsed = now - state.lastCheckedAt;
    // A changed install can invalidate the cached comparison. A backwards clock
    // must not suppress checks indefinitely.
    if (!force && state.installedCommit === installed && Number.isFinite(elapsed) && elapsed >= 0 && elapsed < DAY) {
      return { status: 'cached' };
    }
    const next = { ...state, installedCommit: installed, lastCheckedAt: now };
    save(file, next); // Failed attempts are throttled too.
    const signal = AbortSignal.timeout(timeoutMs);
    const get = async endpoint => {
      const response = await fetchImpl(`${API}${endpoint}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'spotter-update-check' }, signal,
      });
      if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
      return response.json();
    };
    const head = await get('/commits/main');
    if (!SHA.test(head.sha ?? '')) throw new Error('Invalid upstream commit.');
    if (head.sha === installed) return { status: 'current' };
    const sameCandidate = state.lastNotifiedCommit === head.sha && state.notifiedForInstall === installed;
    if (sameCandidate && ['update', 'unknown-baseline', 'history-changed'].includes(state.candidate?.status)) {
      return { status: 'already-notified' };
    }
    let summaries = [String(head.commit?.message ?? '').split('\n')[0]].filter(Boolean);
    let status = installed ? 'unverified' : 'unknown-baseline';
    if (installed) {
      try {
        const comparison = await get(`/compare/${installed}...${head.sha}?per_page=5`);
        status = comparison.status === 'ahead' ? 'update'
          : ['behind', 'diverged'].includes(comparison.status) ? 'history-changed' : 'unverified';
        const titles = (comparison.commits ?? []).slice(0, 5)
          .map(commit => String(commit.commit?.message ?? '').split('\n')[0]).filter(Boolean);
        if (titles.length) summaries = titles;
      } catch { /* Do not claim this is newer when ancestry cannot be checked. */ }
    }
    const scope = global ? ' --global' : '';
    const command = ['update', 'unknown-baseline'].includes(status)
      ? `npx --yes --allow-git=root github:hopkinson/spotter#${head.sha}${scope} --source-commit ${head.sha}` : undefined;
    save(file, { ...next, lastNotifiedCommit: head.sha, notifiedForInstall: installed, candidate: { sha: head.sha, status, summaries, command } });
    if (sameCandidate && state.candidate?.status === status) return { status: 'already-notified' };
    return { status, installed, candidate: head.sha, summaries, command };
  } catch (error) {
    return { status: 'unavailable', reason: error.message };
  } finally {
    if (acquired) {
      try { fs.unlinkSync(lock); } catch { /* Checking must never block the task. */ }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { global: { type: 'boolean' }, force: { type: 'boolean' } } });
    const result = await checkUpdates({ global: values.global, force: values.force,
      root: values.global ? os.homedir() : process.cwd() });
    if (values.force || ['update', 'unknown-baseline', 'history-changed', 'unverified', 'unavailable'].includes(result.status)) console.log(JSON.stringify(result));
    if (result.status === 'busy' && Date.now() - fs.statSync(result.lock).mtimeMs > 30_000) {
      console.log(JSON.stringify({ status: 'unavailable', reason: `检查锁尚未释放；确认检查进程已退出后移除 ${result.lock}` }));
    }
  } catch (error) {
    console.log(JSON.stringify({ status: 'unavailable', reason: error.message }));
  }
}
