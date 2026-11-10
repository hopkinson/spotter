import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

const statuses = new Map([
  ['local', '本地通过'],
  ['pushed', '已推送'],
  ['deployed', '待验证'],
  ['live', '已上线'],
  ['pending', '推进中'],
  ['blocked', '卡住'],
]);
const required = ['project', 'task', 'result', 'evidence', 'status'];
const optionsByAction = {
  add: [...required, 'next-step', 'ref', 'date'],
  weekly: ['since', 'until'],
  list: ['since', 'until', 'limit', 'today', 'project'],
};

function parseDay(value) {
  if (typeof value !== 'string') throw new Error('Invalid date. Use YYYY-MM-DD.');
  const calendar = /^(\d{4})(-?)(\d{2})\2(\d{2})$/.exec(value);
  if (calendar && calendar[1] !== '0000') {
    const day = `${calendar[1]}-${calendar[3]}-${calendar[4]}`;
    const date = new Date(`${day}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().startsWith(`${day}T`)) return day;
  }
  const week = /^(\d{4})(-?)W(\d{2})(?:\2([1-7]))?$/.exec(value);
  if (week && week[1] !== '0000' && Number(week[3]) >= 1 && Number(week[3]) <= 53) {
    const monday = new Date(`${week[1]}-01-04T00:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7 + (Number(week[3]) - 1) * 7);
    const thursday = new Date(monday);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    if (thursday.getUTCFullYear() === Number(week[1])) {
      monday.setUTCDate(monday.getUTCDate() + Number(week[4] ?? 1) - 1);
      const day = monday.toISOString().split('T')[0];
      if (/^\d{4}-/.test(day)) return day;
    }
  }
  throw new Error(`Invalid date: ${value}. Use YYYY-MM-DD.`);
}

function today() {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-');
}

function readRows(log) {
  let content;
  try {
    content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(fs.readFileSync(log));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const rows = [];
  for (const [index, line] of content.split(/\r\n|\n|\r/).entries()) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (!row || !statuses.has(row.status) || !['project', 'task', 'result'].every(field => typeof row[field] === 'string')) {
        throw new Error('invalid status or row');
      }
      row.date = parseDay(row.date);
      rows.push(row);
    } catch (error) {
      throw new Error(`${log}:${index + 1}: ${error.message}`);
    }
  }
  return rows;
}

