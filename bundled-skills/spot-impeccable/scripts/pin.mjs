#!/usr/bin/env node
/** Pin or unpin an Impeccable shortcut in the project containing the Spotter bundle. */

import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmdirSync,
  unlinkSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const HARNESSES = ['.agents', '.claude'];
const HELPER = '../../bundled-skills/spot-impeccable/SKILL.md';
const PIN_MARKER = '<!-- impeccable-pinned-skill -->';
const CHECKSUM = /^<!-- impeccable-pinned-skill: ([a-f0-9]{64}) -->$/m;
const VALID_COMMANDS = [
  'craft', 'init', 'extract', 'document', 'shape',
  'critique', 'audit',
  'polish', 'bolder', 'quieter', 'distill', 'harden', 'onboard', 'live',
  'animate', 'colorize', 'typeset', 'layout', 'delight', 'overdrive',
  'clarify', 'adapt', 'optimize',
];

function installedProject() {
  const skillDir = dirname(scriptsDir);
  const bundleDir = dirname(skillDir);
  const harnessDir = dirname(bundleDir);
  const project = dirname(harnessDir);
  if (
    basename(skillDir) !== 'spot-impeccable' || basename(bundleDir) !== 'bundled-skills' ||
    !HARNESSES.includes(basename(harnessDir)) || realpathSync(process.cwd()) !== project
  ) {
    throw new Error('Run the installed Spotter pin script from its project root.');
  }
  return project;
}

function shortcutPaths(project, command) {
  const paths = [];
  for (const harness of HARNESSES) {
    const harnessDir = join(project, harness);
    const helper = join(harnessDir, 'bundled-skills', 'spot-impeccable', 'SKILL.md');
    if (!existsSync(helper)) continue;
    const skillsDir = join(harnessDir, 'skills');
    const shortcutDir = join(skillsDir, command);
    const shortcut = join(shortcutDir, 'SKILL.md');
    for (const path of [harnessDir, skillsDir, shortcutDir, shortcut]) {
      if (lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink()) {
        throw new Error(`Linked shortcut path requires manual review: ${path}`);
      }
    }
    paths.push(shortcut);
  }
  return paths;
}

function shortcutContent(command) {
  const metadataPath = join(scriptsDir, 'command-metadata.json');
  const metadata = existsSync(metadataPath) ? JSON.parse(readFileSync(metadataPath, 'utf-8')) : {};
  const description = metadata[command]?.description || `Spotter shortcut for the ${command} workflow.`;
  const hint = metadata[command]?.argumentHint || '[target]';
  return `---
name: ${command}
description: ${JSON.stringify(description)}
argument-hint: ${JSON.stringify(hint)}
user-invocable: true
---

${PIN_MARKER}

Read \`${HELPER}\` relative to this shortcut's directory and follow its \`${command}\` workflow with the supplied arguments. Resolve references and script paths from the helper's directory. Keep the working directory at the project root.
`;
}

function checksum(content) {
  return createHash('sha256').update(content).digest('hex');
}

function main() {
  const [,, action, command] = process.argv;
  if (!['pin', 'unpin'].includes(action) || !VALID_COMMANDS.includes(command)) {
    throw new Error(`Usage: node pin.mjs <pin|unpin> <command>\nCommands: ${VALID_COMMANDS.join(', ')}`);
  }
  const paths = shortcutPaths(installedProject(), command);
  if (paths.length === 0) throw new Error('No installed Spotter helpers found.');
  const legacy = shortcutContent(command);
  const content = legacy.replace(PIN_MARKER, `<!-- impeccable-pinned-skill: ${checksum(legacy)} -->`);
  const changes = paths.filter(shortcut => {
    if (!existsSync(shortcut)) return action === 'pin';
    const existing = readFileSync(shortcut, 'utf-8').replaceAll('\r\n', '\n');
    const marker = CHECKSUM.exec(existing);
    if (!marker && !existing.includes(PIN_MARKER)) {
      console.log(`SKIP: ${shortcut} (project skill)`);
      return false;
    }
    if (marker ? checksum(existing.replace(CHECKSUM, PIN_MARKER)) !== marker[1] : existing !== legacy) {
      throw new Error(`Locally edited shortcut: ${shortcut}`);
    }
    return true;
  });
  for (const shortcut of changes) {
    const directory = dirname(shortcut);
    if (action === 'pin') {
      mkdirSync(directory, { recursive: true });
      writeFileSync(shortcut, content, 'utf-8');
      console.log(`+ ${shortcut}`);
    } else {
      unlinkSync(shortcut);
      if (readdirSync(directory).length === 0) rmdirSync(directory);
      console.log(`- ${shortcut}`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
