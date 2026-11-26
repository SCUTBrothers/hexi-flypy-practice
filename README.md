# 鹤习 · 小鹤双拼练习

React 19 + UI SDK + Tailwind CSS 4，使用 Vite+ 1.7.0 和 npm。

## 本地开发

需要 Node.js 22.18+（22.x）、24.11+（24.x）或 26+。

```sh
npm install
npm exec -- vp dev
```

`vp dev` 启动内置开发服务器；`vp run <task>` 运行 package.json 中的项目脚本，例如 `npm exec -- vp run typecheck`。未全局安装 vp 时，通过 `npm exec --` 调用本地 CLI。packageManager 字段固定 npm。

## 验证与构建

```sh
npm exec -- vp check
npm exec -- vp test run
npm run typecheck
npm exec -- vp build
npm exec -- vp preview
```

产物在 `build/`。`.openai/hosting.json` 已指向此目录；本次没有提交、推送或发布。原来的 `dist/` 保留作迁移参考与旧版回归测试，新版入口为根目录 `index.html` 和 `src/main.tsx`。`vp test run` 同时运行 React/训练逻辑测试和两个旧版回归脚本。项目没有库打包、浏览器专用测试套件、覆盖率阈值或基准测试；没有需要保留的 Vitest v4 / tsdown 兼容设置。

## 数据与语音

沿用 `hexi-flypy-v1` 本地进度和 `hexi-audio-v1` 语音设置。进度按浏览器和网站来源隔离，localhost 不会读取线上域名下的记录，设备间也不会自动同步。

听音使用 Web Speech API 和设备提供的普通话语音。需要用户交互后开启自动朗读；无可用语音时可继续看字练习。多音字用词语语境朗读并指出目标字。

## UI SDK

已安装项目级 `.agents/skills/ui-sdk`。按 `AGENTS.md` 阅读安装版本自带文档。默认样式只从全局 CSS 导入一次，位于 Tailwind base 之后。按钮、输入、分段选择、开关、进度与帮助弹窗使用 UI SDK；WebMCP 桥接在浏览器支持时自动注册，带确认标记的动作默认拒绝。
