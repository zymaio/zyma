# Zyma 架构设计文档

## 1. 项目总览

Zyma 是一个基于 **Tauri 2.0 + React/TypeScript** 的现代化桌面 IDE/编辑器。采用清晰的分层架构，后端使用 Rust 保证性能与安全，前端使用 React 提供灵活的 UI 扩展能力。

## 2. 目录结构

```
zyma/
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── core/           # 核心构建器与应用初始化
│   │   ├── commands/       # Tauri IPC 命令处理器 (薄封装)
│   │   ├── services/       # 业务逻辑层 (核心服务)
│   │   ├── models/         # 数据模型定义
│   │   ├── errors.rs       # 统一错误类型 (ZymaError)
│   │   ├── bus.rs          # 内部事件总线
│   │   └── llm/            # LLM/AI 集成模块
├── ui/src/                 # React/TypeScript 前端
│   ├── components/         # UI 组件
│   ├── hooks/              # 业务逻辑 Hooks
│   ├── core/               # 核心 Context 与入口
│   ├── commands/           # 前端命令注册
│   └── utils/              # 工具函数
└── docs/                   # 项目文档
```

## 3. 核心依赖流向

```
main.rs -> lib.rs
             |
             v
          core/ (Builder, Setup)
             |
             v
       services/ (业务逻辑)
             |
             v
       commands/ (Tauri IPC 包装)
             |
             v
        models/ (数据定义)
```

**重要原则**：
- `services` 层**绝不**依赖 `commands` 层。
- `commands` 层只是 `services` 的薄封装，负责处理 Tauri 的 `State` 注入和事件发射。
- 所有配置读写、文件系统操作等业务逻辑都在 `services` 中实现。

## 4. 关键模块说明

### 4.1 Rust 错误处理
使用 `thiserror` 定义了统一的 `ZymaError` 枚举，包含 `Io`, `ConfigError`, `PluginError` 等变体，所有核心服务返回 `Result<T, ZymaError>`。

### 4.2 插件系统
Zyma 提供了基于 JSON Manifest 的插件系统。插件可以通过 `get_native_extensions` 向后端注册视图、命令、认证提供者等。

### 4.3 前端状态管理
- **文件状态**: `useFileState` + `useFileActions`
- **工作台逻辑**: `useWorkbenchLogic` + `useWorkbenchController`
- **上下文**: `WorkbenchContext` (全局共享设置)

## 5. 测试运行

**Rust 测试**:
```bash
cd zyma/src-tauri
cargo test
```

**前端测试**:
```bash
cd zyma/ui
npm test
```

---

> 详细重构记录请查看 [REFACTORING_SUMMARY.md](../REFACTORING_SUMMARY.md)。
