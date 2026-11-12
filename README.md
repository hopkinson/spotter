<div align="center">
  <img src="assets/logo.svg" width="120" alt="Spotter logo" />
  <h1>Spotter</h1>
  <p><b>查得清全景，控得住风险，交得出证据。</b></p>
  <p>全景走查 · 只读诊断 · 知识图谱 · 风险分级工作流 · 独立审查与审计 · 周报沉淀</p>
  <p>中文 · <a href="README_EN.md">English</a></p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
    <img src="https://img.shields.io/badge/node-%E2%89%A522-339933" alt="Node 22+" />
    <img src="https://img.shields.io/badge/Codex%20%7C%20Claude%20Code%20%7C%20Antigravity-supported-8A2BE2" alt="Supported assistants" />
    <img src="https://img.shields.io/badge/commands-10-orange" alt="10 commands" />
  </p>
</div>

## 为什么需要 Spotter？

> **AI 编程最大的痛点不是写不出代码，而是「代码黑盒与失控」**：传统 AI 回复冗长啰嗦、废话多，且未经确认就乱改代码，导致项目如同黑盒，久而久之无人敢动。

Spotter 为 AI 助手注入了三大核心防线，拒绝客套与黑盒：

1. **默认极简交互（Concise Mode）**：首句直接给结论，严禁“好的/很高兴为您解答”等口水话，杜绝多层嵌套列表，尽量一屏读完；只有你说「展开」才补细节。
2. **只读核查与草图对照**：未经明确开工确认，绝不擅改业务代码。先画「改前改后草图」与拟议 diff，人类满意后再动手。
3. **真实证据闭环**：代码改完自动在终端跑测试/构建，必须拿到 exit code 0 的真实通过凭据交付，绝不口头声明“改好了”。

### 典型交互：加一个「导出 Excel」按钮（`/spot-plan`）

1. **你发令**：
   ```text
   /spot-plan 在订单列表加个「导出 Excel」按钮
   ```

2. **AI 只读核查，一屏直出改前改后草图与拟议 diff**（绝不擅改业务代码）：
   ```text
   [改前] [ 搜索框 ] [ 状态筛选 ▼ ]                 [ + 新建 ]
   [改后] [ 搜索框 ] [ 状态筛选 ▼ ]   [ 导出 Excel ] [ + 新建 ]
   -------------------------------------------------------------
   拟议修改：
   - 前端：app/pages/orders.vue（新增下载按钮）
   - 后端：server/api/orders/export.ts（流式返回 xlsx）
   【下一步操作】回复「开工」
   ```

3. **你回复「开工」** ➜ AI 实施修改，跑通项目既有测试，附带终端真实通过凭证交付。

## 快速开始

个人跨项目共用可安装到全局（Codex / Claude Code）。当前源码在本仓库运行以下命令；公共规则和工具统一更新，项目只保留业务要求。详见[全局安装与旧项目迁移](INSTALL.md)。

```bash
node scripts/install.mjs --global codex claude-code
# 后续统一更新
node scripts/install.mjs --global
```

在目标项目根目录按客户端运行（依赖 Node 22+ / Git）：

```bash
# Codex（重启后使用 $spot-plan）
npx --yes --allow-git=root github:hopkinson/spotter codex

# Claude Code / Antigravity CLI（重启后使用 /spot-plan）
npx --yes --allow-git=root github:hopkinson/spotter claude-code
npx --yes --allow-git=root github:hopkinson/spotter antigravity-cli
```

## 场景与命令速查

> 注：Codex 环境使用 `$` 前缀（如 `$spot-plan`）。各命令状态机流转与证据阶梯详见 [工作流全景规范](docs/WORKFLOW_SPEC.md)。

| 你想做什么（日常说法） | 对应命令 | 核心交付物（看得到的凭据） |
| :--- | :--- | :--- |
| 加个导出功能 | [`/spot-plan`](skills/spot-plan/SKILL.md) | **改前改后草图** + 拟议核心 diff，确认后开工 |
| 修一下登录超时 | [`/spot-bug`](skills/spot-bug/SKILL.md) | **复现调用链路** + 单点失败回归用例与修复 diff |
| 理一下这个功能 | [`/spot-trace`](skills/spot-trace/SKILL.md) | **交互状态流图** + 精确代码符号清单（只读） |
| 帮我看看改动 | [`/spot-review`](skills/spot-review/SKILL.md) | **`[Blocker]` / `[Nit]` 清单**，直接剔除冗余代码 |
| 阶段风险审计 | [`/spot-audit`](skills/spot-audit/SKILL.md) | **隐性漏洞与测试缺口排查**（只读） |
| 代码体检 / 闲置清理 | [`/spot-refactor`](skills/spot-refactor/SKILL.md) | **死代码与孤立文件清单** + 守护测试断言 |
| 准备发布 / 部署 | [`/spot-release`](skills/spot-release/SKILL.md) | **预检凭证**，授权后推送并盯部署 |
| 建个代码图谱 | [`/spot-graph`](skills/spot-graph/SKILL.md) | **增量知识图谱**，提交后自动刷新 |
| 写本周周报 | [`/spot-log`](skills/spot-log/SKILL.md) | **任务验证日志** ➜ 自动起草结构化周报 |
| 升级随包技能 | [`/spot-update`](skills/spot-update/SKILL.md) | **上游版本与许可检查**，确认后升级 |

## 更新与移除

在目标项目根目录更新已安装的工具：

```bash
npx --yes --allow-git=root github:hopkinson/spotter
```

移除前先关闭手动启用的图谱刷新、前端 hook 或快捷方式，再运行：

```bash
npx --yes --allow-git=root github:hopkinson/spotter --remove
```

移除命令清理脚本安装的技能和规则标记段，保留项目规则文件和私人日志。指定版本、处理冲突和中断恢复见 [安装说明](INSTALL.md)。

## 参与贡献

欢迎提 Issue 和 PR。`npm test` 检查打包与安装脚本。规则和技能的实际表现取决于助手是否加载它们，以及项目具备哪些验证条件，可用 [工作流回放案例](tests/workflow-replay.md) 检查。

## 许可与第三方来源

本项目使用 [MIT 许可证](LICENSE)。`bundled-skills/` 中的第三方技能保留各自原许可，来源和版本见 [第三方技能来源](bundled-skills/SOURCES.md)。
