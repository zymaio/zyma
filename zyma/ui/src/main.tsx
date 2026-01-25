import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import OutputPanel from './components/PluginSystem/OutputPanel.tsx'
import TitleBar from './components/TitleBar/TitleBar.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const channel = urlParams.get('channel');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
        {mode === 'output' && channel ? (
            <div style={{ 
                width: '100vw', 
                height: '100vh', 
                display: 'flex', 
                flexDirection: 'column', 
                backgroundColor: 'var(--bg-dark, #1e1e1e)',
                color: 'var(--text-primary, #fff)',
                border: '1px solid var(--border-color, #333)'
            }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <OutputPanel channels={[channel]} />
                </div>
            </div>
        ) : (
            <App />
        )}
    </ErrorBoundary>
  </StrictMode>,
)
