# Pi 会话历史检索指南

仅在检索目标工作区（默认 `$PWD`）的本地会话时读取对应目录；未经用户明确要求，切勿读取其他项目目录。

## 1. 存储位置与工作区映射

Pi 按工作目录分文件夹存储树状 JSONL 会话：

```text
~/.pi/agent/sessions/--<slug>--/<timestamp>_<uuid>.jsonl
```

- `<slug>` 是工作目录绝对路径去掉开头的 `/` 后将 `/`（及 `.`）替换为 `-` 的结果；也可直接核对每个 `.jsonl` 首行 `SessionHeader` 中的精确 `cwd` 字段：

  ```json
  { "type": "session", "version": 3, "id": "<uuid>", "timestamp": "...", "cwd": "/path/to/project" }
  ```

- 若文件头含 `"parentSession"`，说明该会话由 `/fork` 或 `/clone` 分支而来。

## 2. 候选会话排序与筛选

1. 定位匹配当前工作区 `cwd` 的会话子目录（若用户在仓库子目录启动过会话，前缀相同的子目录一并纳入）。
2. 按文件**真实修改时间**降序排列（`ls -t`），结合时间窗口过滤（如最近 7 天用 `find <dir> -name "*.jsonl" -mtime -7`），绝不按文件名或 UUID 字典序盲排。
3. 指定了主题关键词时，先用 `rg -l "<关键词>"` 缩小候选文件集合，跳过当前正在运行的会话。

## 3. 高信号条目提取（避免工具输出撑爆上下文）

每行是一个带 `type` 的 JSON 对象。检索常规决策与进展时，**只提取以下高信号条目**，跳过 `role == "toolResult"`、`thinking` 块与 Base64 `image` 数据：

- `type == "session"`：获取会话 `id`、`cwd`、`parentSession`。
- `type == "session_info"`：获取用户设置的会话标题 `name`（若有）。
- `type == "compaction"` / `type == "branch_summary"`：直接读取 `summary`（及 `details.modifiedFiles`）——这里现成浓缩了早期讨论与被放弃分支的试错结论。
- `type == "message"` 且 `message.role` 为 `"user"` 或 `"assistant"`：只读取 `content`（字符串，或数组中 `type == "text"` 的 `text` 字段）。

快速提取单文件对话与摘要骨架示例（需装有 `jq`）：

```sh
jq -c '
  if .type == "session" then {type, id, cwd, parentSession}
  elif .type == "session_info" then {type, name}
  elif .type == "compaction" or .type == "branch_summary" then {type, timestamp, summary}
  elif .type == "message" and (.message.role == "user" or .message.role == "assistant") then
    {
      role: .message.role,
      timestamp,
      text: (
        if (.message.content | type) == "string" then .message.content
        else ([.message.content[]? | select(.type == "text") | .text] | join("\n"))
        end
      )
    }
  else empty end
' "<session.jsonl>"
```

仅当结论取决于当时具体运行了什么命令或报了什么错时，才回查该会话中的 `toolCall`、`toolResult` 或 `bashExecution` 条目。
