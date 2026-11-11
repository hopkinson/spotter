#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

function resolveDefaultTarget(scope, cwd = process.cwd()) {
  if (scope === 'global') {
    return path.join(os.homedir(), '.spotter', 'rules.md');
  }

  // 检查是否已有 rules/AGENTS.md
  const projectRules = path.join(cwd, 'rules', 'AGENTS.md');
  if (fs.existsSync(projectRules)) {
    return projectRules;
  }

  // 检查 .agents/rules/spot-workflow.md
  const workflowFile = path.join(cwd, '.agents', 'rules', 'spot-workflow.md');
  if (fs.existsSync(workflowFile)) {
    const content = fs.readFileSync(workflowFile, 'utf8');
    const refMatch = content.match(/@\[.*?\]\((.*?)\)/);
    if (refMatch) {
      const resolved = path.resolve(path.dirname(workflowFile), refMatch[1]);
      if (fs.existsSync(resolved)) return resolved;
    }
    return workflowFile;
  }

  const agentsRule = path.join(cwd, '.agents', 'rules', 'learned.md');
  return agentsRule;
}

function normalizeText(text) {
  return (text || '').trim();
}

function handleAdd(args, cwd = process.cwd()) {
  const rule = normalizeText(args.rule);
  if (!rule) {
    console.error('错误：--rule 不能为空');
    process.exit(1);
  }

  const scope = args.scope === 'global' ? 'global' : 'project';
  const target = args.target ? path.resolve(cwd, args.target) : resolveDefaultTarget(scope, cwd);
  const category = normalizeText(args.category) || '沉淀经验';

  fs.mkdirSync(path.dirname(target), { recursive: true });

  let content = '';
  if (fs.existsSync(target)) {
    content = fs.readFileSync(target, 'utf8');
  }

  // 去重判断
  const ruleLine = `- ${rule.replace(/^-+\s*/, '')}`;
  const rulePure = rule.replace(/^-+\s*/, '');
  if (content.includes(rulePure)) {
    console.log(`[spot-learn 已存在] 规则已存在，跳过重复写入。\n- 规则：${rulePure}\n- 目标：${target}`);
    return;
  }

  let updatedContent = content;
  const categoryHeader = `## ${category}`;

  if (!updatedContent.trim()) {
    updatedContent = `# 沉淀规则\n\n${categoryHeader}\n\n${ruleLine}\n`;
  } else if (updatedContent.includes(categoryHeader)) {
    // 插入到现有分类下方
    const parts = updatedContent.split(categoryHeader);
    const afterCategory = parts[1];
    const nextHeaderIndex = afterCategory.search(/\n## /);
    if (nextHeaderIndex !== -1) {
      const section = afterCategory.slice(0, nextHeaderIndex).trimEnd();
      const rest = afterCategory.slice(nextHeaderIndex);
      updatedContent = `${parts[0]}${categoryHeader}${section}\n${ruleLine}\n${rest}`;
    } else {
      updatedContent = `${parts[0]}${categoryHeader}${afterCategory.trimEnd()}\n${ruleLine}\n`;
    }
  } else {
    // 增加新的分类标题
    updatedContent = `${updatedContent.trimEnd()}\n\n${categoryHeader}\n\n${ruleLine}\n`;
  }

  fs.writeFileSync(target, updatedContent, 'utf8');

  console.log(`[spot-learn 已沉淀]
- 范围：${scope}
- 分类：${category}
- 规则：${rulePure}
- 目标：${target}`);
}

function handleList(args, cwd = process.cwd()) {
  const scope = args.scope === 'global' ? 'global' : 'project';
  const target = args.target ? path.resolve(cwd, args.target) : resolveDefaultTarget(scope, cwd);

  if (!fs.existsSync(target)) {
    console.log('暂无已沉淀规则。');
    return;
  }

  const content = fs.readFileSync(target, 'utf8');
  const lines = content.split('\n').filter(line => line.trim().startsWith('- '));

  if (lines.length === 0) {
    console.log('暂无已沉淀规则。');
    return;
  }

  console.log(`# 已沉淀规则（目标：${target}，共 ${lines.length} 条）`);
  for (const line of lines) {
    console.log(line);
  }
}

export function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`spot-learn: 经验与规则沉淀工具
用法:
  learn.mjs add --rule <规则文本> [--scope project|global] [--category 分类] [--target 路径]
  learn.mjs list [--scope project|global] [--target 路径]
`);
    return;
  }

  const options = {
    rule: { type: 'string' },
    scope: { type: 'string', default: 'project' },
    target: { type: 'string' },
    category: { type: 'string', default: '沉淀经验' },
  };

  const args = [...argv];
  for (let index = 0; index + 1 < args.length; index++) {
    const flag = args[index];
    if (flag === '--') break;
    if (!flag.startsWith('--') || options[flag.slice(2)]?.type !== 'string') continue;
    const value = args[index + 1];
    const nextOption = value.startsWith('--') && Object.hasOwn(options, value.slice(2).split('=', 1)[0]);
    if (!nextOption && value.startsWith('-') && (value.includes(' ') || /^-(?:\d+|\d*\.\d+)$/.test(value))) {
      args.splice(index, 2, `${flag}=${value}`);
    }
  }

  const { values, positionals } = parseArgs({
    args,
    options,
    allowPositionals: true,
  });

  const command = positionals[0] || 'list';

  if (command === 'add') {
    handleAdd(values, cwd);
  } else if (command === 'list') {
    handleList(values, cwd);
  } else {
    console.error(`未知命令：${command}。仅支持 add 或 list。`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  main();
}
