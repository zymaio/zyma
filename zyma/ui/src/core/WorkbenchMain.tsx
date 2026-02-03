import React from 'react';
import Editor from '../components/Editor/Editor';
import Preview from '../components/Preview/Preview';
import { slotRegistry } from './SlotRegistry';
import { WelcomeScreen } from '../components/Common/WelcomeScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface WorkbenchMainProps {
    activeTab: any;
    activeFile: any;
    settings: any;
    fm: any;
    productName: string;
    welcomeExtra?: React.ReactNode;
}

const WorkbenchMain: React.FC<WorkbenchMainProps> = ({
    activeTab,
    activeFile,
    settings,
    fm,
    productName,
    welcomeExtra
}) => {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    React.useEffect(() => {
        const unsub = slotRegistry.subscribe(() => forceUpdate());
        return () => unsub();
    }, []);

    const isMarkdown = activeFile?.name.toLowerCase().endsWith('.md');

    return (
        <div className="main-content-area" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            {activeTab?.type === 'file' && activeFile ? (
                <div className="editor-instance-wrapper" style={{ flex: 1, height: '100%', overflow: 'hidden' }} key={activeFile.uid}>
                    <Editor 
                        content={activeFile.content} 
                        fileName={activeFile.name} 
                        filePath={activeFile.path || activeFile.id} 
                        themeMode={settings.theme} 
                        fontSize={settings.font_size} 
                        onChange={fm.handleEditorChange} 
                        editorRef={fm.editorViewRef} 
                    />
                    {isMarkdown && <div className="markdown-preview-pane" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', borderLeft: '1px solid var(--border-color)', backgroundColor: 'var(--bg-editor)' }}><Preview content={activeFile.content} themeMode={settings.theme} /></div>}
                </div>
            ) : activeTab?.type === 'view' ? (
                <div className="custom-view-wrapper" style={{ 
                    flex: 1, 
                    height: '100%', 
                    backgroundColor: 'var(--bg-editor)',
                    color: 'var(--text-primary)'
                }}>
                    <ErrorBoundary>
                        {activeTab.component}
                    </ErrorBoundary>
                </div>
            ) : (
                <WelcomeScreen productName={productName} extraContent={welcomeExtra} />
            )}
        </div>
    );
};

export default WorkbenchMain;