function renderSection(projectMap, isRisk = false) {
  if (projectMap.size === 0) return isRisk ? '暂无风险或卡点。' : '暂无记录。';
  const blocks = [];
  for (const [project, items] of projectMap) {
    const lines = [`### 【${project}】`];
    for (const item of items) {
      const statusLabel = statuses.get(item.status) || item.status;
      lines.push(`- **${item.task}** \`[${statusLabel}]\``);
      if (isRisk && item.status === 'blocked') {
        lines.push(`  - 当前进展：${item.result}`);
        lines.push(`  - 应对/诉求：${item.next_step || '待协调解决'}`);
      } else if (isRisk) {
        lines.push(`  - 当前进展：${item.result}`);
      } else {
        lines.push(`  - 产出：${item.result}`);
      }
      if (item.ref) {
        lines.push(`  - 链接：${item.ref}`);
      }
    }
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
}

function renderList(rows, values) {
  let filtered = rows;
  if (values.today) {
    const t = today();
    filtered = filtered.filter(row => row.date === t);
  }
  const since = values.since !== undefined ? parseDay(values.since) : undefined;
  const until = values.until !== undefined ? parseDay(values.until) : undefined;
  if (since && until && until < since) {
    throw new Error('--until must be on or after --since');
  }
  if (since !== undefined) {
    filtered = filtered.filter(row => row.date >= since);
  }
  if (until !== undefined) {
    filtered = filtered.filter(row => row.date <= until);
  }
  if (values.project !== undefined) {
    filtered = filtered.filter(row => row.project === values.project);
  }
  if (filtered.length === 0) return '暂无记录。';

  const limit = values.limit !== undefined ? Number(values.limit) : 10;
  if (Number.isNaN(limit) || limit <= 0) throw new Error('Invalid --limit. Expected positive number.');

  const slice = filtered.slice(-limit).reverse();
  const blocks = [`# 最近工作记录（展示 ${slice.length} 条 / 共 ${filtered.length} 条）`];
  for (const item of slice) {
    const statusLabel = statuses.get(item.status) || item.status;
    const lines = [
      `- **${item.date} 【${item.project}】${item.task}** \`[${statusLabel}]\``,
      `  - 产出：${item.result}`,
      `  - 证据：${item.evidence}`,
    ];
    if (item.next_step) lines.push(`  - 下一步：${item.next_step}`);
    if (item.ref) lines.push(`  - 链接：${item.ref}`);
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n\n');
}

function renderWeekly(rows, since, until) {
  const latest = new Map();
  for (const row of rows) {
    if (row.date < since || row.date > until) continue;
    const key = JSON.stringify([row.project, row.task]);
    const previous = latest.get(key);
    if (!previous || row.date >= previous.date) {
      latest.set(key, { ...row, ref: row.ref || previous?.ref });
    }
  }

  const completed = new Map();
  const inProgress = new Map();
  const next = [];
  const sorted = [...latest.values()].sort((a, b) => Buffer.compare(Buffer.from(a.project), Buffer.from(b.project)) || a.date.localeCompare(b.date));
  for (const row of sorted) {
    const isCompleted = row.status === 'local' || row.status === 'live';
    const targetMap = isCompleted ? completed : inProgress;
    if (!targetMap.has(row.project)) {
      targetMap.set(row.project, []);
    }
    targetMap.get(row.project).push(row);
    if (row.next_step) {
      next.push(`- **【${row.project}】${row.task}**：${row.next_step}`);
    }
  }
  return [
    `# 工作周报（${since} ~ ${until}）`,
    '## 一、 本周重点进展',
    renderSection(completed, false),
    '## 二、 风险与卡点',
    renderSection(inProgress, true),
    '## 三、 下周计划',
    next.length > 0 ? next.join('\n') : '暂无计划。',
  ].join('\n\n');
}

function main() {
  const allStringOptions = new Set(['log', ...optionsByAction.add, ...optionsByAction.weekly, ...optionsByAction.list.filter(k => k !== 'today')]);
  const options = Object.fromEntries([...allStringOptions].map(name => [name, { type: 'string' }]));
  options.today = { type: 'boolean' };
  options.help = { type: 'boolean', short: 'h' };
  const args = process.argv.slice(2);
  for (let index = 0; index + 1 < args.length; index++) {
    const flag = args[index];
    if (flag === '--') break;
    if (!flag.startsWith('--') || options[flag.slice(2)]?.type !== 'string') continue;
    const value = args[index + 1];
    const nextOption = value.startsWith('--') && Object.hasOwn(options, value.slice(2).split('=', 1)[0]);
    // The old CLI accepted negative numbers and quoted text such as "- item passed".
    if (!nextOption && value.startsWith('-') && (value.includes(' ') || /^-(?:\d+|\d*\.\d+)$/.test(value))) {
      args.splice(index, 2, `${flag}=${value}`);
    }
  }
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options,
  });
  if (values.help) {
    console.log('Usage: node log.mjs [--log FILE] add --project NAME --task TASK --result RESULT --evidence EVIDENCE --status STATUS [--date YYYY-MM-DD] [--next-step STEP] [--ref LINK]\n       node log.mjs [--log FILE] weekly [--since YYYY-MM-DD] [--until YYYY-MM-DD]\n       node log.mjs [--log FILE] list [--today] [--limit N] [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--project NAME]');
    return;
  }
  const [action] = positionals;
  if (positionals.length !== 1 || !Object.hasOwn(optionsByAction, action)) throw new Error('Choose add, weekly or list. See --help.');
  for (const name of Object.keys(values)) {
    if (name !== 'log' && !optionsByAction[action].includes(name)) throw new Error(`Unknown option for ${action}: --${name}`);
  }
  const projectLog = path.join(process.cwd(), '.agents', 'worklog.jsonl');
  const userLog = path.join(os.homedir(), '.spotter', 'worklog.jsonl');
  let defaultLog = fs.existsSync(path.join(process.cwd(), '.agents')) ? projectLog : userLog;
  if ((action === 'weekly' || action === 'list') && !fs.existsSync(defaultLog) && fs.existsSync(userLog)) {
    defaultLog = userLog;
  }
  const log = values.log ?? defaultLog;
  if (action === 'add') {
    for (const name of required) {
      if (values[name] === undefined) throw new Error(`Missing --${name}`);
    }
    if (!statuses.has(values.status)) throw new Error(`Invalid status: ${values.status}`);
    const record = {
      project: values.project, task: values.task, result: values.result, evidence: values.evidence,
      status: values.status, next_step: values['next-step'] ?? '', ref: values.ref ?? '',
      date: values.date === undefined ? today() : parseDay(values.date),
    };
    fs.mkdirSync(path.dirname(log), { recursive: true });
    fs.appendFileSync(log, JSON.stringify(record) + '\n', 'utf8');
    const statusLabel = statuses.get(record.status) || record.status;
    const lines = [
      '[spot-log 已记录]',
      `- 项目：${record.project}`,
      `- 任务：${record.task} [${statusLabel}]`,
      `- 产出：${record.result}`,
      `- 证据：${record.evidence}`,
      record.next_step ? `- 下一步：${record.next_step}` : '',
      record.ref ? `- 链接：${record.ref}` : '',
      `- 日期：${record.date}`,
      `- 账本：${log}`,
    ].filter(Boolean).join('\n');
    console.log(lines);
    return;
  }

  if (action === 'list') {
    console.log(renderList(readRows(log), values));
    return;
  }

  const since = values.since === undefined ? undefined : parseDay(values.since);
  const until = values.until === undefined ? undefined : parseDay(values.until);
  const monday = new Date(`${since ?? until ?? today()}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const first = since ?? parseDay(monday.toISOString().split('T')[0]);
  const last = until ?? parseDay(sunday.toISOString().split('T')[0]);
  if (last < first) throw new Error('--until must be on or after --since');
  console.log(renderWeekly(readRows(log), first, last));
}

try {
  main();
} catch (error) {
  console.error(`spot-log: ${error.message}`);
  process.exitCode = 2;
}
