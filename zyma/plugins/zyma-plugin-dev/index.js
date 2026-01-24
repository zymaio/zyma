exports.activate = function() {
    zyma.commands.register({
        id: 'dev.createTemplate',
        title: 'Generate Plugin Scaffold',
        category: 'Development',
        callback: async () => {
            const name = prompt("新插件名称:", "my-plugin");
            if (!name) return;
            try {
                // 调用新 API 获取标准存放目录
                const baseRoot = await zyma.system.invoke('get_plugins_root');
                const path = `${baseRoot}/${name}`;
                
                await zyma.system.invoke('create_dir', { path });
                await zyma.workspace.writeFile(`${path}/manifest.json`, JSON.stringify({
                    name: name.charAt(0).toUpperCase() + name.slice(1), 
                    version: "1.0.0", 
                    entry: "index.js",
                    description: "A new custom plugin."
                }, null, 2));
                
                const template = `exports.activate = function() {\n    zyma.ui.notify("插件 ${name} 已激活");\n};\n\nexports.deactivate = function() {\n    console.log("插件已卸载");\n};`;
                await zyma.workspace.writeFile(`${path}/index.js`, template);
                
                zyma.ui.notify(`脚手架已生成在用户目录: ${path}\n请重启 Zyma 以加载。`);
            } catch (e) {
                zyma.ui.notify("生成失败: " + e);
            }
        }
    });

    zyma.views.register({
        id: 'dev.sidebar',
        title: 'Dev Center',
        icon: 'Terminal',
        component: () => {
            return React.createElement('div', { key: 'dev-root', style: { padding: '16px', color: '#fff' } }, 
                React.createElement('h3', { key: 'h3', style: { marginBottom: '16px' } }, '开发中心'),
                React.createElement('button', {
                    key: 'btn',
                    onClick: () => zyma.commands.execute('dev.createTemplate'),
                    style: {
                        width: '100%', padding: '10px', backgroundColor: 'var(--accent-color)',
                        color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'
                    }
                }, '生成新插件到配置目录')
            );
        }
    });
};
