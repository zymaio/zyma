exports.activate = function() {
    zyma.ui.notify("HelloZyma 插件已激活!");

    // 1. 注册一个命令到命令面板
    zyma.commands.register({
        id: 'hello.insertGreeting',
        title: 'Insert Greeting',
        category: 'Plugin',
        callback: () => {
            const time = new Date().toLocaleTimeString();
            zyma.editor.insertText(`\n[HelloZyma] 你好！现在是 ${time}\n`);
            zyma.ui.notify("已成功插入问候语！");
        }
    });

    // 2. 注册一个状态栏项
    zyma.statusBar.registerItem({
        id: 'hello-status',
        text: '✨ Hello Plugin',
        alignment: 'right',
        priority: 100,
        tooltip: '点击我会弹窗',
        onClick: () => {
            zyma.ui.notify("你点击了插件状态栏！");
        }
    // 3. 注册一个命令来打开 AI 专用窗口
    zyma.commands.register({
        id: 'ai.openDedicatedWindow',
        title: 'Open AI Assistant Window',
        category: 'AI',
        callback: () => {
            zyma.window.create('ai-assistant', {
                title: 'Zyma AI Assistant',
                width: 400,
                height: 600,
                resizable: true,
                alwaysOnTop: true, // 让 AI 窗口始终在前，方便边看代码边聊天
                decorations: true
            });
            zyma.ui.notify("AI 专用窗口已开启");
        }
    });

    console.log("HelloZyma commands registered!");
};

exports.deactivate = function() {
    console.log("HelloZyma deactivated.");
};