# 模型配置与 CLI 命令参考（pi）

本文档维护 `dispatch` 当前绑定的 Provider 特性、各模型档位画像（能力强度、弱点与适用边界）、加速参数及经本机 `pi` CLI 实测的调用模板。后续切换或增补其他 Provider 与模型时，只需更新本文件，无需改动 `SKILL.md` 正文。

## Provider 特性：`openai-codex`

当前默认通过本机 `pi` CLI 调度 `openai-codex` 下的三档模型。该系列模型具备鲜明的共性特征：

- **共性强项**：逻辑推理紧致、代码实现严谨、对边界条件/类型/竞态敏感；给定清晰 Spec 与验证命令后，「指哪打哪」的落地和自测稳定性高；非常适合充当后端/核心逻辑执行器与冷酷审稿人。
- **共性弱点**：
  - **UI 与视觉设计偏弱**：审美与交互直觉不足，前端容易堆砌多余视觉装饰或布局僵硬。
  - **人类向文案偏公文**：直接面向人写解释、文档或交互文案时容易冗长生硬、不易阅读。
  - **模糊需求下易停顿**：规格边界没写死时，容易中途停下向人请示确认，或按保守假设跑偏。
- **拆单原则**：面对一组综合任务时，**主控自己保留需求梳理、UI/交互设计、文案与对人沟通**，只把「目标明确、规则清晰、可跑命令验证」的子任务整理成 Spec 派给 `openai-codex`，回收 diff 验收后再由主控转述交付。

## 模型档位画像与选型

| 档位           | 模型标识（`provider/model:thinking`） | 能力强度与上下文         | 明显弱点                                                | 最推荐场景                                                                                   | 不推荐场景                                                       | 默认速度参数                     |
| -------------- | ------------------------------------- | ------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| 轻量档         | `openai-codex/gpt-6-luna:medium`      | 轻快稳健 · 272K 上下文   | 跨模块长链条推理与深层并发分析深度有限；UI/文案弱       | 规格已细化的局部小改、单模块快速只读核查、补常规单测、一次性小脚本                           | 跨多模块复杂重构、隐蔽并发或疑难排障、架构决策、UI 与文案        | `--fast`（极速时 `--ultrafast`） |
| 主力档（默认） | `openai-codex/gpt-6.2-sol:xhigh`      | 均衡强悍 · 500K 大上下文 | UI 设计与审美弱、文案偏公文；缺明确约束易中途停顿       | 主控定好方案后的后端/核心逻辑实现、多任务中拆出的工程子任务、常规 Code Review、常见 Bug 排查 | UI 视觉与布局设计、面向人类的文案/文档写作、模糊需求的开放式讨论 | `--fast`                         |
| 攻坚档         | `openai-codex/gpt-6.2-astra:xhigh`    | 极深推理 · 272K 上下文   | 耗时更长、额度消耗更高；上下文小于 `6.2-sol`；UI/文案弱 | `6.2-sol` 搞不定的疑难 Bug、高风险改动合并前的对抗式深审、复杂并发/状态机/算法攻坚           | 简单小改与常规 CRUD（杀鸡用牛刀）、超大上下文全仓泛读、UI 与文案 | `--fast`                         |

### 典型拆单示例

例如开发一个「带前端配置页与后端流式导出」的完整需求：

- **留在当前主控会话做**：与用户澄清需求、设计页面布局与交互流程、编写前端组件与界面提示文案、最终汇总人话说明。
- **拆出 Spec 派给 `openai-codex/gpt-6.2-sol:xhigh`**：实现后端流式导出器、处理引号/换行/零值等边界、补齐回归测试并自跑通过。
- **合并前按需再派只读审查**：常规改动用 `gpt-6.2-sol:xhigh`；涉及并发写入、事务一致性或资金/权限等高风险逻辑，升档用 `gpt-6.2-astra:xhigh` 做对抗式深审。

### 速度参数与扩展策略

