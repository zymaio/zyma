import React, { useEffect } from 'react';
import { useCodeMirror } from './useCodeMirror';

interface EditorProps {
    content: string;
    fileName: string;
    themeMode: string;
    fontSize: number;
    onChange: (val: string) => void;
    onCursorUpdate?: (line: number, col: number) => void;
    editorRef?: React.MutableRefObject<any>;
}

const Editor: React.FC<EditorProps> = (props) => {
    const { editorRef, viewRef } = useCodeMirror(props);

    // 将内部 view 暴露给外部 ref (用于搜索/命令调用)
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
                fontSize: `${props.fontSize}px`,
                backgroundColor: 'var(--bg-editor)'
            }} 
        />
    );
};

export default Editor;
