# Fake Plugin（假插件）系统需求说明（LLM 友好版）

> 本文档用于指导 **立即开始开发** 一个基于 **Tauri + Rust** 的“假插件（编译期插件）”系统。
> 
> 目标读者：
> - LLM（用于代码生成）
> - 具备 Rust / Tauri 基础的工程师

---

## 1. 项目背景与目标

### 1.1 背景

- 编辑器本体为 **开源项目**
- 核心能力（如 Agent、AI、Quant Engine）需要 **闭源**
- 插件目的不是第三方生态，而是：
  - 管理复杂功能
  - 隔离模块
  - 支持商业能力扩展

### 1.2 设计目标（必须满足）

- 不使用动态库（`.dll/.so`）
- 不使用 WASM
- 插件作者仅为官方（自己）
- Rust 插件具备 **原生性能**
- JS 插件只负责 UI / 编排，不执行重逻辑

### 1.3 核心结论

> 所谓“插件”，本质是 **通过稳定接口注册的能力模块（Capability）**，
> 并在 **构建期** 选择是否包含进最终产物。

---

## 2. 总体架构

```text
┌──────────────────────────────┐
│        Open Source           │
│        Editor Core           │
│  - UI / JS Plugin Manager    │
│  - Capability Registry       │
│  - Command / Invoke Layer    │
└──────────────▲───────────────┘
               │ invoke by id
┌──────────────┴───────────────┐
│        Closed Source         │
│      Capability Crates       │
│  - Agent Runtime             │
│  - AI / Quant Engines        │
└──────────────────────────────┘
```

---

## 3. Workspace 与模块划分（强制）

### 3.1 Cargo Workspace 结构

```text
workspace/
 ├─ crates/
 │   ├─ plugin-api/        # 开源（稳定接口）
 │   ├─ editor-core/       # 开源（宿主）
 │   ├─ editor-tauri/      # 开源（App）
 │   └─ agent-pro/         # 闭源（假插件）
```

### 3.2 模块职责

| 模块 | 是否开源 | 职责 |
|----|----|----|
| plugin-api | 是 | 插件接口定义（trait / DTO） |
| editor-core | 是 | 插件注册表、命令路由 |
| editor-tauri | 是 | JS ↔ Rust 通信 |
| agent-pro | 否 | 高性能 Agent 实现 |

---

## 4. Plugin API（LLM 生成代码的核心依据）

### 4.1 Capability Trait（必须实现）

```rust
pub trait Capability: Send + Sync {
    fn id(&self) -> &'static str;
    fn invoke(&self, input: serde_json::Value) -> anyhow::Result<serde_json::Value>;
}
```

约束：
- 不允许暴露内部状态引用
- 所有输入输出必须可序列化

---

## 5. Capability Registry（宿主实现）

### 5.1 Registry 定义

```rust
pub struct CapabilityRegistry {
    map: HashMap<String, Box<dyn Capability>>,
}
```

### 5.2 行为规范

- Capability **只能由宿主注册**
- 插件不能主动修改 Registry
- 重复 id 注册视为错误

---

## 6. 闭源插件（假插件）的实现规范

### 6.1 插件 crate 规则

- 只依赖 `plugin-api`
- 不依赖 `editor-core`
- 不包含任何 Tauri / JS 代码

### 6.2 示例

```rust
pub struct AgentPro;

impl Capability for AgentPro {
    fn id(&self) -> &'static str {
        "agent.pro"
    }

    fn invoke(&self, input: Value) -> Result<Value> {
        // Agent logic
    }
}
```

---

## 7. 构建期注入机制（关键）

### 7.1 Cargo Feature 控制

```toml
[features]
pro = ["agent-pro"]
```

### 7.2 注册逻辑

```rust
pub fn register_all(reg: &mut CapabilityRegistry) {
    #[cfg(feature = "pro")]
    reg.register(Box::new(agent_pro::AgentPro));
}
```

> 若未开启 feature，则插件在二进制中完全不存在。

---

## 8. JS 插件系统的角色（非执行）

### 8.1 JS 插件职责

- UI 面板
- 菜单 / 快捷键
- Workflow 描述

### 8.2 调用方式

```ts
invoke("capability.invoke", {
  id: "agent.pro",
  payload
})
```

---

## 9. License / 商业控制（可选）

### 9.1 启用前校验

```rust
if !license::has("agent.pro") {
    return Err(anyhow!("license required"));
}
```

---

## 10. 非目标（明确禁止）

- ❌ 运行期加载 `.dll/.so`
- ❌ 插件访问 editor-core 内部结构
- ❌ 插件直接操作 UI
- ❌ 插件之间互相调用

---

## 11. LLM 执行指令（Prompt Hint）

> 请严格遵守以下规则生成代码：

- 仅通过 `plugin-api` 与插件交互
- 不引入动态加载
- 所有 Capability 通过 Registry 调度
- 插件实现必须是纯 Rust 逻辑

---

## 12. 最终设计原则（一句话）

> **插件不是扩展编辑器，
> 而是向编辑器提供能力。**

---

（文档结束）