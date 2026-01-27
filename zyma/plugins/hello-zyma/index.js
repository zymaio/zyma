exports.activate = function() {
    zyma.statusBar.registerItem({
        id: 'hello.status',
        text: '👋 Hello Zyma',
        alignment: 'right',
        priority: 10,
        onClick: () => zyma.ui.notify("您点击了 Hello 插件的状态栏！")
    });

    zyma.views.register({
        id: 'hello.sidebar',
        title: 'Hello',
        icon: 'Info', 
        component: () => {
            return React.createElement('div', { 
                key: 'hello-container',
                style: { padding: '20px', color: '#fff', textAlign: 'center' } 
            }, [
                React.createElement('h2', { key: 'h2' }, '欢迎使用 Zyma'),
                React.createElement('p', { key: 'p', style: { opacity: 0.7, marginTop: '10px' } }, '这是一个演示插件，展示了如何注入 UI。')
            ]);
        }
    });
};
