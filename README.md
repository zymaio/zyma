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

## ✨ 核心特性

- 🚀 **极致响应**：并行异步初始化，核心逻辑（搜索、监听、日志）全部由 Rust 驱动。
- 🧩 **工业级插件系统**：提供对标 VS Code 的标准 API，支持“零编译”JS 插件扩展。
- 📡 **事件驱动架构**：复刻 VS Code 事件模型，支持文件保存、标签切换、窗口焦点等实时感知。
- 🔍 **高性能搜索**：集成 `globset` 引擎，毫秒级扫描万级文件目录。
- 📊 **智能输出系统**：支持多频道日志、语法染色及独立窗口监控，具备多屏位置记忆。
- 🛠️ **开发者友好**：内置全系统路径标准化、快捷键管理及窗口生命周期调度。

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