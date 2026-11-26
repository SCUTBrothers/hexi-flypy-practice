# 鹤习开发约定

## 练习与数据

- React 入口在 `src/main.tsx`。修改训练流程时保留小鹤双拼编码规则、分组练习、错题复习和语音行为。
- 兼容已有的 `hexi-flypy-v1` 进度与 `hexi-audio-v1` 语音设置。旧版回归脚本直接读取 `dist/` 中的文件，生产构建输出到 `build/`。

## UI 与项目 skills

- 使用 UI SDK 前先读 `.agents/skills/ui-sdk/SKILL.md` 和安装版本的 `node_modules/@ui-sdk/react/docs/llms.txt`。新增组件前在 `docs/core.md` 中按标题检索，并阅读同目录的 `docs/rendering.md`。
- 使用 ReUI 前先读 `.agents/skills/reui/SKILL.md`，通过 `reui` MCP 查询组件名称和 API。用 shadcn CLI 从 `components.json` 中的 `@reui` 注册表安装组件，沿用现有主题。
- 项目 skills 在 `package.json#skills` 声明，运行 `npm run skills:sync` 同步到 `.agents/skills/`。ReUI 官方 skill 文件包由同一命令下载。
- Codex、Pi 和 agy 的项目 MCP 配置见 [README.md](README.md#reui-mcp)。凭据来自 `REUI_MCP_TOKEN`，agy 的本地配置由 `npm run mcp:sync` 生成。请勿输出或提交该文件中的令牌。

## 开发与验证

- 运行 `npm ci` 安装锁定依赖，`npm run dev` 通过 Portless 启动当前 checkout。用 `portless get hexi-flypy-practice` 查询该 worktree 的 URL。
- 代码变更后运行 `npm run check`、`npm run typecheck`、`npm test` 和 `npm run build`。`npm test` 包含旧版练习与语音回归。
- 仅在用户明确要求时提交、推送或发布。
