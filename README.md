<p align="center">
  <img src="zyma/src-tauri/branding.svg" width="128" alt="Zyma Brand Logo">
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="zyma/src-tauri/icon.svg" width="128" alt="Zyma App Icon">
</p>

<p align="center">
  <b>智码 (Zyma)</b>
</p>

**智码 (Zyma)** 是一款基于 Rust 和 Tauri 开发的超轻量级、高性能文本编辑器/IDE 基座。

### 💡 核心理念：简洁 · 模块化 · 高性能
Zyma 不仅仅是一个记事本的替代品，更是一个专为开发者设计的、高度可扩展的 IDE 平台。通过 Rust 内核承载重型任务，结合灵活的 JS 插件系统，实现毫秒级响应与无限扩展可能。

[简体中文](./README.md) | [English](./README_EN.md)

## 核心特性

- 🚀 **极速启动**：基于 Rust & Tauri，毫秒级冷启动。
- 🛡️ **安全第一**：内置全异步 VFS (Virtual File System) 与路径安全沙箱，彻底防御路径穿越。
- 🔍 **现代化搜索**：支持 Smart Case、多关键词与树形结构，配合 `BufReader` 流式扫描，轻松应对海量源码。
- 🧩 **无限扩展**：
  - **后端**：基于 `EventBus` 的内部事件订阅机制。
  - **前端**：基于插槽 (Slot System) 的插件化 UI 架构。
- 🧠 **AI 原生**：内置流式 LLM 客户端支持，为智能体 (Agent) 编程预留深度接口。
- 💾 **自动现场恢复**：自动记忆工作区、打开的文件标签及光标位置，启动即回到“案发现场”。
- 🎨 **主题感应**：全量变量化样式，完美支持深色/浅色模式切换。

## 📸 界面预览

### 🚀 核心编辑体验 (Rust & TypeScript)
支持 20+ 种编程语言语法高亮，毫秒级响应。

<p align="center">
  <img src="docs/screenshots/coding_rust.png" width="45%" alt="Coding Rust">
  &nbsp;
  <img src="docs/screenshots/conding_typescript.png" width="45%" alt="Coding TypeScript">
</p>

### 🎨 模块化布局与设置
支持深色/浅色模式，UI 字体随设置同步无抖动缩放。

<p align="center">
  <img src="docs/screenshots/setting.png" width="60%" alt="Settings">
</p>

## 🛠️ 技术栈

- **Core**: Rust + Tauri v2 (Modular Backend)
- **Frontend**: React + TypeScript + Vite (Hook-based Architecture)
- **Editor**: CodeMirror 6
- **IPC**: Event-driven Messaging Bridge

## 📄 开源协议

本项目采用 **MIT OR Apache-2.0** 双协议开源。
- **插件部分**: 支持闭源/商业插件开发。

---

## 🤝 贡献

欢迎提交 Issue 或 Pull Request！我们期待您的建议。