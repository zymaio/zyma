import React, { useEffect } from 'react';
import { useCodeMirror } from './useCodeMirror';
import { statusBar } from '../StatusBar/StatusBarRegistry';

interface EditorProps {
    content: string;
    fileName: string;
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
