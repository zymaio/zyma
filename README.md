# 智码 (Zyma)

[![License: MIT/Apache-2.0](https://img.shields.io/badge/License-MIT%20/%20Apache--2.0-blue.svg)](LICENSE-MIT)
[![Tauri](https://img.shields.io/badge/Framework-Tauri%20v2-orange)](https://tauri.app/)

**智码 (Zyma)** 是一款基于 Rust 和 Tauri 开发的超轻量级、高性能文本编辑器/IDE。它旨在成为 Windows 记事本的完美替代品，同时为开发者提供类似主流 IDE 的沉浸式体验。

[简体中文](./README.md) | [English](./README_EN.md)

## ✨ 核心特性

- 🚀 **极致性能**：基于 Rust 内核，内存占用极低，毫秒级启动。
- 📝 **全能编辑**：支持 20+ 种主流编程语言语法高亮，多标签页管理。
- 📖 **Markdown 增强**：内置分屏实时预览，GitHub 风格渲染。
- 🔍 **全局搜索**：极速扫描项目目录，快速定位代码。
- 🎨 **高度定制**：支持深色/浅色模式动态切换，支持字体动态缩放。
- 🌐 **国际化**：内置简体中文、繁体中文、英文支持。
- 🖱️ **系统集成**：一键添加右键菜单“在智码中编辑”。
- 🧩 **插件系统**：初步支持 JS 插件扩展（开发中）。

## 📸 界面预览

*(在此处添加截图)*

## 🛠️ 技术栈

- **Core**: Rust + Tauri v2
- **Frontend**: React + TypeScript + Vite
- **Editor**: CodeMirror 6
- **Icons**: Lucide React Core

## 📦 如何构建

### 前置要求
- [Node.js](https://nodejs.org/) (推荐 v18+)
- [Rust](https://www.rust-lang.org/) (推荐 1.77+)
- Tauri CLI: `cargo install tauri-cli`

### 构建步骤
1. 克隆仓库
   ```bash
   git clone https://github.com/your-username/zyma.git
   cd zyma
   ```
2. 安装前端依赖
   ```bash
   cd ui
   npm install
   cd ..
   ```
3. 运行开发版本
   ```bash
   cargo tauri dev
   ```
4. 打包发布版本
   ```bash
   cargo tauri build
   ```

## 📄 开源协议

本项目采用 **MIT OR Apache-2.0** 双协议开源。插件部分允许闭源开发。

---

## 🤝 贡献

欢迎提交 Issue 或 Pull Request！我们期待您的建议。
