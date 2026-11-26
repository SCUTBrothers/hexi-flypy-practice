# 搜索笔记

搜索功能支持用户按标题或正文文本查找笔记、查看匹配的笔记内容，并区分“无匹配结果”与“搜索功能不可用”。

## Sub-features

- `search-open`：从各个受支持的浏览器入口点打开搜索。
- `search-match`：返回标题与正文匹配结果，且不修改笔记数据。
- `search-open-result`：在笔记编辑器中打开搜索结果。
- `search-empty`：对无匹配项的查询展示完整的空状态提示。
- `search-clear`：清空查询词并恢复最近笔记视图。
- `search-cli`：从终端返回相同的匹配笔记。

## How to get to it (user POV)

- 点击浏览器工具栏中的 `Search` 按钮。
- 当焦点不在可编辑字段内时，在浏览器中按 `/` 键。
- 在终端运行 `notes search <query>`。

## Driving it with control-notes

Preconditions:

- Notes 在 `http://127.0.0.1:4173` 上运行正常。
- 一次性数据目录中包含标题为 `Quarterly plan`、正文包含 `Draft budget` 的笔记。
- `control-notes doctor` 返回预期的 URL 和数据目录。

- **工具栏入口。** 选择 `Search` 按钮。运行 `control-notes browser click --role button --name "Search"`。页面弹出名为 `Search notes` 的对话框，且焦点位于搜索框内。
- **快捷键入口。** 关闭对话框，将焦点移回页面，然后按 `/` 键。运行 `control-notes browser press --key "/"`。同一对话框弹出，且页面内未插入斜杠字符。
- **标题匹配。** 输入 `quarterly`。运行 `control-notes browser fill --role searchbox --name "Search notes" --value "quarterly"`。`Search results` 列表中包含 `Quarterly plan`，且不包含 `Grocery list`。
- **正文匹配。** 将查询词替换为 `budget`。运行 `control-notes browser fill --role searchbox --name "Search notes" --value "budget"`。结果中仍显示 `Quarterly plan`，并附带正文匹配摘要。
- **打开搜索结果。** 选择 `Quarterly plan`。运行 `control-notes browser click --role link --name "Quarterly plan"`。对话框关闭，编辑器标题显示为 `Quarterly plan`。
- **空结果状态。** 重新打开搜索并输入 `volcano`。运行 `control-notes browser fill --role searchbox --name "Search notes" --value "volcano"`。搜索完成后出现名为 `No matching notes` 的状态提示。
- **清空查询。** 选择 `Clear search`。运行 `control-notes browser click --role button --name "Clear search"`。搜索框清空，`Recent notes` 区域取代结果列表。
- **CLI 匹配。** 从终端执行搜索。运行 `control-notes cli -- notes search "quarterly" --format json`。退出码为 `0`，且 `stdout` 包含一个标题为 `Quarterly plan` 的对象。
- **CLI 未命中。** 搜索不存在的值。运行 `control-notes cli -- notes search "volcano" --format json`。退出码为 `0`，且 `stdout` 为 `[]`。
- **采集证据。** 采集填充了搜索结果的状态。运行 `control-notes browser snapshot --aria --path artifacts/search/results.aria.txt` 和 `control-notes browser screenshot --path artifacts/search/results.png`。两份证据产物均清晰体现 Notes 应用标识、查询词以及 `Quarterly plan`。

## Gotchas

- 当编辑器或搜索框持有焦点时按 `/` 键，会直接插入文本，而不会打开搜索框。
- 搜索结果有短暂防抖（debounce）延迟；应等待结果列表或空状态提示出现，切勿使用固定时长的 `sleep`。
- 除非用户勾选 `Include archived`，否则默认排除已归档笔记。
- CLI 默认输出人类可读格式；断言时请加上 `--format json` 以保证输出稳定。
- 打开搜索结果会改变浏览器状态；在验证下一个查询前需重新打开搜索对话框。
