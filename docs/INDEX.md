# Zyma 文档索引

欢迎来到 Zyma 编辑器底座文档中心。本文档旨在帮助开发者了解 Zyma 的 SOA 架构并基于此进行二次开发（如 Zyma Pro）。

## 📖 核心架构 (Core)
深入了解 Zyma 的底层设计理念与核心服务。
- [**整体架构概览**](core/architecture.md)：SOA 服务化、EventBus 与服务注入。
- [**核心功能清单**](core/features.md)：目前底座已实现的全部功能特性。
- [**虚拟文件系统 (VFS)**](core/architecture.md#2-全异步虚拟文件系统-vfs)：异步 I/O 与路径安全校验。
- [**UI 插槽系统**](core/architecture.md#4-ui-插槽系统-slot-system)：如何在不修改底座的情况下扩展界面。

## 🛠️ API 参考 (API)
前端与后端交互的详细接口说明。
- [**后端 Command 列表**](api/backend_commands.md)：FS、Search、Watcher、LLM 等核心命令。

## 🧩 扩展开发 (Extensions)
如何为 Zyma 编写插件或集成 AI Agent。
- [**Agent 集成规范**](extensions/agent_integration.md)：为 LLM Agent 预留的深度接口与流程。
- **原生扩展 (Native)**：通过 Rust 注入 `ChatParticipant` (即将补充)。
- **JS 插件系统**：基于主进程加载的插件模型 (即将补充)。

## 📂 归档 (Archive)
- [旧版插件设计](archive/old_plugin_design.md)
