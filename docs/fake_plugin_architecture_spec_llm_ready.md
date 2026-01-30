# Zyma 声明式扩展架构规范 (Native Feature Extension)

> 本文档定义了 Zyma 底座（Open Source）与 行业扩展（如 ShovX Pro，Closed Source）之间的原生对接协议。
> 
> 目标：实现 **“底座做基建，扩展做智力”** 的零耦合、高性能集成。

---

## 1. 核心设计思想：声明式全案 (Declarative Feature)

> **扩展不再是零散的命令，而是一个自我完备的“功能全案”。**

- **基座 (Host)**: Zyma 提供 UI 渲染容器、文件系统、LLM 管道和插件生命周期管理。
- **扩展 (Extension)**: 行业套件（如 ShovX）通过实现 `ZymaExtension` Trait，一键注入自己的命令、原生插件及 UI 参与者。

---

## 2. 总体架构

```text
┌──────────────────────────────────┐
│         Zyma 底座 (Host)          │
│  - 窗口管理 / Tab 系统            │
│  - 文件 IO / Watcher             │
│  - LLM 高性能通道                │
│  - ZymaBuilder (扩展编排器)       │
└────────────────┬─────────────────┘
                 │ 实现 ZymaExtension
┌────────────────┴─────────────────┐
│       行业扩展 (Extension)        │
│  - 业务逻辑 (如 Quant Engine)     │
│  - 专有命令 (Tauri Commands)      │
│  - UI 贡献 (Native Chat API)      │
└──────────────────────────────────┘
```

---

## 3. 核心协议定义 (Rust)

### 3.1 扩展接口 `ZymaExtension`

```rust
pub trait ZymaExtension: Send + Sync {
    /// 扩展唯一标识
    fn id(&self) -> &'static str;
    
    /// 配置生命周期：允许扩展修改 Tauri Builder
    /// 用于注册命令 (invoke_handler)、注入插件 (plugin) 等
    fn setup(&self, builder: tauri::Builder<Wry>) -> tauri::Builder<Wry>;
    
    /// UI 贡献：声明该扩展在前端 UI 中展示的 AI 助手
    fn chat_participants(&self) -> Vec<NativeChatParticipant> { vec![] }
}
```

### 3.2 UI 贡献结构 `NativeChatParticipant`

```rust
pub struct NativeChatParticipant {
    pub id: String,          // UI 唯一标识
    pub name: String,        // 简称
    pub full_name: String,   // 全称
    pub description: String, // 描述
    pub command: String,     // 关联的 Rust 命令名
}
```

---

## 4. 宿主集成方式 (ZymaBuilder)

底座通过 `ZymaBuilder` 自动遍历并合并所有扩展的贡献，实现“零胶水”启动。

```rust
// main.rs 入口示例
fn main() {
    ZymaBuilder::new()
        .add_extension(ShovXFeature::new()) // 注入专业版特性
        .add_extension(DataVisualization::new())
        .run(tauri::generate_context!());
}
```

---

## 5. 扩展实现规范 (以 ShovX 为例)

### 5.1 逻辑封装
扩展实现应保持纯净，不直接修改底座源代码。

```rust
struct ShovXFeature;

impl ZymaExtension for ShovXFeature {
    fn id(&self) -> &'static str { "shovx.pro" }

    fn setup(&self, builder: tauri::Builder<Wry>) -> tauri::Builder<Wry> {
        builder.invoke_handler(tauri::generate_handler![shovx_chat, shovx_login])
               .plugin(tauri_plugin_http::init())
    }

    fn chat_participants(&self) -> Vec<NativeChatParticipant> {
        vec![NativeChatParticipant {
            id: "shovx-pro-assistant".into(),
            command: "shovx_chat".into(),
            // ...其他元数据
        }]
    }
}
```

---

## 6. 前端发现机制

底座前端在初始化时会自动同步后端注册的 `NativeChatParticipant`，并利用通用桥接逻辑与后端命令通信。

1. **同步**: `invoke('get_native_extensions')`
2. **桥接**: 自动将 UI 事件转发至 `NativeChatParticipant.command` 指向的 Rust 函数。

---

## 7. 架构优势

- **极致隔离**: `shovx` 与 `zyma` 在物理目录、代码逻辑、Git 仓库层面均可实现完全解耦。
- **原生性能**: 所有扩展逻辑均以原生 Rust 速度运行，无协议转换损耗。
- **动态 UI**: 仅通过 Rust 代码即可控制前端 UI 的显示与功能注册，无需编写 JS 胶水层。

---

## 8. LLM 指令说明

> 当为 Zyma 生成扩展功能时，请遵循以下准则：

1. **实现 Trait**: 始终通过实现 `ZymaExtension` 来封装功能。
2. **命令隔离**: 所有的商业逻辑命令应定义在扩展 Crate 中，并通过 `setup` 注入。
3. **数据驱动 UI**: 利用 `chat_participants` 方法向底座申请 UI 位置。

---

（文档结束）
