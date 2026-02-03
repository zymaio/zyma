import { ZymaApp } from './core/ZymaApp';
import { useMemo } from 'react';
import './i18n';

/**
 * App.tsx 现在作为 Zyma 框架的使用示例（或独立运行入口）。
 * 它不再处理复杂的初始化逻辑，而是将自定义业务配置注入到 ZymaApp 组件中。
 */
function App() {
  // 定义业务特定的品牌信息
  const brand = useMemo(() => ({
    name: 'Zyma',
    subName: 'Professional Code Editor',
    logo: (
        <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="100" fill="#FF4D4F"/>
            <path d="M190 100H430L250 260H390L150 420L220 260H130L190 100Z" fill="white"/>
        </svg>
    )
  }), []);

  // 定义欢迎页的额外内容
  const welcomeExtra = (
    <div style={{ 
        padding: '20px', 
        backgroundColor: 'var(--active-bg)', 
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        marginTop: '20px'
    }}>
        <h3 style={{ margin: '0 0 10px 0' }}>🚀 快速开始</h3>
        <p style={{ opacity: 0.7, fontSize: '0.9em' }}>
            欢迎使用 Zyma 开源底座。你可以通过修改 <code>App.tsx</code> 来定制此界面。
        </p>
    </div>
  );

  return (
    <ZymaApp 
        brand={brand}
        welcomeExtra={welcomeExtra}
    />
  );
}

export default App;
