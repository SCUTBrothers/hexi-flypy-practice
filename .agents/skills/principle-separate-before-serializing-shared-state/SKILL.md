---
name: principle-separate-before-serializing-shared-state
description: '多个并发参与者可能写入同一文件、分支、键或状态对象时使用。优先消除共享；只有当共享单一写入目标确属不变量时，才通过结构化机制串行化访问。'
disable-model-invocation: true
---

# 先消除共享，再串行化状态（principle-separate-before-serializing-shared-state）

当多个并发参与者（actor）可能写入同一个文件、分支、键或对象时，先追问它们究竟是真的需要共享同一个对象，还是各自在发布独立的事实。默认给每个参与者分配各自独立的文件、键、分支或状态目录，仅在读取状态处做合并。两个工作节点各自往同一个 `state.json` 里写自己的字段，本质上仍是共享可变状态。

只有当单一共享写入目标确属真实不变量时，才通过结构化机制串行化访问（锁文件、单写入者、串行阶段、原子 CAS）。提示词指令不是并发控制，而“这里需要加把锁”则是应当率先审视的设计异味。
