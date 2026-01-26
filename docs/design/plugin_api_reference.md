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
