# Zyma 核心架构参考手册 (v2.3)

> **修订日期**：2026年2月3日
> **适用版本**：Zyma 工业级底座重构版 (v0.9.6+)

## 1. 架构理念：组件库化与依赖注入

Zyma 已完全进化为 **"底座组件库 (@zyma/ui) + 核心运行时 (Rust)"** 的现代 IDE 架构。

### 核心设计原则
*   **极致解耦**：UI 布局组件（Workbench）与业务控制器（fm, logic, tabSystem）完全分离。
*   **依赖注入 (DI)**：所有的核心驱动器均通过 React Props 或 Context 注入，不绑定任何特定业务。
*   **单向数据流**：状态由专注于特定职责的 Hooks（如 `useUIState`, `useFileManagement`）统一管理。

---

## 2. 前端驱动架构 (Hook-based DI)

### 核心控制器 (Controllers)

| 控制器名称 | 职责 |
| :--- | :--- |
| **FileManagement (fm)** | 负责全量文件操作（读、写、创建、删除、另存为、编码检测）。 |
| **TabSystem** | 负责管理编辑器标签页的开启、焦点切换与关闭逻辑。 |
| **WorkbenchLogic** | 处理工作区切换监听、路径计算、UI 面板（设置/搜索）显隐状态。 |
| **NativeExtensions** | 自动发现并桥接后端注入的原生能力（如 AI 插件、账号系统）。 |

---

## 3. 智能编码检测与持久化

### 自动编码识别
底座集成了 Mozilla 的 `chardetng` 引擎与 `encoding_rs`：
*   **功能**：自动识别 ANSI (GBK)、UTF-8 等编码，彻底消除中文乱码。
*   **UI 联动**：状态栏实时反馈文件的真实编码，并在无法确定时显示“未知”。

### 持久化 UID 系统
为了解决 React 在文件路径变更（如“另存为”）时销毁组件的问题，引入了持久化 `uid`：
*   **效果**：文件 ID (路径) 改变时，编辑器实例通过 `uid` 保持稳定，完美保留撤销历史和滚动位置。

---

## 4. 全异步虚拟文件系统 (VFS)

底座提供了一个线程安全的键值对存储，用于解耦业务层（Pro）与底座 UI。

### 核心 API (Rust)
*   `set_context(key, value)`: 存入状态并向前端广播 `zyma:context-changed` 事件。
*   `get_context(key)`: 获取指定状态。

### 应用场景
Pro 版通过 API 设置 `active_platform: "esunny"`，底座的 AI 助手和侧边栏会自动读取此上下文并调整交互行为。

---

## 3. 动态原生扩展协议 (Dynamic Extensions)

底座支持在运行时（Runtime）通过 API 动态修改界面元素，无需重启。

### 动态侧边栏 (Dynamic Sidebar)
*   **接口**: `update_sidebar_items(items)`
*   **效果**: Activity Bar 图标实时刷新。Pro 版可根据探测到的工作区平台动态显示/隐藏图标。

### 动态命令注册 (Dynamic Commands)
*   **接口**: `update_native_commands(commands)`
*   **效果**: Ctrl+Shift+P 搜索面板实时更新。允许 Pro 版在进入特定垂直领域时注入领域专属命令（如“Esunny: 编译策略”）。

---

## 4. 增强的 AI 协议 (Enhanced AI Protocol)

底座采用“底座负责流，业务负责魂”的设计模式。

*   **底座职责**: 提供 Chat UI、Markdown 渲染、多轮对话管理、上下文截断。
*   **Pro 版职责**: 注入垂直领域上下文。底座在发起 LLM 请求前，会自动合并全局上下文中的业务参数，生成针对性强的 System Prompt。

---

## 5. 全异步虚拟文件系统 (VFS)

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

## 7. 启动器扩展 (ZymaBuilder)

为了支持 Pro 版在不侵入底座源码的情况下注入初始化逻辑，`ZymaBuilder` 提供了链式配置接口。

### `ZymaBuilder::setup<F>(self, callback: F)`
在底座初始化阶段注入自定义钩子。该钩子在所有核心服务（FS、LLM、Bus）注册完成后执行。

**使用示例 (Pro 版 main.rs):**
```rust
ZymaBuilder::from_builder(builder)
    .setup(|app| {
        // 执行业务初始化，如开启特定的日志信道
        let state = app.state::<zyma_lib::commands::output::OutputState>();
        zyma_lib::commands::output::output_append(
            app.handle().clone(),
            state,
            "system".into(),
            "Pro Engine Ready.\n".into()
        );
        Ok(())
    })
    .run(tauri::generate_context!());
```

---

## 8. 现代搜索系统 (Modern Search)

搜索模块 (`search.rs`) 已针对大规模生产力场景优化：
*   **性能**：支持流式读取 (`BufReader`)、二进制自动跳过、多线程并行扫描。
*   **匹配**：支持 **Smart Case** (智能大小写) 和 **多关键词 AND 逻辑**。
*   **展示**：支持“树形 (Tree)”和“列表 (List)”双模式切换，路径显示采用面包屑风格。