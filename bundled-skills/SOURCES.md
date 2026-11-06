# 第三方技能来源

| 技能 | 锁定版本 | 上游 | 许可 |
| --- | --- | --- | --- |
| spot-before-after-sketch | `d018100cf2d479b226f9514b685d9d8281645811` | [hopkinson/before-after-sketch](https://github.com/hopkinson/before-after-sketch) | [MIT](spot-before-after-sketch/LICENSE) |
| spot-ponytail、spot-ponytail-review | 插件 `5.3.3` | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) · [npm](https://www.npmjs.com/package/@dietrichgebert/ponytail) | [MIT](spot-ponytail/LICENSE) |
| spot-diagnosing-bugs | `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` | [mattpocock/skills](https://github.com/mattpocock/skills) | [MIT](spot-diagnosing-bugs/LICENSE) |
| spot-communicating-concisely | `952b150a16b9cf9c702022ea779bcc6750b0d48d` | [ganyuanran/aegis](https://github.com/ganyuanran/aegis) | [MIT](spot-communicating-concisely/LICENSE) |

随包副本保留原文和许可，只在目录名和 `SKILL.md` 的 `name` 加 `spot-`，避免本机同名 skill 抢先加载。Ponytail 只打包两项技能，工作流和权限约束由 Spotter 规则提供。Git 来源用 `git ls-remote <上游地址> HEAD` 检查，Ponytail 用 `npm view @dietrichgebert/ponytail version`。

`grilling`（`grill-me` 的实际实现）、`verification-before-completion`、`impeccable` 和 `design-taste-frontend` 使用 AGY 已安装的版本。现有副本未核实到可用于发布的精确上游版本及资源范围。可查阅 [Matt Pocock Skills](https://github.com/mattpocock/skills)、[Aegis](https://github.com/ganyuanran/aegis)、[Impeccable](https://github.com/pbakaus/impeccable) 和 [Taste Skill](https://github.com/Leonxlnx/taste-skill)；加载时保留各自的脚本和参考文件。
