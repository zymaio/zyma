# Zyma 插件 API 参考手册

Zyma 的插件 API 旨在通过 Rust 承载高性能逻辑，同时提供与主流编辑器相似的开发体验。

## 1. 工作区文件系统 (zyma.workspace)

### `stat(path: string): Promise<FileStat>`
*   **功能**: 获取文件或目录的元数据。
*   **返回**: `{ file_type: "file" | "dir" | "symlink", size: number, mtime: number }`

### `readDirectory(path: string): Promise<FileItem[]>`
*   **功能**: 列出指定目录下的所有子项。

### `findFiles(baseDir: string, include: string, exclude?: string): Promise<string[]>`
*   **功能**: 在指定范围内使用 Glob 模式搜索文件。
*   **示例**: `await zyma.workspace.findFiles("C:/Data", "**/*.json")`

### `createFileSystemWatcher(path: string): FileSystemWatcher`
*   **功能**: 实时监听文件系统的变化。
*   **方法**: `onDidCreate`, `onDidChange`, `onDidDelete`, `dispose`

## 2. 系统能力 (zyma.system)

### `getEnv(name: string): Promise<string | null>`
*   **功能**: 读取当前系统的环境变量（如 `PATH`, `APPDATA`）。

### `exec(command: string, args: string[]): Promise<ExecResult>`
*   **功能**: 执行外部可执行程序并捕获输出结果。
*   **返回**: `{ stdout: string, stderr: string, exit_code: number }`

## 3. 窗口与输出 (zyma.window)

### `createOutputChannel(name: string): OutputChannel`
*   **功能**: 创建一个命名的输出频道用于展示日志。
*   **特性**: 具备按需激活逻辑，即仅在有输出时自动显示控制台图标。
*   **方法**: `append`, `appendLine`, `clear`, `show`

### `create(label: string, options: any): Promise<void>`
*   **功能**: 创建一个新的原生 Webview 窗口。

## 4. 视图注册 (zyma.views)

### `register(view: View): void`
*   **功能**: 向侧边栏注册一个自定义 React 视图。
*   **参数**: `{ id, title, icon, component, order }`
