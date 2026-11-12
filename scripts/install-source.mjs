import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const commitPattern = /^[a-f0-9]{40}$/;

export function sourceCommit(root, pinned) {
  if (pinned !== undefined && !commitPattern.test(pinned)) {
    throw new Error('--source-commit requires a full lowercase Git commit SHA.');
  }
  let checkout;
  try {
    const git = (...args) => execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000,
    }).trim();
    if (fs.realpathSync(git('rev-parse', '--show-toplevel')) === fs.realpathSync(root)) {
      // Only payload/source changes affect the version being installed.
      const dirty = git('status', '--porcelain', '--untracked-files=normal', '--',
        'scripts', 'skills', 'bundled-skills', 'rules', 'package.json');
      checkout = dirty ? null : git('rev-parse', 'HEAD');
      if (pinned && checkout !== pinned) throw new Error('Pinned commit does not match the clean source checkout.');
      return checkout;
    }
  } catch (error) {
    if (error.message.startsWith('Pinned commit')) throw error;
  }
  // GitHub npm snapshots may omit .git. The caller must use the same SHA in
  // the package URL and --source-commit; never infer a version from remote HEAD.
  if (pinned) return pinned;
  try {
    const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return commitPattern.test(metadata.gitHead ?? '') ? metadata.gitHead : null;
  } catch {
    return null;
  }
}
