# Zyma 插件 API 参考手册 (v1.1)

Zyma 的插件 API 设计严格遵循 VS Code 标准，旨在提供极低的学习成本和极高的运行效率。

## 1. 工作区 (zyma.workspace)

### 事件监听
- **`onDidSaveTextDocument(listener: (doc: TextDocument) => void)`**: 文件保存后触发。
- **`onDidOpenTextDocument(listener: (doc: TextDocument) => void)`**: 文件打开或成为活动编辑器时触发。
- **`onDidCreateFiles(listener: (path: string) => void)`**: 监听到文件创建。
- **`onDidChangeFiles(listener: (path: string) => void)`**: 监听到文件修改。
- **`onDidDeleteFiles(listener: (path: string) => void)`**: 监听到文件删除。

### 核心方法
- **`findFiles(baseDir, include, exclude?)`**: 基于 Rust 引擎的高性能 Glob 搜索。
- **`readFile(path)` / `writeFile(path, content)`**: 标准文件读写。
- **`stat(path)`**: 获取文件类型、大小、修改时间。

## 2. 窗口 (zyma.window)

### 事件监听
- **`onDidChangeActiveTextEditor(listener: (doc: TextDocument | null) => void)`**: 活跃标签页切换。
- **`onDidChangeWindowState(listener: (state: WindowState) => void)`**: 窗口焦点变化（Focused/Blurred）。
- **`onDidChangeTextEditorSelection(listener: (e: SelectionChangeEvent) => void)`**: 光标移动或选区变化（已节流）。

### 核心方法
- **`createOutputChannel(name)`**: 创建智能输出频道。
- **`create(label, options)`**: 创建原生 Webview 窗口。

## 3. 系统与事件 (zyma.system & zyma.events)

- **`system.exec(program, args)`**: 执行外部系统程序并捕获输出。
- **`system.getEnv(name)`**: 读取系统环境变量。
- **`events.on(event, handler)`**: 订阅 Zyma 全局定义的自定义事件。

## 4. 界面与交互 (zyma.ui & zyma.views)

- **`ui.notify(message)`**: 弹出系统级通知。
- **`views.register(view)`**: 向侧边栏注册 React 视图。
- **`editor.insertText(text)`**: 向当前编辑器插入文本。
- **`editor.showDiff(path, content, title)`**: 弹出差异对比确认框。
