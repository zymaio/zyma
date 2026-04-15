# 贡献指南 (CONTRIBUTING.md)

感谢你关注 Zyma 项目！我们非常欢迎社区的贡献。

## 1. 开发环境准备

确保你的机器上安装了：
- **Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js**: 建议 v18+
- **Tauri CLI**: `cargo install tauri-cli`

## 2. 运行项目

```bash
# 1. 安装前端依赖
cd zyma/ui && npm install

# 2. 启动开发模式 (同时运行 Rust 和 React)
cd zyma/src-tauri
cargo tauri dev
```

## 3. 代码规范

### 3.1 Rust
- 使用 `cargo fmt` 格式化代码。
- 使用 `cargo clippy` 检查常见 lint 错误。
- 错误处理请使用 `thiserror`，避免使用 `.unwrap()`，除非是明确的不可恢复错误。

### 3.2 TypeScript/React
- 使用 `npm run lint` (或 `npx tsc --noEmit`) 确保类型安全。
- **禁止使用 `any`**，请定义明确的接口或类型。
- 组件文件建议不超过 150 行，逻辑复杂时请拆分为 Hooks 或子组件。

## 4. 提交 Pull Request

1. **Fork** 本仓库并创建你的特性分支 (`git checkout -b feature/amazing-feature`)
2. **Commit** 你的更改 (`git commit -m 'feat: add amazing feature'`)
3. **Push** 到分支 (`git push origin feature/amazing-feature`)
4. 打开 **Pull Request**

### Commit 规范
我们推荐使用 Conventional Commits:
- `feat:` 新功能
- `fix:` Bug 修复
- `refactor:` 代码重构
- `docs:` 文档更新
- `chore:` 维护性工作 (依赖升级、CI 等)

## 5. 架构约束

在提交代码前，请确保你的修改遵循了以下架构原则：
- **依赖方向**: `core` -> `services` -> `commands` -> `models`。禁止反向依赖。
- **职责单一**: 一个文件只做一件事。如果文件超过 200 行，请考虑拆分。
- **测试**: 新的核心逻辑请补充相应的单元测试。

---

如有疑问，请提 Issue 或在 PR 中说明。感谢你的贡献！🎉
