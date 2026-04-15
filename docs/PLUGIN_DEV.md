# Zyma 插件开发指南

本指南将帮助你为 Zyma 编辑器开发插件，扩展其核心功能。

## 1. 插件结构

一个标准的 Zyma 插件应包含以下文件：

```
my-plugin/
├── manifest.json      # 插件元数据
├── index.js           # 插件入口文件
└── ...
```

### manifest.json 示例

```json
{
    "name": "my-plugin",
    "version": "1.0.0",
    "author": "Your Name",
    "entry": "index.js",
    "description": "A brief description of your plugin",
    "icon": "icon.png",
    "contributes": {
        "views": [
            { "id": "my-view", "title": "My View", "icon": "icon.svg" }
        ]
    }
}
```

## 2. 核心 API

在你的 `index.js` 中，你可以通过 `zyma` 全局对象访问插件 API。

### 2.1 注册视图 (Views)

```javascript
zyma.registerView({
    id: 'my-custom-view',
    title: 'My Custom View',
    icon: 'path/to/icon.svg',
    component: () => {
        // 返回你的 UI 组件 (React/HTML)
        return document.createElement('div');
    }
});
```

### 2.2 注册命令 (Commands)

```javascript
zyma.commands.register({
    id: 'my-plugin.do-something',
    title: 'Do Something',
    category: 'My Plugin',
    execute: async (args) => {
        console.log('Command executed with:', args);
    }
});
```

### 2.3 注册认证提供者 (Auth)

```javascript
zyma.auth.registerProvider({
    id: 'my-auth',
    label: 'My Auth Service',
    loginCommand: 'my-plugin.login',
    logoutCommand: 'my-plugin.logout'
});
```

## 3. 事件监听

你可以监听编辑器的核心事件：

```javascript
zyma.events.onFileOpen((path) => {
    console.log('File opened:', path);
});

zyma.events.onWorkspaceChange((path) => {
    console.log('Workspace changed to:', path);
});
```

## 4. 安装插件

将你的插件文件夹放入以下任一目录：
- **用户目录**: `~/.zyma/plugins/`
- **项目目录**: `<project-root>/.zyma/plugins/`
- **启动参数**: `zyma --plugin-dir /path/to/plugins`

重启 Zyma 后即可生效。

---

> 更多信息请访问项目 [README.md](../README.md) 或 [架构文档](./ARCHITECTURE.md)。
