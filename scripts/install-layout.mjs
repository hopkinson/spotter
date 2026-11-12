import path from 'node:path';

export const clientTargets = new Map([
  ['codex', {
    folder: '.agents', projectRule: 'AGENTS.md', globalRule: '.codex/AGENTS.md',
    configVariable: 'CODEX_HOME', configFolder: '.codex',
  }],
  ['antigravity-cli', {
    folder: '.agents', projectRule: 'AGENTS.md', globalRule: '.gemini/config/AGENTS.md',
    discoveryFile: '.gemini/config/skills.json',
  }],
  ['claude-code', {
    folder: '.claude', projectRule: 'CLAUDE.md', globalRule: '.claude/CLAUDE.md',
    configVariable: 'CLAUDE_CONFIG_DIR', configFolder: '.claude',
  }],
]);

export function createInstallLayout({ root, global = false }) {
  const targets = new Map([...clientTargets]
    .map(([tool, target]) => [tool, {
      ...target, ruleFile: global ? target.globalRule : target.projectRule,
    }]));
  return {
    root, global, targets,
    ruleFiles: [...new Set([...targets.values()].map(target => target.ruleFile))],
    discoveryFiles: global ? [...targets.values()].map(target => target.discoveryFile).filter(Boolean) : [],
    receipt: global ? '.spotter/global-install.json' : '.spotter-install.json',
    staging: global ? '.spotter/global-install-staging' : '.spotter-install-staging',
  };
}

export function validateConfigRoots(layout, tools, env = process.env) {
  if (!layout.global) return;
  for (const [tool, { configVariable, configFolder }] of layout.targets) {
    if (!configVariable || !tools.includes(tool)) continue;
    if (env[configVariable] && path.resolve(env[configVariable]) !== path.join(layout.root, configFolder)) {
      throw new Error(`Custom ${configVariable} is not supported by global installation. Use the default directory or project installation.`);
    }
  }
}

export function renderDiscoveryManifest(layout, target, skillNames) {
  return JSON.stringify({ entries: [{
    path: path.join(layout.root, target.folder, 'skills').replaceAll('\\', '/'),
    include_only: skillNames,
  }] }, null, 2) + '\n';
}

export function renderRules(rules, layout, target) {
  if (!layout.global) return rules;
  const helperRoot = path.join(layout.root, target.folder, 'bundled-skills').replaceAll('\\', '/');
  const text = Buffer.from(rules, 'latin1').toString('utf8').replace(
    /从当前客户端实际安装位置运行 `skills\/spot-update\/scripts\/check.mjs`（项目安装位于 `\.agents\/` 或 `\.claude\/`，全局安装加 `--global`）/,
    () => `运行 \`node "${path.join(layout.root, target.folder, 'skills/spot-update/scripts/check.mjs').replaceAll('\\', '/')}" --global\``,
  ).replace(
    /^- 内部辅助 skill 默认.*$/m,
    () => `- 内部辅助文件从 \`${helperRoot}/<name>/SKILL.md\` 读取；不在菜单注册。可选文件未加载时继续，关键文件未找到时停在该阶段说明缺什么能力。运行辅助脚本时使用其实际安装路径，工作目录保持在业务项目根目录。`,
  );
  return Buffer.from(text, 'utf8').toString('latin1');
}
