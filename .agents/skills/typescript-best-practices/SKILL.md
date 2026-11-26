---
name: typescript-best-practices
description: 'TypeScript 最佳实践。阅读或修改任何 .ts 或 .tsx 文件时使用。'
paths: ['**/*.ts', '**/*.tsx']
---

# TypeScript 最佳实践（typescript-best-practices）

优先遵循 `principle-type-system-discipline` 与 `principle-boundary-discipline` 原则技能。

| 规则                      | 要点                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 可辨识联合类型            | 用 `kind` 等字面量判别字段对变体建模，让非法状态无法表示。禁用一堆可选字段拼凑的宽泛对象。                                                                          |
| 品牌类型（Branded types） | 用 `& { readonly __brand: 'X' }` 标记同基础类型的不同语义值，防止混用。在边界校验一次；品牌标记必须来自真实校验的类型守卫（`input is AgentId`），绝不用 `as` 伪造。 |
| 构造式建模                | 用组合起来必定合法的结构消除非法值：`[T, ...T[]]` 表示非空，`[T, T][]` 表示偶数长度，`start` 加 `duration` 表示区间，而非依赖运行时防御检查。                       |
| 最简全定义类型            | 只要各项操作对 `T[]` 的所有取值都有定义（全函数），就保留 `T[]`；仅当宽泛类型迫使代码写 `!`、强转或抛出“绝不该发生”异常时，才收紧为 `NonEmpty<T>`。                 |
| `unknown` 优于 `any`      | 外部数据一律视为 `unknown`。                                                                                                                                        |
| Schema 优先于手写守卫     | 逐属性手写类型守卫前，优先使用仓库已有的运行时 schema 库并从中推导类型（如 `z.infer`）。                                                                            |
| 禁用 `as` 类型断言        | 每一个 `as` 都是潜在的运行时崩溃点；仅在完成真实校验后才允许转换。                                                                                                  |
| 类型收窄优先级            | 判别字段 `switch` > `in` 运算符 > `typeof`/`instanceof` > 自定义类型守卫 > `as`。                                                                                   |
| 类型守卫                  | 必须真实校验所声称的条件；撒谎的守卫比 `as` 更危险，因为缺陷藏在了看似安全的函数名后面。命名为 `isX` 或 `hasX`。                                                    |
| 穷尽性检查                | 在 `default` 分支内联 `const _exhaustive: never = x`，让新增变体在编译期立即报错。                                                                                  |
| `satisfies` 优于 `as`     | 校验值符合目标类型的同时保留具体字面量类型，不将其拓宽。                                                                                                            |
| 边界校验                  | 在数据跨越边界进入系统处一次性解析为具名领域类型，`Record<string, unknown>` 止步于此；内部直接信任类型（遵循 `principle-boundary-discipline`）。                    |
| 从权威结构派生类型        | 声明新 `interface` 前，先考虑能否从已有 schema 或用 `Pick`/`Omit`/`Parameters`/`ReturnType`/`Awaited`/`typeof` 派生。                                               |
| 对象参数                  | 传对象而非位置参数，使参数含义自解释且与顺序无关；性能热路径除外（逐帧渲染、分词器、解析器）。                                                                      |
| 真实测试                  | 能直接运行的依赖就不 mock；优先使用框架真实测试原语并检查泄漏与资源释放，仅 mock 本地无法运行的外部依赖。                                                           |
| 结构化可观测日志          | 优先使用带足够上下文（可凭 ID 定位问题）的结构化日志；交付代码中不留 `console.log`。                                                                                |

代码示例见 [references/patterns.md](./references/patterns.md)。
