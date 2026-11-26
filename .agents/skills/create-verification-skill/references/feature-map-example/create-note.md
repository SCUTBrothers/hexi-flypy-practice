# 创建笔记

创建笔记功能支持用户通过浏览器或 CLI 保存带标题的笔记、取消未完成的草稿，并从第二个面向用户的视图确认已保存的笔记。

## Sub-features

- `create-open`：从各个浏览器入口点打开空白编辑器。
- `create-save`：持久化保存标题和正文。
- `create-cancel`：丢弃浏览器中未完成的草稿。
- `create-cli`：从终端创建相同结构的笔记。

## How to get to it (user POV)

- 点击浏览器工具栏中的 `New note` 按钮。
- 当焦点不在可编辑字段内时，在浏览器中按 `n` 键。
- 在终端运行 `notes create --title <title> --body <body>`。

## Driving it with control-notes

Preconditions:

- Notes 在 `http://127.0.0.1:4173` 上运行正常。
- 当前不存在标题为 `Release checklist` 的笔记。
- `control-notes doctor` 返回预期的 URL 和一次性数据目录。

- **打开编辑器。** 选择 `New note`。运行 `control-notes browser click --role button --name "New note"`。页面出现名为 `Note editor` 的表单，且焦点位于 `Title` 文本框内。
- **输入内容。** 输入标题和正文。运行 `control-notes browser fill --role textbox --name "Title" --value "Release checklist"` 和 `control-notes browser fill --role textbox --name "Body" --value "Tag and publish"`。`Save note` 按钮变为可用状态。
- **保存笔记。** 选择 `Save note`。运行 `control-notes browser click --role button --name "Save note"`。页面出现名为 `Note saved` 的状态提示，且标题显示为 `Release checklist`。
- **确认持久化。** 返回笔记列表并重新打开该笔记。运行 `control-notes browser click --role link --name "All notes"` 和 `control-notes browser click --role link --name "Release checklist"`。编辑器中均显示刚才保存的标题与正文。
- **取消草稿。** 新建一篇笔记，输入 `Discard me`，然后选择 `Cancel`。运行 `control-notes browser click --role button --name "New note"`、`control-notes browser fill --role textbox --name "Title" --value "Discard me"` 和 `control-notes browser click --role button --name "Cancel"`。页面返回笔记列表，且列表中不存在 `Discard me` 链接。
- **CLI 入口。** 创建第二篇笔记。运行 `control-notes cli -- notes create --title "CLI note" --body "Created from terminal" --format json`。退出码为 `0`，且 `stdout` 包含新笔记的 ID 和标题。
- **采集证据。** 从 `All notes` 重新查看已保存的两篇笔记。运行 `control-notes browser snapshot --aria --path artifacts/create-note/list.aria.txt` 和 `control-notes browser screenshot --path artifacts/create-note/list.png`。生成的证据产物中同时显示 `Release checklist` 和 `CLI note`。

## Gotchas

- 当文本框持有焦点时按 `n` 键，会直接输入字符，而不会打开新建编辑器。
- 保存时会自动去除标题首尾空白；应断言渲染后的标题，而非草稿输入值。
- 仅凭保存状态提示不足以作为证据，必须从列表中重新打开笔记核实。
- 在清理测试数据时移除 `Release checklist` 和 `CLI note`，但保留对应的验证证据产物。
