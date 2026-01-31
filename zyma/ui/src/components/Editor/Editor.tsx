import React, { useEffect } from 'react';
import { useCodeMirror } from './useCodeMirror';
import { statusBar } from '../StatusBar/StatusBarRegistry';

interface EditorProps {
    content: string;
    fileName: string;
    filePath: string;
    themeMode: string;
    fontSize: number;
    onChange: (val: string) => void;
    editorRef?: React.MutableRefObject<any>;
}

const Editor: React.FC<EditorProps> = (props) => {
    const { editorRef, viewRef } = useCodeMirror({
        ...props,
        onCursorUpdate: (line, col) => {
            statusBar.setCursorPosition(line, col);
        }
    });

    useEffect(() => {
        if (props.editorRef) {
            props.editorRef.current = viewRef.current;
        }
    }, [viewRef.current]);

    // 处理搜索结果跳转
    useEffect(() => {
        const jump = (window as any).__pendingLineJump;
        if (viewRef.current && jump && jump.path === props.filePath) {
            // 给 CodeMirror 一点时间来完成文档解析和渲染
            const timer = setTimeout(() => {
                if (!viewRef.current) return;
                try {
                    const docLines = viewRef.current.state.doc.lines;
                    const targetLine = Math.min(Math.max(1, jump.line), docLines);
                    
                    const lineInfo = viewRef.current.state.doc.line(targetLine);
                    viewRef.current.dispatch({
                        selection: { anchor: lineInfo.from, head: lineInfo.from },
                        scrollIntoView: true
                    });
                    
                    // 只有成功定位后才删除
                    delete (window as any).__pendingLineJump;
                } catch (e) {
                    console.warn("Retrying jump to line:", jump.line);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [viewRef.current, props.filePath, props.content]); 

    return (
        <div 
            ref={editorRef} 
            className="editor-instance" 
            style={{ 
                height: '100%', 
                width: '100%', 
                fontSize: `calc(${props.fontSize}px * (var(--ui-font-size) / 13))`,
                backgroundColor: 'var(--bg-editor)'
            }} 
        />
    );
};

export default Editor;
