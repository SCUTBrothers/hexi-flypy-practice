---
name: principle-type-system-discipline
description: '设计类型、评审函数签名或编写任何静态类型语言代码时使用。让非法状态无法表示，为具备业务语义的基础类型打上品牌标记，在系统边界解析外部数据，穷尽联合变体，并从权威 schema 派生类型。'
disable-model-invocation: true
---

# 类型系统纪律（principle-type-system-discipline）

让编译器直接拒绝不可能存在的状态、张冠李戴的基础类型以及未处理的分支变体。

- **为具备业务语义的基础类型打上品牌标记（brand）。** 如果两个参数共享同一种基础类型但含义不同，应为它们各自赋予独立类型。在创建时校验一次即可。
- **外部数据在解析前一律视为无类型（untyped）。** JSON、RPC 载荷、CLI 参数、配置、环境变量与数据库行，都必须在系统边界处经过解析函数转换为强类型模型。
- **从权威 schema 派生类型。** 当数据结构由某份 schema 文件定义时，应直接从中派生代码类型，切勿手工维护一套平行的重复定义。

关于 TypeScript 的具体语法，参见 `typescript-best-practices` 技能。