- 依赖本机已安装的 `pi-codex-fast` 扩展，支持 `--fast`（默认开启）、`--ultrafast`（极速小任务按需选用）与 `--no-fast`（需要关闭加速时显式指定）。
- 调用 `pi` 时**不要**加 `--no-extensions` 或一刀切关闭 MCP，以免把 `pi-codex-fast` 等常用无害扩展一并禁掉。
- 若需临时改用其他已配置的 Provider（如 Anthropic、Gemini 或本地模型），先运行 `pi --list-models <关键词>` 查准完整 `provider/model`，再按同样格式替换 `--model` 即可。

## 1. 就绪核验（不泄露凭据）

首次调度或怀疑登录态过期时，先检查模型与凭据状态（严禁传入 `--credentials` 或调用 `print-api-key`）：

```sh
pi --list-models openai-codex
pi auth check --model openai-codex/gpt-6.2-sol
```

返回码 `0`（`ready`）表示就绪；`1` / `2` 时停止派单并提醒用户重新登录或检查配置。

## 2. 只读审查 / 第二意见

通过 `--tools read,grep,find,ls` 限制内置文件写入工具，配合 `--no-session` 不留会话垃圾：

```sh
TASK_DIR="${TMPDIR:-/tmp}/dispatch-review-$(date +%s)"
mkdir -p "$TASK_DIR"
# 先将审查目标、关注点与参考范围写入 "$TASK_DIR/brief.md"

pi -p --no-session --fast \
  --model "openai-codex/gpt-6.2-sol:xhigh" \
  --tools read,grep,find,ls \
  --append-system-prompt "你担任只读第二意见审查者。只报告基于真实源码核实的问题，每条给出 file:line、触发条件、实际后果与最小修正方向；禁止风格挑刺、禁止长篇公文、禁止客套。" \
  "@$TASK_DIR/brief.md"
```

高风险并发、安全或架构深审时，将 `--model` 切换为 `openai-codex/gpt-6.2-astra:xhigh`。

## 3. 按 Spec 委派实现与多轮返工

首次派单使用唯一 `--session-id` 持久化会话，排除 `ask_question` 避免外部进程挂起等待输入：

```sh
SESSION_DIR="${TMPDIR:-/tmp}/dispatch-sessions"
SESSION_ID="task-$(date +%Y%m%d-%H%M%S)"
SPEC_FILE="${TMPDIR:-/tmp}/dispatch-${SESSION_ID}.md"
mkdir -p "$SESSION_DIR"
# 先将含五要素的可执行规格写入 "$SPEC_FILE"

pi -p --fast \
  --model "openai-codex/gpt-6.2-sol:xhigh" \
  --session-dir "$SESSION_DIR" \
  --session-id "$SESSION_ID" \
  --exclude-tools ask_question \
  --append-system-prompt "按规格一次性自主完成实现并运行验证命令，不要中途停下询问；仅遇无法绕过的规格硬矛盾时停止并汇报矛盾点。严禁修改允许围栏之外的文件，严禁 git commit 或 git push。完成后只输出：改动文件清单、验证命令与结果、遗留风险，禁止长篇公文。" \
  "@$SPEC_FILE"
```

主控核对 `git diff` 并复跑检查后，如需返工，复用**同一组 `--session-dir` 与 `--session-id`** 精准续接上下文：

```sh
pi -p --fast \
  --model "openai-codex/gpt-6.2-sol:xhigh" \
  --session-dir "$SESSION_DIR" \
  --session-id "$SESSION_ID" \
  --exclude-tools ask_question \
  "验收发现 src/foo.ts:88 未处理空数组边界。请仅修复该处并重新运行 npm test，简要回报改动与测试输出。"
```

如需精确统计输出事件或 token 用量，可在上述命令中追加 `--mode json`。

## 4. 应急备用引擎（可选）

若 `pi` 侧 OAuth 临时限流或认证异常且任务急需继续，可将同一份 `$SPEC_FILE` 切至本机 `codex exec`（例如 `codex exec -m gpt-6.2-sol --sandbox workspace-write - < "$SPEC_FILE"`，只读审查用 `--sandbox read-only`），验收与对人交付流程完全一致。
