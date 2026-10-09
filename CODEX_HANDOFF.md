# 上分黄历 — Codex 交接

审计日期：2026-10-07（America/Toronto）。基准：`cb01f71a200569926475624e8f8e8da90619a430`。

## 环境和入口

- 原生静态页面，无 package.json、构建步骤或运行时包依赖。
- 开发检查使用 Node.js 24；本轮本机为 24.21.0。
- 本地预览：`python -m http.server 8000`；浏览器打开 http://localhost:8000/。
- 验证：`node --test tests/calendar.test.cjs`。修改前基线 5 个测试通过，0 失败、0 跳过，退出码 0。

## 本轮范围

新增项目开发约定、交接文档和独立 PR CI；不修改游戏算法、出生信息、AI 服务或部署工作流。CI 只有 contents: read，不请求生产密钥。

## 环境与发布边界

pages.yml 只在 main push / 手动运行时部署 GitHub Pages；合并本 PR 会触发现有发布流程，因此由用户决定合并时机。2026-10-07 审计时云环境尚未验证；后续实际验证见下文。不需要任何生产凭据，代理阶段网络保持限制。

## 2026-10-09 个人云环境与 Project

- 唯一使用的 ChatGPT/Codex 个人账号已确认。沿用已有 `shangfen-huangli` 环境，没有创建同名副本；仓库为本仓库，权限仍为“仅限我自己”。安装脚本未设置，网络沿用包管理器预设，附加域名/环境变量/网络密钥各为 0；只补充启动检查，没有扩大权限。
- 实际云端 Debian 13.6 / Node.js 24.19.0 / Python 3.12.14，在 `/workspace/shangfen-huangli` 最小 fetch 并检出 `codex/workflow-normalization-20261007`，准确验证提交 `b48dfc4858911c9de9c5b587a670831f79c32051`。前后 `git status --short` 均为空。
- 五个 JavaScript 文件各 `node --check` 退出 0；`node --test tests/calendar.test.cjs` 为 5/5，失败/跳过/取消各 0，退出 0。补入 startup skill 后在同一云实例重新执行启动检查，仍为 5/5、退出 0。
- 根页面、五个脚本、styles.css、assets/fengshui-bg.svg 共 8 项 HTTP 200。系统 Chromium + Python Playwright 使用新的浏览器 context、America/Toronto 时区，实际填写 2000-02-05 / 23:30 并点击保存，选择 2024-02-10，核验正月初一、12 个时辰、非空本地解读；点击重新解签并刷新，资料仍保存、引导关闭。pageerror=0；控制台另有一条 favicon.ico 404，不称所有资源无错误。
- 已保存并发布个人开发环境快照；没有发布游戏或合并 PR。新任务仍须选择所需分支、核对实际 HEAD 并重跑启动检查。本次没有新建开发任务来验证发布后快照恢复，不能将当前准备实例的结果当作新任务恢复验证。
- [上分黄历开发 Project](https://chatgpt.com/g/g-p-6ac8dcad00b881919f6c5f5afd03a915/project) 已创建、保存开发指令，并重新打开核对完整文本；没有新建聊天或邀请其他成员。
- 云端证据位于设置任务的 `/tmp/shangfen-validation`；浏览器截图 SHA-256：首次引导 `591f2217b24aaf350be49924517edeee96e937354cf161cb750c5d8040be562a`，所选日期 `c412756cb84fa7a55db5aaf9fb9aa74ae66def513d6276c458a1884238f39eec`，刷新后 `6b0fbef2da129f7adede5f4efe7e56abdb4faef74af43322c181c46b7d30ae52`。设置任务为 `01a1208e-0860-741f-a144-85c6c0cf20e7`；本机统一审计工作区另存原始命令、退出码和发布截图。
- 本次仓库更新仅此交接文档，游戏源文件、测试与 Actions 未修改。修改前本机 Node.js 24.21.0 的 5 语法/5 测试通过；通过现有草稿 [PR #3](https://github.com/lv5accelerator-xy/shangfen-huangli/pull/3) 交接，仍由用户决定合并与 Pages 发布时机。

## 下一步

1. 审查并合并本次规范化 PR。
2. 在已配置的 Project 继续记录产品目标、日期规则和验收条件，以本仓库文件和准确 SHA 为代码事实来源。
3. 在获准的新云开发任务中验证发布快照恢复；记录实际分支、SHA、启动检查和浏览器结果。只使用当前个人账号，不依赖跨账号环境、文件或凭据共享。
4. 如要改 AI 远端解读，先明确测试服务、隐私边界和失败降级验收。

## 每次交接填写

- 分支 / 起点与最终 SHA / PR：
- 变更及未完成事项：
- 命令、退出码、测试总数、失败和跳过：
- 浏览器验证与云环境验证（未执行写明）：
- 已提交 / 未提交 / 已推送：
- 合并与部署是否另获授权：
