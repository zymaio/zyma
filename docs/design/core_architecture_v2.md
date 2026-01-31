# Zyma Core Architecture V2 (Refactored)

> 本文档描述了 Zyma 编辑器底座在 2026年1月 重构后的架构设计。该架构旨在支持 Zyma Pro 及其他高级衍生版本的深度定制与扩展。

## 1. 核心架构：服务化 (Service-Oriented)

旧版的单体 `AppState` 已被废弃。现在的 Zyma 运行时状态被拆分为多个独立的微服务 (Micro-Services)。这些服务通过 Tauri 的 `State` 机制独立注入。

### 可用的核心服务

| 服务名称 | 对应 Rust 类型 | 职责 |
| :--- | :--- | :--- |
| **WorkspaceService** | `commands::fs::WorkspaceService` | 管理当前工作区、文件系统操作 (VFS)。 |
| **PluginService** | `commands::plugins::PluginService` | 管理插件加载路径、原生扩展点 (Chat/Auth)。 |
| **LLMManager** | `llm::LLMManager` | 管理 AI 模型连接、API Key 及请求流。 |
| **EventBus** | `bus::EventBus` | 核心事件广播系统 (Backend-to-Backend)。 |
| **OutputState** | `commands::output::OutputState` | 管理底部面板的日志输出通道。 |
| **WatcherState** | `commands::watcher::WatcherState` | 管理文件系统监听器 (fsnotify)。 |

### 开发示例

如果你在编写一个新的 Tauri Command：

```rust
#[tauri::command]
fn my_custom_command(
    ws: State<'_, WorkspaceService>,  // 仅请求需要的服务
    bus: State<'_, EventBus>
) {
    // 1. 使用 VFS 读取文件
    let content = ws.fs.read_file("config.json").unwrap();
    
    // 2. 发送自定义事件
    bus.publish(ZymaEvent::FileSaved("config.json".into()));
}
```

---

## 2. 虚拟文件系统 (VFS) 与扩展

Zyma 现在通过 `FileSystem` trait 与底层存储交互，不再直接依赖 `std::fs`。这使得 Pro 版可以无缝替换底层存储引擎（如实现加密存储、内存文件系统或 S3 映射）。

### 接口定义

位于 `src/services/vfs.rs`:

```rust
pub trait FileSystem: Send + Sync {
    fn read_file(&self, path: &str) -> Result<String, String>;
    fn write_file(&self, path: &str, content: &str) -> Result<(), String>;
    // ... 其他标准 FS 操作
}
```

### 如何注入自定义 FS (针对 Pro 开发)

在 Pro 版的 `main.rs` 初始化阶段：

```rust
use zyma_lib::services::vfs::FileSystem;
use zyma_lib::commands::fs::WorkspaceService;

struct MyEncryptedFS { /* ... */ }
impl FileSystem for MyEncryptedFS { /* ... */ }

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 替换默认的 LocalFileSystem
            let my_fs = Box::new(MyEncryptedFS::new());
            app.manage(WorkspaceService::with_fs(my_fs)); 
            
            // ...
            Ok(())
        })
        // ...
}
```

### 默认实现：LocalFileSystem
默认实现包含 **路径安全校验 (Path Safety)**，自动防御 `../../` 路径穿越攻击，确保操作限制在工作区根目录内。

---

## 3. 内部事件总线 (Event Bus)

为了支持智能体 (Agent) 主动感知编辑器状态，底座引入了 `tokio::sync::broadcast` 事件总线。

### 监听事件 (Backend)

Pro 版的后台线程（如 `shov-agent`）可以订阅这些事件来触发自动化任务：

```rust
use zyma_lib::bus::{EventBus, ZymaEvent};

fn start_background_agent(bus: &EventBus) {
    let mut rx = bus.subscribe();
    
    tokio::spawn(async move {
        while let Ok(event) = rx.recv().await {
            match event {
                ZymaEvent::FileSaved(path) => {
                    println!("文件已保存，AI 正在分析: {}", path);
                    // 调用 AI 进行 Code Review...
                }
                ZymaEvent::WorkspaceChanged(new_path) => {
                    // 重建索引...
                }
                _ => {}
            }
        }
    });
}
```

### 支持的事件列表

*   `WorkspaceChanged(String)`
*   `FileSaved(String)`
*   `FileCreated(String)`
*   `FileDeleted(String)`
*   `WindowFocused(bool)`

---

## 4. 配置系统扩展

`AppSettings` 结构体现在支持动态字段扩展。

### 存储自定义配置
Pro 版或插件可以将任意 JSON 数据写入配置文件的根层级，它们会被自动收集到 `extra` 字段中并持久化。

**settings.json 示例:**
```json
{
  "theme": "dark",
  "window_width": 1024,
  
  "shovx_cloud_endpoint": "https://api.shovx.com",  <-- 自动存入 extra
  "my_plugin_enabled": true                         <-- 自动存入 extra
}
```

### 读取配置
```rust
let settings = load_settings().unwrap();
if let Some(endpoint) = settings.extra.get("shovx_cloud_endpoint") {
    // ...
}
```
