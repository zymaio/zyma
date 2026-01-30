// Force reload 1
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import OutputPanel from './components/PluginSystem/OutputPanel.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const channel = urlParams.get('channel');
const theme = urlParams.get('theme') || 'dark';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
        {mode === 'output' && channel ? (
            <div className={`theme-${theme}`} style={{ width: '100vw', height: '100vh' }}>
                <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    backgroundColor: 'var(--bg-editor)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <OutputPanel channels={[channel]} />
                    </div>
                </div>
            </div>
        ) : (
            <App />
        )}
    </ErrorBoundary>
  </StrictMode>,
)
