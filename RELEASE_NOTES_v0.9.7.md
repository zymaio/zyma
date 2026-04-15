# Zyma v0.9.7 发布说明

## 📦 安装包下载

### Windows
- **MSI 安装包**: `zyma_0.9.7_x64_en-US.msi` (约 6.6 MB)
- **NSIS 安装包**: `zyma_0.9.7_x64-setup.exe` (约 4.7 MB)

### 下载地址
- **GitHub**: https://github.com/zymaio/zyma/releases/tag/v0.9.7
- **Gitee**: https://gitee.com/fourthz/zyma/releases/tag/v0.9.7

---

## ✨ 本次更新亮点

### 🔧 关键修复
- ✅ **修复 TypeScript 编译错误**：确保 v0.9.7 可以成功构建
  - 修复未使用的导入和变量警告
  - 修复类型转换和类型不匹配问题
  - 统一 AppSettings 类型定义
  - 添加 vitest 全局类型支持
  - 修复 SearchPanel 中的变量引用错误

### 🛡️ 安全加固与代码质量飞跃（v0.9.7 主要特性）

#### 🔒 安全性加固
- **消除 unwrap() 崩溃风险**：替换所有 21 处 `unwrap()` 调用为安全错误处理
- **命令注入防护**：`system_exec` 添加程序路径白名单
- **环境变量保护**：`system_get_env` 增加白名单机制

#### 🏗️ 架构优化
- **依赖方向修复**：彻底消除反向依赖
- **模块拆分**：核心模块重构，提升可维护性
- **泛型服务**：6 个重复的 Registry 服务合并为 1 个泛型服务

#### 🧪 测试与 CI/CD
- **Rust 测试**：添加单元测试
- **前端测试**：搭建 Vitest + Testing Library
- **CI 完善**：release 前增加 clippy、cargo test、tsc 检查

---

## 📋 完整更新日志

详见 [CHANGELOG.md](https://github.com/zymaio/zyma/blob/main/CHANGELOG.md)

---

## 🔗 相关链接

- 📖 文档: https://github.com/zymaio/zyma/tree/main/docs
- 🐛 问题反馈: https://github.com/zymaio/zyma/issues
- 💬 讨论: https://github.com/zymaio/zyma/discussions

---

## 👥 贡献者

感谢所有为 Zyma 做出贡献的开发者！

---

**发布日期**: 2026-04-15
