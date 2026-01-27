exports.activate = async function() {
    // 直接使用注入的 React 和 Lucide，不要引用 zymainternal
    
    zyma.commands.register({
        id: 'dev.scaffoldPlugin',
        title: 'Create New Plugin Template',
        category: 'Developer',
        callback: async () => {
            const name = prompt("请输入新插件名称 (英文):", "my-new-plugin");
            if (!name) return;
            const path = `plugins/${name}`;
            try {
                await zyma.system.invoke('create_dir', { path });
                const manifest = { name, version: "1.0.0", entry: "index.js" };
                await zyma.workspace.writeFile(`${path}/manifest.json`, JSON.stringify(manifest, null, 2));
                const template = `exports.activate = function() {\n    zyma.ui.notify("${name} 已激活!");\n};`;
                await zyma.workspace.writeFile(`${path}/index.js`, template);
                zyma.ui.notify(`插件 ${name} 创建成功！`);
            } catch (e) { zyma.ui.notify(`创建失败: ${e}`); }
        }
    });

    zyma.views.register({
        id: 'dev.helper',
        title: 'Developer',
        icon: 'Terminal',
        component: () => {
            return React.createElement('div', { 
                key: 'dev-helper-root',
                style: { padding: '15px', color: 'var(--text-primary)', fontSize: 'var(--ui-font-size)' } 
            }, [
                React.createElement('h3', { key: 'h3' }, 'Zyma Dev Tools'),
                React.createElement('button', {
                    key: 'btn',
                    onClick: () => zyma.commands.execute('dev.scaffoldPlugin'),
                    style: { width: '100%', padding: '8px', backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }
                }, '创建新插件')
            ]);
        }
    });
};