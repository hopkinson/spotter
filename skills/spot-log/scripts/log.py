"""Record short Spotter work notes and render a local weekly draft."""

import argparse
import json
from datetime import date, timedelta
from pathlib import Path


STATUSES = {
    "local": "本地通过",
    "pushed": "已推送",
    "deployed": "部署成功待验",
    "live": "已上线并验证",
    "pending": "在做或待验证",
    "blocked": "卡住",
}


def render_weekly(rows, since, until):
    latest = {}
    for row in rows:
        day = date.fromisoformat(row["date"])
        if since <= day <= until:
            key = (row["project"], row["task"])
            if key not in latest or day.isoformat() >= latest[key]["date"]:
                prev_ref = latest.get(key, {}).get("ref", "")
                latest[key] = {**row, "ref": row.get("ref") or prev_ref}

    sections = {"本周完成": [], "在做或卡点": [], "下周计划": []}
    for row in sorted(latest.values(), key=lambda item: (item["project"], item["date"])):
        status = row["status"]
        section = "本周完成" if status in {"local", "live"} else "在做或卡点"
        label = f'{row["project"]}｜{row["task"]}'
        line = f'- {label}｜{row["result"]}｜{STATUSES[status]}'
        if row.get("evidence"):
            line += f'｜{row["evidence"]}'
        if row.get("ref"):
            line += f'｜{row["ref"]}'
        sections[section].append(line)
        if row.get("next_step"):
            sections["下周计划"].append(f'- {label}｜{row["next_step"]}')

    parts = [f"# 周报 {since.isoformat()} 至 {until.isoformat()}"]
    for title, lines in sections.items():
        parts.extend((f"## {title}", "\n".join(lines) or "暂无记录。"))
    return "\n\n".join(parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--log", type=Path, default=Path.home() / ".spotter" / "worklog.jsonl")
    actions = parser.add_subparsers(dest="action", required=True)

    add = actions.add_parser("add")
    for field in ("project", "task", "result", "evidence"):
        add.add_argument(f"--{field}", required=True)
    add.add_argument("--status", choices=STATUSES, required=True)
    add.add_argument("--next-step", default="")
    add.add_argument("--ref", default="")
    add.add_argument("--date", type=date.fromisoformat, default=date.today())

    weekly = actions.add_parser("weekly")
    weekly.add_argument("--since", type=date.fromisoformat)
    weekly.add_argument("--until", type=date.fromisoformat)
    args = parser.parse_args()

    if args.action == "add":
        record = vars(args).copy()
        del record["log"], record["action"]
        record["date"] = args.date.isoformat()
        args.log.parent.mkdir(parents=True, exist_ok=True)
        with args.log.open("a", encoding="utf-8") as output:
            output.write(json.dumps(record, ensure_ascii=False) + "\n")
        print(args.log)
        return

    anchor = args.since or args.until or date.today()
    monday = anchor - timedelta(days=anchor.weekday())
    since = args.since or monday
    until = args.until or monday + timedelta(days=6)
    if until < since:
        parser.error("--until must be on or after --since")

    rows = []
    if args.log.exists():
        with args.log.open(encoding="utf-8") as source:
            for number, line in enumerate(source, 1):
                if not line.strip():
                    continue
                try:
                    row = json.loads(line)
                    if not isinstance(row, dict) or row["status"] not in STATUSES:
                        raise ValueError("invalid status or row")
                    date.fromisoformat(row["date"])
                    for field in ("project", "task", "result"):
                        row[field]
                    rows.append(row)
                except (json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
                    parser.error(f"{args.log}:{number}: {error}")
    print(render_weekly(rows, since, until))


if __name__ == "__main__":
    main()
