# Tauri 窗口闪烁问题与窗口控制方法

## 1. 概述
在 Windows 平台上，Tauri (及 WebView2) 在初始化阶段可能出现短暂的白屏或布局跳变。本项目通过结合 Tauri v2 的新特性与后端拦截逻辑，实现了平滑的“零闪烁”启动及可靠的窗口状态恢复。

---

## 2. 解决方案：防闪烁最佳实践

### 2.1 预设背景色 (tauri.conf.json)
通过设置 `backgroundColor`，确保 WebView2 在加载 HTML 之前的底色与应用主题一致，消除“白闪”。
```json
"windows": [
  {
    "visible": false,
    "decorations": false,
    "backgroundColor": "#1e1e1e"
  }
]
```

### 2.2 避免初始化阶段的多次 Resize
**错误做法**：在 `setup` 阶段直接显示窗口后再 `set_size`。
**正确做法**：
1. 在 `tauri.conf.json` 中设置 `"visible": false`。
2. 在 Rust 的 `setup` 阶段加载配置。
3. **在调用 `.show()` 之前**，依次执行 `set_size`、`set_position` 和 `maximize()`。
4. 最后调用 `show()` 和 `focus()`。

---

## 3. 窗口状态持久化方案

### 3.1 后端同步捕获 (推荐)
由于前端 JS 的异步特性，在窗口关闭瞬间捕获状态可能不及时。本项目采用了后端主动捕获方案：
- **命令**: `save_window_state` (Rust)
- **逻辑**: 
    - 使用 `window.is_maximized()` 判断。
    - 若为最大化，仅保存 `is_maximized: true`。
    - 若为常规状态，使用 `window.outer_size()` 和 `window.outer_position()` 捕获物理像素坐标。

### 3.2 退出序列优化 (App.tsx)
确保数据写入完成后再关闭进程：
1. 用户触发关闭。
2. 调用 `save_window_state` (等待异步返回)。
3. 调用 `win.hide()` (提升用户感知的响应速度)。
4. 调用 `exit_app` (真正安全退出)。

---

## 4. 总结
- **闪烁问题**：通过 `visible: false` + `backgroundColor` + `后端预布局` 解决。
- **状态保存**：通过 `Rust 同步捕获` + `前端退出等待` 解决。
