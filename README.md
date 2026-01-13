<p align="center">
  <img src="zyma/src-tauri/branding.svg" width="128" alt="Zyma Brand Logo">
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="zyma/src-tauri/icon.svg" width="128" alt="Zyma App Icon">
</p>

<p align="center">
  <b>智码 (Zyma)</b>
</p>

**智码 (Zyma)** 是一款基于 Rust 和 Tauri 开发的超轻量级、高性能文本编辑器/IDE。

### 💡 核心理念：简洁 · 快速 · 高效
我们坚信优秀的工具应当隐于无形。智码不堆砌臃肿的功能，而是致力于在保持极致启动速度和极低资源占用的同时，提供最核心、最顺手的编辑体验。无论是作为记事本的替代品，还是作为轻量级开发环境，智码都主张：**秒级响应，心无旁骛。**

[简体中文](./README.md) | [English](./README_EN.md)

## 🌍 官方仓库

- **主仓库**: [GitHub - zymaio/zyma](https://github.com/zymaio/zyma) (包含自动构建、Releases)
- **镜像库**: [Gitee - zymaio/zyma](https://gitee.com/zymaio/zyma) (国内访问加速)

## ✨ 核心特性

- 🚀 **极致性能**：基于 Rust 内核，内存占用极低，毫秒级启动。
- 📝 **全能编辑**：支持 20+ 种主流编程语言语法高亮，多标签页管理。
- 📖 **Markdown 增强**：内置分屏实时预览，GitHub 风格渲染。
- 🔍 **全局搜索**：极速扫描项目目录，快速定位代码。
- 🎨 **高度定制**：支持深色/浅色模式动态切换，支持字体动态缩放。
- 🌐 **国际化**：内置简体中文、繁体中文、英文支持。
- 🖱️ **系统集成**：一键添加右键菜单“在智码中编辑”。
- 🧩 **插件系统**：初步支持 JS 插件扩展（开发中）。
- 🤖 **未来规划**：代码快速补全、AI 智能补全、Git 集成等。

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
   git clone https://github.com/zymaio/zyma.git
   cd zyma
   ```
2. 安装前端依赖
   ```bash
   cd zyma/ui
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

本项目采用 **MIT OR Apache-2.0** 双协议开源。
- **核心代码**: 遵循上述开源协议。
- **品牌资源**: 智码 (Zyma) 的闪电图标 (Logo) 为原创美术作品，版权归智码贡献者所有，并同样授权在本项目及其衍生作品中使用。
- **插件部分**: 允许闭源开发。

---

## 🤝 贡献

欢迎提交 Issue 或 Pull Request！我们期待您的建议。
