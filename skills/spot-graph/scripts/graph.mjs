import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const codegraphVersion = '1.6.2';
const runtimeName = 'spotter-codegraph';

const hook = `#!/bin/sh
# Managed by Spotter. Disable with spot-graph --off.
# Refreshes the main worktree only.
# Git shares hooks with linked worktrees, which have separate indexes.
git_dir=$(git rev-parse --absolute-git-dir) || exit 0
if [ "$git_dir" != "$(git rev-parse --path-format=absolute --git-common-dir)" ]; then
  exit 0
fi
runtime="$git_dir/${runtimeName}"
if ! { IFS= read -r bundled_node < "$runtime/node-path" &&
       "$runtime/$bundled_node" --liftoff-only --disable-warning=ExperimentalWarning "$runtime/sync.cjs" >/dev/null; }; then
  printf '%s\\n' 'Spotter: CodeGraph refresh failed. Re-run spot-graph to refresh the index.' >&2
fi
`;

// Keep the SHA-256 of each previous template to recognize only intact older hooks.
const previousHookDigests = new Set([
  'c271596ff321a7878acaa320d91cbe2b8a3bc5bf0afd636c751056f2ba5cb170',
  '937e7c7c6d767c4764e374f126a328217465417f5d66075984948d5f89082735',
]);

function readHook(file) {
  const current = fs.lstatSync(file, { throwIfNoEntry: false });
  if (!current) return;
  if (current.isFile()) {
    const content = fs.readFileSync(file);
    const digest = createHash('sha256').update(content).digest('hex');
    if (content.equals(Buffer.from(hook)) || previousHookDigests.has(digest)) {
      return { content: content.toString('utf8'), mode: current.mode };
    }
  }
  throw new Error(`An existing post-commit hook is managed separately: ${file}`);
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function installRuntime(runtime, bundledNode, packageDir) {
  const manifest = path.join(packageDir, 'package.json');
  if (fs.existsSync(bundledNode) && fs.existsSync(manifest)
      && JSON.parse(fs.readFileSync(manifest, 'utf8')).version === codegraphVersion) return;

  // An explicit prefix inside Git metadata keeps npm away from project scripts and .npmrc.
  const args = ['--prefix', '.', 'install', '--no-save', '--no-package-lock', '--ignore-scripts',
    '--no-audit', '--no-fund', `@colbymchenry/codegraph@${codegraphVersion}`];
  const result = spawnSync('npm', args, {
    cwd: runtime,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
    env: { ...process.env, NoDefaultCurrentDirectoryInExePath: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || !fs.existsSync(bundledNode)) throw new Error('Could not install the CodeGraph runtime.');
}

function setup(project, runtime) {
  if (fs.lstatSync(runtime, { throwIfNoEntry: false })?.isSymbolicLink()) {
    throw new Error('The Spotter runtime directory is a symlink.');
  }
  fs.mkdirSync(runtime, { recursive: true });
  const executable = process.platform === 'win32' ? 'node.exe' : 'node';
  const relativeNode = `node_modules/@colbymchenry/codegraph-${process.platform}-${process.arch}/${executable}`;
  const bundledNode = path.join(runtime, relativeNode);
  const packageDir = path.join(runtime, 'node_modules/@colbymchenry/codegraph');
  installRuntime(runtime, bundledNode, packageDir);

  const env = {
    ...process.env, CODEGRAPH_TELEMETRY: '0', CODEGRAPH_NO_DOWNLOAD: '1',
    // Spotter owns the hook. Skip the upstream offer to install fallback hooks.
    CODEGRAPH_NO_WATCH: '0', CODEGRAPH_FORCE_WATCH: '1',
  };
  const indexFile = path.join(runtime, 'index-dir');
  if (fs.existsSync(indexFile)) env.CODEGRAPH_DIR = fs.readFileSync(indexFile, 'utf8');

  const options = { cwd: project, stdio: ['ignore', 'inherit', 'inherit'], env };
  execFileSync(process.execPath, [path.join(packageDir, 'npm-shim.js'), 'init', '--yes'], options);
  const worker = path.join(runtime, 'sync.cjs');
  fs.copyFileSync(fileURLToPath(new URL('./sync.cjs', import.meta.url)), worker);
  execFileSync(bundledNode, ['--liftoff-only', '--disable-warning=ExperimentalWarning', worker, '--setup'], options);
  fs.writeFileSync(path.join(runtime, 'node-path'), relativeNode + '\n');
}

function run(args) {
  const off = args[0] === '--off';
  if (args.length > Number(off)) throw new Error('Usage: node graph.mjs [--off]');

  const project = git(process.cwd(), 'rev-parse', '--show-toplevel');
  const gitDir = git(project, 'rev-parse', '--absolute-git-dir');
  const commonDir = git(project, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  if (gitDir !== commonDir) throw new Error('Run spot-graph from the main checkout. Linked worktrees share Git hooks.');

  const hooksDir = path.join(commonDir, 'hooks');
  const file = path.join(hooksDir, 'post-commit');
  if (fs.lstatSync(hooksDir, { throwIfNoEntry: false })?.isSymbolicLink()) {
    throw new Error('The Git hooks directory is a symlink. Manage its post-commit hook directly.');
  }
  if (!off && path.normalize(git(project, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks/post-commit')) !== file) {
    throw new Error('Git uses a custom core.hooksPath. Add CodeGraph to the project’s post-commit hook directly.');
  }

  const current = readHook(file);
  if (off) {
    if (current) fs.unlinkSync(file);
    console.log('CodeGraph post-commit refresh is off.');
    return;
  }

  setup(project, path.join(commonDir, runtimeName));
  if (!current) {
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(file, hook, { flag: 'wx', mode: 0o755 });
  } else if (current.content !== hook) {
    const staging = fs.mkdtempSync(path.join(hooksDir, '.spotter-'));
    const replacement = path.join(staging, 'post-commit');
    try {
      fs.writeFileSync(replacement, hook, { mode: 0o755 });
      if (readHook(file)?.content !== current.content) {
        throw new Error('The post-commit hook changed during setup. Run spot-graph again.');
      }
      fs.renameSync(replacement, file);
    } finally {
      fs.rmSync(replacement, { force: true });
      fs.rmdirSync(staging);
    }
  } else if (process.platform !== 'win32') {
    const installed = readHook(file);
    if (installed?.content !== hook) {
      throw new Error('The post-commit hook changed during setup. Run spot-graph again.');
    }
    if (!(installed.mode & 0o100)) fs.chmodSync(file, (installed.mode & 0o777) | 0o100);
  }
  console.log('CodeGraph will refresh after each commit in the main worktree.');
}

try {
  run(process.argv.slice(2));
} catch (error) {
  console.error(`Spotter: ${error.stderr?.toString().trim() || error.message}`);
  process.exitCode = 1;
}
