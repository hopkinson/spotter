#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const LINE_THRESHOLD = parseInt(process.env.SPOT_LINE_THRESHOLD || '300', 10);
const COMMIT_THRESHOLD = parseInt(process.env.SPOT_COMMIT_THRESHOLD || '10', 10);
const DIFF_ADDITION_THRESHOLD = parseInt(process.env.SPOT_DIFF_ADDITION_THRESHOLD || '500', 10);

const IGNORE_PATTERNS = [
  /(?:^|[/\\])(?:node_modules|\.git|\.codegraph|dist|build|coverage|tmp|\.next|\.nuxt)[/\\]?/i,
  /\.(?:min\.(?:js|css)|lock|svg|png|jpg|jpeg|gif|webp|ico|woff2?|eot|ttf|map)$/i,
  /(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i,
];

function git(cwd, ...args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function shouldIgnore(file) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(file));
}

function getChangedFiles(cwd) {
  const files = new Set();
  // 1. Staged files
  const staged = git(cwd, 'diff', '--cached', '--name-only');
  if (staged) {
    for (const f of staged.split('\n')) if (f.trim()) files.add(f.trim());
  }
  // 2. If nothing staged, look at the last commit (HEAD)
  if (files.size === 0) {
    const headFiles = git(cwd, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD');
    if (headFiles) {
      for (const f of headFiles.split('\n')) if (f.trim()) files.add(f.trim());
    }
  }
  // 3. Fallback to unstaged dirty files
  if (files.size === 0) {
    const status = git(cwd, 'status', '--porcelain');
    if (status) {
      for (const line of status.split('\n')) {
        const f = line.slice(3).trim();
        if (f) files.add(f);
      }
    }
  }
  return [...files];
}

function checkFileBloat(cwd, files) {
  const warnings = [];
  for (const relPath of files) {
    if (shouldIgnore(relPath)) continue;
    const fullPath = path.resolve(cwd, relPath);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      if (lines > LINE_THRESHOLD) {
        warnings.push({ file: relPath, lines });
      }
    } catch {}
  }
  return warnings;
}

function checkAuditThreshold(cwd) {
  const branch = git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (!branch || branch === 'HEAD') return null;

  // Try upstream first, then default base branch (main/master) if on a feature branch
  let base = null;
  const upstream = git(cwd, 'rev-parse', '--verify', '--quiet', '@{u}');
  if (upstream) {
    base = '@{u}';
  } else {
    for (const candidate of ['origin/main', 'main', 'origin/master', 'master']) {
      if (candidate === branch || candidate === `origin/${branch}`) continue;
      const mergeBase = git(cwd, 'merge-base', 'HEAD', candidate);
      if (mergeBase) {
        base = mergeBase;
        break;
      }
    }
  }

  let commitCount = 0;
  let insertions = 0;

  if (base) {
    const countStr = git(cwd, 'rev-list', '--count', `${base}..HEAD`);
    commitCount = countStr ? parseInt(countStr, 10) : 0;
    const shortstat = git(cwd, 'diff', '--shortstat', `${base}..HEAD`);
    if (shortstat) {
      const match = shortstat.match(/(\d+)\s+insertions?\(\+\)/);
      if (match) insertions = parseInt(match[1], 10);
    }
  } else {
    // If no upstream or base branch found (e.g. standalone branch), count total commits on branch
    const countStr = git(cwd, 'rev-list', '--count', 'HEAD');
    commitCount = countStr ? parseInt(countStr, 10) : 0;
  }

  if (commitCount >= COMMIT_THRESHOLD || insertions >= DIFF_ADDITION_THRESHOLD) {
    return { commitCount, insertions };
  }
  return null;
}

function runCheck(cwd = process.cwd()) {
  try {
    const changed = getChangedFiles(cwd);
    const bloated = checkFileBloat(cwd, changed);
    const audit = checkAuditThreshold(cwd);

    if (bloated.length === 0 && !audit) return;

    const yellow = '\x1b[33m';
    const cyan = '\x1b[36m';
    const reset = '\x1b[0m';

    console.log('');
    for (const item of bloated) {
      console.log(`${yellow}💡 [Spotter 建议] 文件 "${item.file}" 已膨胀至 ${item.lines} 行（阈值 ${LINE_THRESHOLD}）。${reset}`);
      console.log(`   ${cyan}↳ 下次进入 AI 会话可执行「spot-refactor」或输入「重构 ${path.basename(item.file)}」按需拆分。${reset}`);
    }

    if (audit) {
      const details = audit.insertions > 0
        ? `${audit.commitCount} 次提交 / +${audit.insertions} 行`
        : `${audit.commitCount} 次提交`;
      console.log(`${yellow}🛡️  [Spotter 建议] 当前分支自基线已累积 ${details} 未审计。${reset}`);
      console.log(`   ${cyan}↳ 推荐进入 AI 会话执行「spot-audit」排查安全漏洞与边界隐患。${reset}`);
    }
    console.log('');
  } catch {}
}

const HOOK_TAG = '# Managed by Spotter (spot-hint)';
const HOOK_SCRIPT = `#!/bin/sh
${HOOK_TAG}
if command -v node >/dev/null 2>&1; then
  if [ -f "scripts/spot-hint.mjs" ]; then
    node scripts/spot-hint.mjs --check 2>/dev/null || true
  elif [ -f ".agents/scripts/spot-hint.mjs" ]; then
    node .agents/scripts/spot-hint.mjs --check 2>/dev/null || true
  fi
fi
exit 0
`;

function installHook(cwd = process.cwd()) {
  const gitDir = git(cwd, 'rev-parse', '--git-path', 'hooks');
  if (!gitDir) {
    console.error('Error: Not a git repository.');
    process.exit(1);
  }
  const hooksDir = path.resolve(cwd, gitDir);
  fs.mkdirSync(hooksDir, { recursive: true });
  const hookPath = path.join(hooksDir, 'pre-commit');

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (!existing.includes(HOOK_TAG)) {
      console.error(`Warning: An existing pre-commit hook is present. Appending Spotter hint check.`);
      const appended = existing.trimEnd() + '\n\n' + HOOK_SCRIPT;
      fs.writeFileSync(hookPath, appended, { mode: 0o755 });
      console.log('✓ Spotter hook chained to existing pre-commit hook.');
      return;
    }
  }
  fs.writeFileSync(hookPath, HOOK_SCRIPT, { mode: 0o755 });
  console.log(`✓ Spotter pre-commit hook installed at ${hookPath}`);
}

function uninstallHook(cwd = process.cwd()) {
  const gitDir = git(cwd, 'rev-parse', '--git-path', 'hooks');
  if (!gitDir) return;
  const hookPath = path.resolve(cwd, gitDir, 'pre-commit');
  if (!fs.existsSync(hookPath)) {
    console.log('No Spotter pre-commit hook found.');
    return;
  }
  const existing = fs.readFileSync(hookPath, 'utf8');
  if (existing.includes(HOOK_TAG)) {
    if (existing.trim() === HOOK_SCRIPT.trim()) {
      fs.unlinkSync(hookPath);
      console.log('✓ Spotter pre-commit hook removed.');
    } else {
      const cleaned = existing.replace(HOOK_SCRIPT, '').trim();
      fs.writeFileSync(hookPath, cleaned + '\n', { mode: 0o755 });
      console.log('✓ Spotter hook removed from chained pre-commit.');
    }
  } else {
    console.log('Existing pre-commit hook is not managed by Spotter.');
  }
}

const arg = process.argv[2];
if (arg === '--install') {
  installHook();
} else if (arg === '--uninstall') {
  uninstallHook();
} else {
  runCheck();
}
