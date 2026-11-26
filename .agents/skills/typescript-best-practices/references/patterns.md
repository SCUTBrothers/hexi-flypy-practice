# TypeScript 模式示例

本文给出 `SKILL.md` 中每条规则的代码示例。背后的核心设计原则与具体语言无关，详见 `principle-type-system-discipline` 与 `principle-boundary-discipline`。

## 品牌类型（Branded types）

为基础类型打上品牌标记，防止同为字符串或数字的不同业务标识被混用。在系统边界处校验一次，下游代码直接信任该类型。

```ts
type AgentId = string & { readonly __brand: 'AgentId' }

function isAgentId(input: string): input is AgentId {
  return isUUID(input)
}

function parseAgentId(input: string): AgentId {
  if (!isAgentId(input)) throw new Error(`Invalid agent id: ${input}`)
  return input
}

function focusAgent(id: AgentId): void {
  /* input is trusted */
}
```

统一使用 `readonly __brand: 'X'` 结构，不要自创其他命名约定。

## 可辨识联合类型（Discriminated unions）

用字面量判别字段对变体建模。所有变体共享同一个判别字段名，且每个变体的字面量取值唯一，从而让自相矛盾的状态组合根本无法被表示。

```ts
// Don't. Boolean + optionals lets contradictory states exist.
type DiffState = { loading: boolean; diff?: GitDiff; error?: string }

// Do. Only valid states exist.
type DiffState = { kind: 'loading' } | { kind: 'ready'; diff: GitDiff } | { kind: 'error'; error: string }
```

选定一个判别字段名（如 `kind`、`type` 或 `tag`）并在项目中保持一致。

## 构造式建模（Constructive modeling）

用组合起来必定合法的部件去构造类型，而不是先定一个宽泛类型再靠运行时检查去拦截非法值。

用可变长元组表示非空数组：

```ts
type NonEmpty<T> = [T, ...T[]]

// Don't: T[] plus a length check every caller must repeat
function pickWinner(entries: string[]): string {
  if (entries.length === 0) throw new Error('no entries')
  return entries[Math.floor(Math.random() * entries.length)]
}

// Do: an empty value of the type can't exist
function pickWinner(entries: NonEmpty<string>): string {
  return entries[Math.floor(Math.random() * entries.length)]
}
```

当外部传入普通 `T[]` 时，通过类型守卫收窄一次，此后“非空”这一事实便随类型一路传递：

```ts
const isNonEmpty = <T>(arr: T[]): arr is NonEmpty<T> => arr.length > 0
```

用成对元组表示偶数长度：

```ts
type Pairs<T> = [T, T][]
```

用起点加持续时长表示时间区间：

```ts
// Don't: a comment holds the invariant
type TimeRange = { start: Date; end: Date } // start <= end

// Do: a negative range can't be written; derive end when needed
type TimeRange = { start: Date; durationMs: number }
```

`durationMs` 保持为普通 `number` 即可。只有当普通数字确实可能被误传到需要持续时长的位置时，才按“品牌类型”规则为其加标记，切勿条件反射式地给所有数字加品牌。核心思路是：先选择让非法状态无法被构造出来的底层表示，再在其上封装所需的读取辅助方法（如 `pairs.flat()` 或 `rangeEnd()`）。

## 最简全定义类型（Simplest total type）

不要盲目收紧所有类型。只要某项操作对 `T[]` 的所有可能取值都有明确定义（即全函数），就保持 `T[]`：

```ts
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0) // [] is 0, fine
```

只有当宽泛类型迫使调用处向编译器撒谎时，才收紧输入类型。典型征兆包括非空断言 `!`、`arr[0] as T` 以及抛出“绝不该发生”的异常：

```ts
// Don't: partiality smuggled past the compiler
function newestSession(sessions: Session[]): Session {
  return sessions.at(0)!
}

// Do: strengthen the input; the assertion disappears
function newestSession(sessions: NonEmpty<Session>): Session {
  return sessions[0]
}
```

另一种保持全定义函数签名的做法是将返回类型放宽为 `Session | undefined`。

## `unknown` 优于 `any`

外部数据一律视为 `unknown`，必须先收窄类型再使用。

```ts
// Don't
function handle(input: any) {
  return input.foo.bar
}

// Do
function handle(input: unknown) {
  if (typeof input === 'object' && input !== null && 'foo' in input) {
    // narrowed; compiler verifies access
  }
}
```

外部数据源包括 RPC 载荷、`JSON.parse`、`postMessage`、IPC 消息、文件内容、环境变量和数据库查询结果。

## Schema 优先于手写守卫

在为外部数据逐个属性手写类型守卫之前，先检查仓库已有的运行时 schema 库与现成 schema。让同一个 schema 统一承担运行时校验与 TypeScript 类型推导，避免同时维护容易相互脱节的 schema、重复接口定义和手写守卫。

```ts
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['admin', 'member']),
})

type User = z.infer<typeof UserSchema>

function parseUser(input: unknown): User {
  return UserSchema.parse(input)
}
```

当解析失败属于预期内的正常业务分支时，使用 `safeParse`。若仓库使用的是其他 schema 库，请采用该库对应的类型推导工具。不要为了写一个守卫而特意引入新的 schema 库依赖——本规则提倡优先复用代码库已经信任的 schema 体系。

