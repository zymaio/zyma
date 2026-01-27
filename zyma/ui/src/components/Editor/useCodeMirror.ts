import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

export function useCodeMirror(props: {
    content: string,
    fileName: string,
    onChange: (val: string) => void,
    onCursorUpdate?: (line: number, col: number) => void
}) {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const getLanguage = (name: string) => {
        const ext = name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'py': return python();
            case 'rs': return rust();
            case 'js': case 'ts': case 'tsx': return javascript();
            case 'json': return json();
            case 'md': return markdown();
            default: return [];
        }
    };

    useEffect(() => {
        if (!editorRef.current) return;

        const state = EditorState.create({
            doc: props.content,
            extensions: [
                basicSetup,
                oneDark,
                getLanguage(props.fileName),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        props.onChange(update.state.doc.toString());
                    }
                    if (update.selectionSet && props.onCursorUpdate) {
                        const pos = update.state.selection.main.head;
                        const line = update.state.doc.lineAt(pos);
                        props.onCursorUpdate(line.number, pos - line.from + 1);
                    }
                }),
            ],
        });

        const view = new EditorView({
            state,
            parent: editorRef.current,
        });

        viewRef.current = view;
        return () => view.destroy();
    }, [props.fileName]); // 仅在切换文件时重建实例

    return { editorRef, viewRef };
}
