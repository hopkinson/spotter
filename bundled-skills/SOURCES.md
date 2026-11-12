# 第三方技能来源

| 技能 | 锁定版本 | 上游 | 许可 |
| --- | --- | --- | --- |
| spot-before-after-sketch | `d018100cf2d479b226f9514b685d9d8281645811` | [hopkinson/before-after-sketch](https://github.com/hopkinson/before-after-sketch) | [MIT](spot-before-after-sketch/LICENSE) |
| spot-ponytail、spot-ponytail-review | 插件 `5.3.3` | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) · [npm](https://www.npmjs.com/package/@dietrichgebert/ponytail) | [MIT](spot-ponytail/LICENSE) |
| spot-diagnosing-bugs | `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` | [mattpocock/skills](https://github.com/mattpocock/skills) | [MIT](spot-diagnosing-bugs/LICENSE) |
| spot-grilling | `59db609eb1e18aaf59b63284d0e52255aff0c63c` | [mattpocock/skills](https://github.com/mattpocock/skills) | [MIT](spot-grilling/LICENSE) |
| spot-communicating-concisely | `952b150a16b9cf9c702022ea779bcc6750b0d48d` | [ganyuanran/aegis](https://github.com/ganyuanran/aegis) | [MIT](spot-communicating-concisely/LICENSE) |
| spot-verification-before-completion | `28dfb41e4d08239c6b47c6425396c81cdd10601e` | [ganyuanran/aegis](https://github.com/ganyuanran/aegis) | [MIT](spot-verification-before-completion/LICENSE) |
| spot-impeccable | `9a949fb543d44cfb406f61bcab99d95d7f12cf1d`（`skill-v4.0.4`） | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | [Apache-2.0](spot-impeccable/LICENSE) |
| spot-design-taste-frontend | `63aba5f43b5056758b15bbe7d683da8c86a7a7ad`（`v2.1.3`） | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | [MIT](spot-design-taste-frontend/LICENSE) |

Spotter 本地修复了 Impeccable 的文件名处理、问答提交和快捷方式保护，并让 Design Taste 的两个检查器共用本地预览服务。升级这些副本时需保留对应的行为和回归测试。

Impeccable 另外适配了用户级安装：hook 和项目快捷方式可引用全局辅助文件，脚本执行仍保持业务项目工作目录，保留项目级安装路径优先和自定义内容保护。

Before After Sketch 保留生成好的 README 配图，重制工具留在上游。验证技能通过目标项目配置调用可选的 Aegis 工作区工具。升级时保留这两处调整。

随包副本保留脚本、参考资料和许可，目录名和 `SKILL.md` 的 `name` 加 `spot-`。`spot-impeccable` 适配了辅助文件的安装路径，快捷方式由当前项目的已安装脚本管理，直接读取项目内的随包工作流。Ponytail 只打包两项技能，工作流和权限约束由 Spotter 规则提供。Git 来源用 `git ls-remote <上游地址> HEAD` 检查，Ponytail 用 `npm view @dietrichgebert/ponytail version`。
