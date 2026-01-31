# Zyma 核心架构参考手册 (v2.1)

> **修订日期**：2026年1月31日
> **适用版本**：Zyma 底座重构版及 Zyma Pro

## 1. 架构概览：服务化与解耦

Zyma 采用 **SOA (Service-Oriented Architecture)** 架构。所有的运行时状态不再集中于单体对象，而是拆分为独立的、可注入的微服务。

### 核心服务清单 (Rust 侧)

| 服务名称 | 注入类型 | 职责 |
| :--- | :--- | :--- |
| **WorkspaceService** | `State<WorkspaceService>` | 封装了 VFS，负责全异步文件操作。 |
| **EventBus** | `State<EventBus>` | 后端内部事件总线，支持多生产者多消费者。 |
| **PluginService** | `State<PluginService>` | 管理插件路径及原生扩展（Chat/Auth）。 |
| **LLMManager** | `State<LLMManager>` | 统一管理大模型流式请求。 |
| **WatcherState** | `State<WatcherState>` | 高效的文件系统监听服务（基于闭包模式）。 |

---

## 2. 全异步虚拟文件系统 (VFS)

Zyma 不再直接调用 `std::fs`。所有文件操作必须通过 `WorkspaceService` 提供的异步 `FileSystem` trait 进行。

### 异步 Trait 定义
```rust
#[async_trait]
pub trait FileSystem: Send + Sync {
    async fn read_file(&self, path: &str) -> Result<String, String>;
    async fn write_file(&self, path: &str, content: &str) -> Result<(), String>;
    // ... 
}
```

### 安全特性
底座默认实现的 `LocalFileSystem` 强制执行 **路径穿越校验**。任何尝试访问工作区根目录之外（如 `../../etc/passwd`）的操作都会被拒绝。

### Pro 版扩展
Pro 版可以通过实现 `FileSystem` trait 并使用 `WorkspaceService::with_fs()` 注入，来实现加密存储、云端同步等高级存储后端。

---

## 3. 内部事件总线 (Event Bus)

`EventBus` 允许后端不同模块（如 Agent 和 FS）之间进行低耦合通信。

### 常用事件 (ZymaEvent)
*   `WorkspaceChanged(String)`
*   `FileSaved(String)`
*   `FileCreated(String)`
*   `FileDeleted(String)`
*   `WindowFocused(bool)`

### 后端订阅示例 (针对 Pro Agent)
```rust
let mut rx = bus.subscribe();
tokio::spawn(async move {
    while let Ok(event) = rx.recv().await {
        if let ZymaEvent::FileSaved(path) = event {
            // 触发 AI 自动审查
        }
    }
});
```

---

## 4. UI 插槽系统 (Slot System)

为了解决 UI 扩展性，底座定义了多个 **Slot (插槽)**。Pro 版无需修改底座 TS 代码即可注入功能。

### 可用插槽位置
*   `STATUS_BAR_LEFT` / `STATUS_BAR_RIGHT`
*   `ACTIVITY_BAR_TOP` / `ACTIVITY_BAR_BOTTOM`
*   `EDITOR_TITLE_RIGHT`

### 前端注册示例
```typescript
import { slotRegistry } from '../core/SlotRegistry';

slotRegistry.register('STATUS_BAR_RIGHT', {
    id: 'shovx-sync-status',
    component: () => <SyncIndicator />,
    order: 1
});
```

---

## 5. 会话与现场恢复 (Session Persistence)

底座现在具备“记忆力”。

### 存储内容
系统会自动在 `settings.json` 中持久化：
1.  **最后打开的工作区路径**。
2.  **当前打开的所有文件标签页列表**。
3.  **当前处于活动状态的标签页**。

### 逻辑说明
*   **保存**：由前端 `useSessionManagement` 钩子负责，采用 3s 延迟的防抖机制。
*   **恢复**：在应用启动并完成初始化 (`ready === true`) 后，系统会自动按顺序重新加载文件并定位到上次的行号。

---

## 6. 现代搜索系统 (Modern Search)

搜索模块 (`search.rs`) 已针对大规模生产力场景优化：
*   **性能**：支持流式读取 (`BufReader`)、二进制自动跳过、多线程并行扫描。
*   **匹配**：支持 **Smart Case** (智能大小写) 和 **多关键词 AND 逻辑**。
*   **展示**：支持“树形 (Tree)”和“列表 (List)”双模式切换，路径显示采用面包屑风格。