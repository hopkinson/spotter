import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const begin = '<!-- spotter:begin -->';
const end = '<!-- spotter:end -->';
const marker = /(?:^|(?<=\n))(<!-- spotter:begin -->|<!-- spotter:end -->)(?:\r?\n|$)/g;
const textSuffixes = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.py', '.sh', '.svg', '.toml', '.yaml', '.yml']);

export function digest(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function stat(file) {
  const info = fs.lstatSync(file, { throwIfNoEntry: false });
  if (info?.isSymbolicLink()) {
    throw new Error(`Linked path requires manual review: ${file}`);
  }
  return info;
}

export function readFile(file) {
  return stat(file) ? fs.readFileSync(file) : null;
}

export function treeDigest(directory) {
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

export function fingerprint(file) {
  const info = stat(file);
  if (!info) return null;
  return info.isDirectory() ? treeDigest(file)[1] : digest(fs.readFileSync(file));
}

export function ruleChange(file, bytes, expected, source) {
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
