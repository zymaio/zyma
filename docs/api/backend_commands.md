# Zyma Plugin API Reference (v0.2.0)

本文档定义了 Zyma 插件可调用的核心 API。

## 💬 聊天系统 (Chat)
用于接入 AI 能力，复刻 VS Code Chat Participant 模式。

### `zyma.chat.registerChatParticipant(participant)`
注册一个聊天参与者。

**参数 `participant` 对象属性：**
- `id`: (string) 唯一标识符。
- `name`: (string) 短名称（用于 @ 提及）。
- `fullName`: (string) 全名（显示在 UI 上）。
- `description`: (string) 功能描述。
- `commands`: (Array) 注册斜杠命令，如 `[{ name: 'fix', description: '修复错误' }]`。
- `handler`: (Function) 核心处理逻辑。

**Handler 签名：**
`async (request, stream) => { ... }`

- **`request` 对象：**
    - `prompt`: 用户输入的文字。
    - `command`: 触发的斜杠命令（不带 /）。
    - `selection`: 编辑器当前选中的代码。
    - `filePath`: 当前活跃文件的路径。
    - `fileContent`: 当前活跃文件的全文。
    - `history`: 历史对话记录 `[{ role: 'user' | 'agent', content: string }]`。

- **`stream` 对象：**
    - `markdown(text)`: 流式输出 Markdown 文字。
    - `diff(original, modified, lang, path)`: 弹出代码对比视图。
    - `toolCall(name, args, status, result)`: 显示工具调用状态。
        - `status`: `'calling'` (执行中，UI 显示加载动画), `'success'` (完成), `'error'` (失败)。
    - `status(type)`: (可选) 显式更新消息的整体状态。
        - `type`: `'thinking'` (思考中), `'streaming'` (生成中), `'done'` (完成), `'error'` (错误)。
    - `done()`: 结束输出，将 UI 状态置为完成。
    - `error(msg)`: 输出错误信息，并将 UI 状态置为错误。

### 最佳实践：进度感知
为了提升入门级用户的体验，建议在执行耗时操作（如调用后端 AI 或执行系统命令）前，先调用 `toolCall` 或 `status` 以消除用户的焦虑感。

---

## 📝 编辑器控制 (Editor)
### `zyma.editor.getContent()`
获取当前活跃编辑器的全文。

### `zyma.editor.insertText(text)`
在光标处插入文字。

---

## 📂 工作区 (Workspace)
### `zyma.workspace.readFile(path)`
读取本地文件。

### `zyma.workspace.writeFile(path, content)`

写入本地文件（在面向入门级用户的模式下，建议通过 `stream.diff` 让用户确认后写入，以确保操作的安全性）。



---



## 🐚 系统能力 (System)

### `zyma.system.exec(command, args)`

执行系统命令（如运行编译器或脚本）。

## 窗口与标签页控制 (Window & Tab Control)
底座提供了通用的事件接口，允许插件在不修改底座代码的情况下，在编辑器区域（Tab 栏）或独立窗口中显示自定义网页内容。

### 全局事件 (Global Events)
可以通过 Tauri 的 `emit` 或前端的 `listen` 触发以下行为：

#### `zyma:open-tab` (打开自定义页签)
在编辑器中心区域打开一个内嵌网页的 Tab。
- **Payload 参数 (Object):**
    - `id`: (string) 页签唯一标识，用于后续关闭。
    - `title`: (string) 页签标题。
    - `url`: (string) 要加载的网页地址（支持本地 http 或远程 https）。

#### `zyma:close-tab` (关闭页签)
- **Payload 参数 (string):** 要关闭的页签 `id`。

**使用示例 (Rust):**
```rust
use tauri::Emitter;
// 打开登录页
app.emit("zyma:open-tab", serde_json::json!({
    "id": "my-plugin-login",
    "title": "插件登录",
    "url": "http://localhost:5173/login"
}));

// 3秒后关闭
let handle = app.handle().clone();
tokio::spawn(async move {
    tokio::time::sleep(Duration::from_secs(3)).await;
    let _ = handle.emit("zyma:close-tab", "my-plugin-login");
});
```

---

## 🎨 UI 样式规范 (UI Style Guide)

为了确保插件在不同主题（如 Abyss、Dark、Light）下的显示效果一致，插件开发者应优先使用系统提供的全局 CSS 类，而不是硬编码颜色。

### 标准按钮类
- `.btn-primary`: 强调色按钮。自动适配背景颜色 (`--accent-color`) 和文字颜色 (`--accent-foreground`)。
- `.btn-secondary`: 次要按钮。

**使用示例 (React):**
```javascript
React.createElement('button', {
    className: 'btn-primary',
    style: { padding: '8px 16px' } // 仅设置布局样式
}, '点击我')
```

### 标准文字色
- `var(--text-primary)`: 主要文字颜色。
- `var(--text-secondary)`: 次要文字颜色。
- `var(--text-muted)`: 禁用或提示性文字颜色。
