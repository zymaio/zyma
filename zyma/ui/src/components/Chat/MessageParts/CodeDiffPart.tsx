import React, { useState } from 'react';
import { Check, FileCode } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface CodeDiffPartProps {
    original: string;
    modified: string;
    language: string;
    path?: string;
}

const CodeDiffPart: React.FC<CodeDiffPartProps> = ({ original, modified, path }) => {
    const [applied, setApplied] = useState(false);

    const handleApply = async () => {
        if (!path) return;
        try {
            // 调用 Tauri 后端写文件接口
            await invoke('write_file', { path, content: modified });
            setApplied(true);
        } catch (e) {
            console.error("Apply failed", e);
            alert("Apply failed: " + e);
        }
    };

    return (
        <div style={{ 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px', 
            margin: '10px 0',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-secondary)'
        }}>
            <div style={{ 
                padding: '6px 10px', 
                backgroundColor: 'rgba(0,0,0,0.05)', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 'calc(var(--ui-font-size) - 1px)',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCode size={14} />
                    <span>{path || 'Suggested Changes'}</span>
                </div>
                {!applied ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={handleApply}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '4px',
                                background: 'var(--accent-color)', color: 'var(--accent-foreground)',
                                border: 'none', padding: '2px 8px', borderRadius: '4px',
                                cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            <Check size={12} /> Apply
                        </button>
                    </div>
                ) : (
                    <span style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                        <Check size={12} /> Applied
                    </span>
                )}
            </div>
            
            <div style={{ display: 'flex', maxHeight: '300px', overflowY: 'auto', fontSize: 'calc(var(--ui-font-size) - 1px)' }}>
                {/* 简化版 Diff 视图 */}
                <div style={{ flex: 1, borderRight: '1px solid var(--border-color)', padding: '8px', opacity: 0.6 }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Original</div>
                    <pre style={{ margin: 0 }}><code>{original}</code></pre>
                </div>
                <div style={{ flex: 1, padding: '8px' }}>
                    <div style={{ color: 'var(--accent-color)', marginBottom: '4px' }}>Modified</div>
                    <pre style={{ margin: 0 }}><code>{modified}</code></pre>
                </div>
            </div>
        </div>
    );
};

export default CodeDiffPart;
