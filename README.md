<p align="center">
  <img src="zyma/src-tauri/branding.svg" width="128" alt="Zyma Brand Logo">
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="zyma/src-tauri/icon.svg" width="128" alt="Zyma App Icon">
</p>

<p align="center">
  <b>智码 (Zyma) - 现代 IDE 引擎底座</b>
</p>

**智码 (Zyma)** 是一款基于 Rust 和 Tauri 开发的超轻量级、高性能、工业级 IDE 引擎底座。它旨在为开发者提供一个可插拔、可定制的核心框架，用于快速构建专业的 IDE 应用（如 **ShovX Pro**）。

### 💡 核心理念：解耦 · 引擎化 · 高性能
Zyma 已从传统的文本编辑器进化为 **"底座组件库 (@zyma/ui) + 核心运行时 (Rust)"** 的架构模式。它不绑定特定的业务逻辑，通过深度依赖注入（DI）和原生扩展协议，允许开发者在不修改核心源码的情况下注入自己的品牌、视图和业务逻辑。

[简体中文](./README.md) | [English](./README_EN.md)

## 核心特性

- 🏗️ **引擎化架构**：核心布局与业务逻辑彻底分离，支持通过 Props 注入自定义品牌（Logo、名称）和功能。
- 🚀 **极速启动**：基于 Rust & Tauri，毫秒级冷启动，极致的资源占用控制。
- 🛡️ **安全与编码**：
  - **智能检测**：内置 `chardetng` 引擎，自动识别 ANSI (GBK)/UTF-8 编码，彻底消除乱码。
  - **安全沙箱**：全异步 VFS 配合路径安全校验，保障工程数据的访问安全。
- 🔍 **现代化搜索**：并行化搜索后端，支持 Smart Case 与树形结果展示。
- 🧩 **无限扩展**：
  - **插槽系统 (Slots)**：前端提供丰富的 UI 插槽（活动栏、状态栏、欢迎页）。
  - **原生桥接**：后端支持通过 Rust 注入 AI 参与者、账号提供商等核心能力。
- 🧠 **AI Ready**：内置流式 LLM 客户端与指令系统，为 Agent 编程提供原生支撑。
- 🎨 **主题与稳定性**：全量变量化样式，内置全局错误边界（ErrorBoundary），单个视图崩溃不影响整体运行。

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