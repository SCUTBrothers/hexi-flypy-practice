# 鹤习 · 小鹤双拼练习

React 19、UI SDK、ReUI 和 Tailwind CSS 4，使用 Vite+ 1.7.0 和 npm。

## 本地开发

本机验证环境为 Node.js 24.22、npm 12.0.2 和 Portless 0.15.7。首次使用 Portless 时，先安装 CLI（macOS 可运行 `brew install portless`）。

```sh
npm ci
npm run dev
```

打开终端打印的 HTTPS 地址。在当前 checkout 运行 `portless get hexi-flypy-practice` 可以再次查询。主工作区使用 `hexi-flypy-practice.localhost`，linked worktree 会在前面加上分支名的最后一段。协议和代理端口由本机 Portless 决定。Ctrl+C 停止当前开发服务。

需要直接使用 Vite+ 时，运行 `npm run dev:direct`。[Portless 使用说明](https://github.com/vercel-labs/portless)

## 验证与构建

```sh
npm run check
npm run typecheck
npm test
npm run build
npm run preview
```

产物在 `build/`。`.openai/hosting.json` 指向此目录。原来的 `dist/` 保留作迁移参考与旧版回归测试，新版入口为根目录 `index.html` 和 `src/main.tsx`。`vp test run` 同时运行 React/训练逻辑测试和两个旧版回归脚本。项目没有库打包、浏览器专用测试套件、覆盖率阈值或基准测试；没有需要保留的 Vitest v4 / tsdown 兼容设置。

## 数据与语音

沿用 `hexi-flypy-v1` 本地进度和 `hexi-audio-v1` 语音设置。进度按浏览器和网站来源隔离，localhost 不会读取线上域名下的记录，设备间也不会自动同步。

听音使用 Web Speech API 和设备提供的普通话语音。需要用户交互后开启自动朗读；无可用语音时可继续看字练习。多音字用词语语境朗读并指出目标字。

## 打字交互

- 点「专注模式」收起周边面板，按 Esc 返回。普通练习的虚拟键盘会标出刚按下的键。
- 在文章练习与影子跟打中，第一键把光标移到字中间，第二键完成当前字，自动跳过标点。影子跟打可选 30、60、90 字/分的配速；完成后可重打同一篇，对照上次的实际击键记录。
- 文章库支持按篇名、正文和专项音节搜索。「易混音专项」覆盖平翘舌、前后鼻音和零声母。
- 顶栏「击键声」可试听木键或机械键，选择音量。默认静音，偏好保存在 `hexi-key-sound-v1`。按错键会发出低音。击键声使用浏览器 Web Audio，与普通话朗读独立。

## UI SDK

已安装项目级 `.agents/skills/ui-sdk`。按 `AGENTS.md` 阅读安装版本自带文档。默认样式只从全局 CSS 导入一次，位于 Tailwind base 之后。按钮、输入、分段选择、开关、进度与帮助弹窗使用 UI SDK；WebMCP 桥接在浏览器支持时自动注册，带确认标记的动作默认拒绝。

## 项目 skills 与 ReUI

`npm run skills:sync` 同步 `package.json#skills` 中声明的 UI SDK、cstack、agent-browser、Fallow 和 frontend-design，并下载 ReUI 官方 skill 文件包。Codex、Pi 和 agy 共用仓库内的 `.agents/skills/`。UI SDK skill 跟随安装的 `@ui-sdk/core` 版本，ReUI skill 的来源与版本记录在 `.agents/skills/reui/source.json`。

`components.json` 配置了 `@reui` 注册表和 `base-nova` 风格，组件使用 `@/` 指向 `src/`。练习标题使用 `src/components/reui/badge.tsx`。添加组件时，在根目录运行 `npx shadcn@latest add @reui/<组件名>`。[ReUI 注册表](https://reui.io/docs/registry)

## ReUI MCP

在启动客户端的终端导出 `REUI_MCP_TOKEN`（ReUI Personal Token）。三个客户端均连接 `https://mcp.reui.io`。

| 客户端 | 项目配置                           | 加载与验证                                                                                   |
| ------ | ---------------------------------- | -------------------------------------------------------------------------------------------- |
| Codex  | `.codex/config.toml`               | 首次打开时信任本项目，重新启动会话后用 `codex mcp get reui` 查看配置，用 `/mcp` 查看连接。   |
| Pi     | `.pi/mcp.json`                     | 首次打开时信任本项目，用 `pi mcp list` 查看连接状态。                                        |
| agy    | `.agents/mcp_config.template.json` | 运行 `npm run mcp:sync` 生成本地 `.agents/mcp_config.json`，在项目会话中用 `/mcp` 刷新连接。 |

Codex 和 Pi 直接从启动环境读取令牌。agy 的生成文件仅限当前用户读写，已加入 Git 忽略规则。在新 checkout 中使用 agy，或更新令牌后，请重新运行 `npm run mcp:sync`。
