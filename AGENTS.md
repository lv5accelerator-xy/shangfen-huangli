# 上分黄历 — 开发约定

本仓库是原生 HTML/CSS/JavaScript 娱乐工具。保留现有 calendar.js、app.js、onboarding.js、extras.js、ai-fortune.js 的职责；不迁入 React、Unity 或 Godot。

- 开始任务先读 README.md 和 CODEX_HANDOFF.md，检查分支及工作区；先运行 `node --test tests/calendar.test.cjs` 建立基线。
- 日期、时辰按设备本地时区，零点换日；出生信息和偏好只在本地存储。涉及日期、首次引导或存储变化时增加实际行为回归。
- AI 解读默认使用本地规则。SHANGFEN_AI_ENDPOINT 是可选服务地址，不是密钥。不得把服务端 API key 放进页面、脚本或 Git。
- 用隔离浏览器验证交互和存储失败；不要清除用户正式 localStorage。
- 使用 `codex/<task>` 分支和 PR。先测试再修改，修改后重跑测试，并报告测试数量、失败/跳过、提交及推送状态。
- .github/workflows/ci.yml 负责 PR 检查；pages.yml 负责 main 发布。不要自动合并、触发部署、修改 Pages 设置或仓库可见性。
- ChatGPT Project 保存产品决定；仓库保存实际代码和交接。跨账号通过分支、PR、提交 SHA 和 CODEX_HANDOFF.md 交接，不假设聊天、云文件、环境或凭据同步。
- 任务结束更新 CODEX_HANDOFF.md：基准 SHA、范围、验证、风险、下一步。未执行的浏览器/云环境测试须明确标记。
