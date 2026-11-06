"""Render README examples. Requires Pillow; skill users need no dependencies.

Usage: python tools/render_readme.py [--font FONT] [--mono-font FONT]
"""

import argparse
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
BG = "#f4f6f8"
INK = "#202932"
MUTED = "#596672"
ACCENT = "#176b55"
LINE = "#d7dfe5"
CODE = "#edf2f5"


def resolve_font(explicit, candidates):
    for value in [explicit, *candidates]:
        if value and Path(value).is_file():
            return value
    raise SystemExit("Chinese font required: pass --font and --mono-font.")


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--font")
parser.add_argument("--mono-font")
args = parser.parse_args()
SANS = resolve_font(args.font, ["C:/Windows/Fonts/msyh.ttc"])
MONO = resolve_font(args.mono_font, ["C:/Windows/Fonts/simsun.ttc", SANS])
OUT.mkdir(exist_ok=True)


def text(draw, xy, value, size=28, color=INK, mono=False):
    font = ImageFont.truetype(MONO if mono else SANS, size)
    if mono:
        cell = size / 2
        for row, line in enumerate(value.splitlines()):
            x, y = xy[0], xy[1] + row * (size + 15)
            for char in line:
                if char in "─│┌┐└┘├┤┬┴┼":
                    cx, cy = x + cell / 2, y + size / 2
                    if char in "─┐┘┤┬┴┼":
                        draw.line((x, cy, cx, cy), fill=color, width=2)
                    if char in "─┌└├┬┴┼":
                        draw.line((cx, cy, x + cell, cy), fill=color, width=2)
                    if char in "│└┘├┤┴┼":
                        draw.line((cx, y - 7.5, cx, cy), fill=color, width=2)
                    if char in "│┌┐├┤┬┼":
                        draw.line((cx, cy, cx, y + size + 7.5), fill=color, width=2)
                    x += cell
                else:
                    draw.text((x, y), char, font=font, fill=color)
                    x += cell * (2 if unicodedata.east_asian_width(char) in "WF" or char == "→" else 1)
        return
    draw.multiline_text(xy, value, font=font, fill=color, spacing=15)


def wireframe(lines):
    width = 68
    result = ["┌" + "─" * width + "┐"]
    for line in lines:
        if line is None:
            result.append("├" + "─" * width + "┤")
        else:
            used = sum(2 if unicodedata.east_asian_width(c) in "WF" else 1 for c in line)
            result.append("│ " + line + " " * (width - used - 1) + "│")
    result.append("└" + "─" * width + "┘")
    return "\n".join(result)


def canvas(height, title, subtitle):
    im = Image.new("RGB", (1440, height), BG)
    d = ImageDraw.Draw(im)
    text(d, (64, 40), title, 46)
    text(d, (66, 111), subtitle, 25, MUTED)
    return im, d


def panel(d, box):
    d.rounded_rectangle(box, radius=18, fill="#ffffff", outline=LINE, width=2)


im, d = canvas(970, "同一个问题，两种回答", "示例 · 给删除文件操作增加一次确认，并说明改动")
panel(d, (64, 186, 696, 864))
panel(d, (724, 186, 1376, 864))
text(d, (96, 216), "普通回答", 32)
text(d, (756, 216), "使用 before-after-sketch", 32, ACCENT)
d.line((96, 278, 664, 278), fill=LINE, width=2)
d.line((756, 278, 1344, 278), fill=LINE, width=2)
text(d, (100, 316),
     "当前点击「删除」后，文件会立即移除。\n\n"
     "建议增加确认弹窗：点击「删除」后，\n"
     "先显示「确认删除？」。\n\n"
     "选择「确认删除」才移除文件；\n"
     "选择「取消」则保留文件。", 28)
text(d, (760, 310), "改前", 30)
d.rounded_rectangle((756, 362, 1344, 450), radius=10, fill=CODE)
text(d, (778, 387), "[删除] → 文件移除", 28, mono=True)
text(d, (760, 492), "改后（建议）", 30, ACCENT)
d.rounded_rectangle((756, 548, 1344, 759), radius=10, fill=CODE)
text(d, (778, 575), "[删除] → 确认弹窗\n"
     "           ├→ 确认删除 → 文件移除\n"
     "           └→ 取消     → 文件保留", 28, mono=True)
text(d, (66, 905), "两边信息一致；右侧将改前、改后分成两个独立模块。", 25, MUTED)
im.save(OUT / "answer-comparison.png", optimize=True)


im, d = canvas(1290, "页面调整，也能画清楚", "示例 · 收起次要筛选条件，字段与查询能力保留")
panel(d, (64, 184, 1376, 644))
text(d, (100, 214), "改前", 34)
d.rounded_rectangle((100, 282, 1340, 602), radius=10, fill=CODE)
text(d, (140, 314),
     wireframe(["姓名 [      ]  电话 [      ]  状态 [全部 v]",
                "日期 [      ]  部门 [      ]  来源 [全部 v]  [查询]",
                None, "案件列表"]), 30, mono=True)
panel(d, (64, 684, 1376, 1184))
text(d, (100, 714), "改后（建议）", 34, ACCENT)
d.rounded_rectangle((100, 782, 1340, 1142), radius=10, fill=CODE)
text(d, (140, 814),
     wireframe(["姓名 [      ]  [查询]  [更多筛选 v]", None, "案件列表"]) + "\n\n"
     "[更多筛选 v] → 电话 / 状态 / 日期 / 部门 / 来源", 30, mono=True)
text(d, (66, 1224), "边界：只改变筛选项的展示方式，不移除字段。", 25, MUTED)
im.save(OUT / "page-sketch.png", optimize=True)
print("Rendered assets/answer-comparison.png and assets/page-sketch.png")
