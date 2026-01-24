# Zyma 插件开发参考手册 (v1.0)

Zyma 插件通过 JavaScript 编写，可以完全访问编辑器的 UI、文件系统和底层的 Rust 能力。

## 1. 插件结构
每个插件必须位于 `zyma/plugins/` 下的一个独立文件夹中，包含：
*   `manifest.json`: 插件元数据。
*   `index.js`: 插件入口脚本。

### manifest.json 示例
```json
{
  "name": "MyPlugin",
  "version": "1.0.0",
  "entry": "index.js",
  "description": "我的第一个 Zyma 插件"
}
```

## 2. 运行时环境
插件脚本在隔离的函数作用域内执行，注入了以下全局变量：
*   `zyma`: 核心 API 对象。
*   `React`: 完整的 React 库，用于构建 UI 视图。
*   `Lucide`: Lucide React 图标库。

## 3. Zyma API 详解

### 3.1 编辑器 (zyma.editor)
*   `insertText(text: string)`: 在当前光标处插入文本。
*   `getContent()`: 获取当前编辑器的全部文本。
*   `showDiff(path, content, title)`: 弹出代码差异对比界面。

### 3.2 命令系统 (zyma.commands)
*   `register({ id, title, category, callback })`: 注册一个命令到命令面板。
*   `execute(id, ...args)`: 执行已注册的命令。

### 3.3 视图系统 (zyma.views)
*   `register({ id, title, icon, component })`: 在侧边栏注册一个动态视图。
    *   `icon`: 使用 `React.createElement(Lucide.IconName)` 创建。
    *   `component`: 一个 React 函数组件。

### 3.4 通信与事件 (zyma.events & zyma.system)
*   `events.on(eventName, callback)`: 监听 Tauri 全局事件（如 `shovx-event`）。返回 `unlisten` 函数。
*   `system.invoke(command, args)`: 调用 Rust 端的 `#[tauri::command]`。

### 3.5 存储 (zyma.storage)
*   `get(key)`: 获取插件私有存储的值（Promise）。
*   `set(key, value)`: 保存插件私有配置。

## 4. 生命周期
*   `exports.activate()`: 插件加载时调用。在此进行注册操作。
*   `exports.deactivate()`: 插件卸载时调用。Zyma 会自动清理事件监听，但你应在此关闭 WebSocket 等外部连接。

---
*本文档由 Zyma 核心团队自动生成。*