## 禁用 `as` 类型断言

每一个 `as` 都是潜在的运行时崩溃点。只有在类型系统已经证实该断言成立的前提下，才允许转换。

```ts
import { z } from 'zod'

// Don't
const user = data as User

// Don't
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data
}

// Do
const userSchema = z.object({ id: z.string(), name: z.string() })
type User = z.infer<typeof userSchema>

function parseUser(data: unknown): User {
  return userSchema.parse(data)
}
```

如果项目中是先有 TypeScript 类型、后写校验器，请用目标类型显式标注校验器。这样一旦校验器验证的字段少于类型要求，编译器就会立即报错。例如在下方代码中删掉 `name` 字段，赋值语句就会编译失败：

```ts
type User = { id: string; name: string }

const userSchema: z.ZodType<User> = z.object({ id: z.string(), name: z.string() })
```

在重构现有代码以消除 `as` 时，先查明 TypeScript 无法自动推导的根本原因：

- 缺少判别字段：补上判别字段，改为可辨识联合类型。
- 上游类型过于宽泛（如 `Record<string, unknown>`）：在上游收窄类型。
- 无类型边界：用定义该数据结构的 schema 进行解析；仅在尚无 schema 时新建。
- 类型系统确实无法直接表达：改用品牌类型或 `satisfies`。

## 类型收窄优先级

按推荐程度从高到低排列：

1. **可辨识联合类型的 `switch` / `if`。** 编译器可自动收窄。
2. **`in` 运算符。** `"key" in obj` 可收窄至包含该属性键的变体。
3. **`typeof` / `instanceof`。** 适用于基础类型与类实例。
4. **自定义类型守卫。** 当上述内置手段不够用时使用。
5. **`as` 类型断言。** 万不得已时，仅在完成校验后使用。

```ts
function area(s: Shape): number {
  if ('radius' in s) return Math.PI * s.radius ** 2 // narrowed to circle
  return s.width * s.height // narrowed to rect
}
```

## 类型守卫（Type guards）

类型守卫必须真正校验它所声称的类型条件。撒谎的类型守卫比直接写 `as` 危害更大。

```ts
function isCircle(s: Shape): s is Shape & { kind: 'circle' } {
  return s.kind === 'circle'
}
```

能用判别字段直接收窄时，优先使用判别字段收窄。

## 穷尽性检查（Exhaustiveness）

在 `default` 分支中，将受判别的联合类型变量赋给一个 `never` 类型的局部变量。

```ts
// Value-returning switch
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':
      return Math.PI * s.radius ** 2
    case 'rect':
      return s.width * s.height
    default: {
      const _exhaustive: never = s
      return _exhaustive
    }
  }
}

// Void switch
function handle(s: Shape): void {
  switch (s.kind) {
    case 'circle':
      drawCircle(s)
      break
    case 'rect':
      drawRect(s)
      break
    default: {
      const _exhaustive: never = s
      void _exhaustive
    }
  }
}
```

有返回值的 `switch` 使用 `return _exhaustive`，仅执行副作用的 `switch` 使用 `void _exhaustive`。

## `satisfies` 优于 `as`

`satisfies` 既能验证值是否符合目标类型，又能保留具体的字面量类型而不将其拓宽。

```ts
// Don't. Widens, loses literal types.
const config = { theme: 'dark', cols: 3 } as Config

// Do. Validates AND preserves literal types.
const config = { theme: 'dark', cols: 3 } satisfies Config
// config.theme is "dark" (literal), not string
```

## 边界校验（Boundary validation）

在数据跨越边界进入系统时校验一次，系统内部直接信任类型。详见 `principle-boundary-discipline`。

- **传输格式**（如 Protobuf、JSON-RPC）：解析时开启 `ignoreUnknownFields`，避免向后兼容的新增字段导致旧客户端报错。
- **持久化 JSON**：为数据块加上版本号，并在解析外层包裹 `try/catch`。
- **切勿在调用链深处重复校验。**

## 从 Schema 派生类型

当 `.proto`、OpenAPI 规格、GraphQL schema 或数据库迁移文件已经定义了数据结构时，直接从生成的类型派生，切勿手动重复定义一套结构体。

```ts
// Don't. Duplicate shape, drifts when the schema changes.
type CheckSummary = {
  totalCount: number
  checks: { name: string; status: string }[]
}
function renderChecks(s: CheckSummary) {
  /* ... */
}

// Do. Derive from the generated schema type.
import type { ChecksMessage } from '<generated module>'
function renderChecks(s: Pick<ChecksMessage, 'totalCount' | 'checks'>) {
  /* ... */
}
```

动手写新 `interface` 之前，先考虑能否用 `Pick`、`Omit`、`Parameters`、`ReturnType`、`Awaited` 或 `typeof` 派生。

## 对象参数（Object args）

```ts
// Don't. Swap two args, still compiles.
openFile(uri, {
  startLineNumber: 10,
  startColumn: 1,
  endLineNumber: 10,
  endColumn: 1,
})

// Do. Order-independent, self-documenting.
openFile({
  uri,
  selection: {
    startLineNumber: 10,
    startColumn: 1,
    endLineNumber: 10,
    endColumn: 1,
  },
})
```

性能热路径除外：逐帧渲染、分词器、解析器，或任何处于紧密循环中、对象分配开销不可忽略的代码。
