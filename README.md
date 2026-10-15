# 上分黄历

基于干支、五行、十二时辰与基础命宫意象制作的游戏娱乐黄历。

## 功能

- 切换日期，联动查看农历、纳音、日柱与全天评分
- 桌面两侧使用本地 SVG 八卦纹样背景
- 查看当前时辰更适合：排位 / ARAM / TFT
- 查看十二时辰全天评分
- 查看各模式黄金三时辰
- 首次填写出生日期和时间，自动换算农历月份与时辰；后续可关闭命宫加成
- 数据只保存在浏览器 localStorage，无服务器、无账号

## 在线版

GitHub Pages 部署完成后：

https://lv5accelerator-xy.github.io/shangfen-huangli/

> 仅供娱乐与传统文化体验，不代表科学预测，也不保证游戏胜负。

## 开发验证

使用 Node.js 24 运行 `node --test tests/*.test.cjs`（包含原有 `tests/calendar.test.cjs`）。静态预览可运行 `python -m http.server 8000`，无需安装依赖或构建。

提交前对 `calendar.js`、`app.js`、`extras.js`、`ai-fortune.js`、`onboarding.js` 分别运行 `node --check`，并运行 `git diff --check`。独立 PR CI 只读检查语法和全部测试；Pages 仍只在 main push / 手动触发时部署，并在部署前执行相同验证。

回归测试使用 mock fetch、可控时钟和定时器，不访问 AI 服务。日期与页面由一次计算的状态同步；干支、时辰与关系计算统一在 `calendar.js`。评分样本冻结自 main `cb01f71a200569926475624e8f8e8da90619a430`。

首次填写仅新保存 `enabled`、`lunarMonth`、`birthHourIndex`；已有有效资料仍可读取，不自动清理旧字段。在命盘弹窗点击“清除本地命盘资料”仅删除本项目的 `shangfenHuangliProfileV1` 键，随后恢复首次填写。

AI 默认使用本地规则，未配置 `window.SHANGFEN_AI_ENDPOINT` 时不会请求网络。可选端点仅在点击“重新解签”时请求；请求超过 15 秒会取消并回退本地，也可点击“取消请求”。相同输入刷新保留当前结果；输入变化即取消旧请求并清除结果，只保留当前输入的单条内存结果，不保留历史缓存。

日期和时辰按设备本地时区，日柱零点换日。闰月按同名月份处理；本版仅使用基础命宫权重，不是完整八字或紫微排盘。
