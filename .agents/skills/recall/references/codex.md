# Codex 会话历史检索指南

Codex 按日期目录集中存放所有项目的会话文件，**未按项目分目录**。因此检索时必须先按 `cwd` 严格过滤，绝不读取其他无关工作区的私人会话内容。

## 1. 存储位置与工作区隔离

```text
~/.codex/sessions/YYYY/MM/DD/*.jsonl
```

每个 `.jsonl` 首行（或前几行）的 `session_meta` 记录了会话归属的工作目录与会话 ID：

```json
{
  "type": "session_meta",
  "payload": {
    "id": "<uuid>",
    "timestamp": "...",
    "cwd": "/path/to/project"
  }
}
```

## 2. 候选会话筛选与排序

1. **先锁定日期目录与工作区**：只扫描时间窗口覆盖的 `YYYY/MM/DD` 目录（例如最近 7 天），先用 `rg -l` 筛出 `session_meta` 中 `cwd` 等于当前工作区（或其子目录）的文件：

   ```sh
   find ~/.codex/sessions -name "*.jsonl" -mtime -7 -print0 \
     | xargs -0 rg -l "\"cwd\":\"$PWD(/|\")"
   ```

2. 对筛出的本工作区会话文件按**真实修改时间**排序（`ls -t`），再按主题关键词（若有）用 `rg -l` 二次过滤，跳过当前会话。

## 3. 高信号条目提取（跳过工具输出噪音）

检索常规进展与决策时，只提取元数据与用户/助手消息正文，跳过 `function_call_output`、`custom_tool_call_output`、推理块以及系统注入的 `<environment_context>` 块：

- `type == "session_meta"`：读取 `payload.id`、`payload.cwd`、`payload.timestamp`。
- `type == "response_item"` 且 `payload.type == "message"`：读取 `payload.role`（`"user"` 或 `"assistant"`）下 `payload.content[]` 中的 `input_text` / `output_text` / `text` 文本（忽略以 `<environment_context>` 开头的环境注入消息）。
- 若文件使用事件流条目（`type == "event_msg"`）：可读取 `payload.type` 为 `"user_message"` 或 `"agent_message"` 的 `payload.message`（注意避免与同一轮的 `response_item` 重复统计）。

快速提取单文件对话骨架示例（需装有 `jq`）：

```sh
jq -c '
  if .type == "session_meta" then {id: .payload.id, cwd: .payload.cwd, timestamp: .payload.timestamp}
  elif .type == "response_item" and .payload.type == "message" and (.payload.role == "user" or .payload.role == "assistant") then
    ([.payload.content[]? | select(.type == "input_text" or .type == "output_text" or .type == "text") | .text] | join("\n")) as $txt
    | if ($txt | length) > 0 and ($txt | startswith("<environment_context>") | not)
      then {role: .payload.role, text: $txt}
      else empty end
  else empty end
' "<rollout.jsonl>"
```

仅当需要核对某次具体工具调用参数或报错输出时，才定向检索该文件中的 `function_call` / `function_call_output` 条目。
