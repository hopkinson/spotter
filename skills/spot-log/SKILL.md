---
name: spot-log
description: 保存任务结果和验证证据，按需生成中文周报草稿。Use after substantive task closeout or when asked for 本周周报.
---

用本目录的 `scripts/log.mjs` 写日志或读周报。
日志默认位置：优先使用当前项目中的 `.agents/worklog.jsonl`（便于团队协作与版本同步）；若无 `.agents` 目录则回退至用户目录 `~/.spotter/worklog.jsonl`。也可通过 `--log <路径>` 显式指定。

- 收尾记录一行。只记项目、任务、结果、验证、状态和可选的下一步或链接。去除凭证、客户资料和原始日志。证据仅在开发环境时写清范围。
- 有自动化用例时，`--evidence` 写「用例名或命令：结果」，Bug 修复附修复前结果，例如 `node --test amount.test.mjs：1 项通过（修复前失败）`。使用编译/构建检查时注明 `tsc: 退出码 0`。只有人工验证时注明「人工」和范围。
- 同一任务从本地验证进展到发布时，沿用项目名和任务名。周报选日期范围内最新的一条状态。
- 「写本周周报」按用户本地自然周生成草稿。也可传 `--since YYYY-MM-DD --until YYYY-MM-DD`。保留完成、卡点和下一步，发送需单独授权。

```text
node "<本技能目录>/scripts/log.mjs" add --project "项目" --task "任务" --result "结果" --evidence "验证证据" --status local
node "<本技能目录>/scripts/log.mjs" weekly
```

状态可用 `local`（本地通过）、`pushed`（已推送）、`deployed`（部署成功待验）、`live`（已上线并验证）、`pending`（进行中或待验证）、`blocked`（卡住）。可选 `--next-step` 和 `--ref`。
