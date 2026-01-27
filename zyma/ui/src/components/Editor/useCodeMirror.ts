import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { cpp } from '@codemirror/lang-cpp';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

export function useCodeMirror(props: {
    content: string,
    fileName: string,
    themeMode: string,
    onChange: (val: string) => void,
    onCursorUpdate?: (line: number, col: number) => void
}) {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const getLanguage = (name: string) => {
        const lower = name.toLowerCase();
        const ext = lower.split('.').pop();

        // 通用扩展名匹配
        switch (ext) {
            case 'py': return python();
            case 'rs': return rust();
            case 'js': case 'jsx': return javascript();
            case 'ts': case 'tsx': return javascript({ typescript: true });
            case 'json': return json();
            case 'md': return markdown();
            case 'cpp': case 'c': case 'h': case 'hpp': return cpp();
            case 'html': case 'htm': return html();
            case 'css': return css();
            case 'xml': case 'svg': return xml(); // SVG 采用 XML 高亮
            case 'yaml': case 'yml': case 'toml': case 'ini': case 'cargo.lock': return yaml();
            case 'sql': return sql();
            default: return [];
        }
    };

    useEffect(() => {
        if (!editorRef.current) return;

        // 根据 themeMode 选择基础配色扩展
        const themeExtensions = [];
        if (props.themeMode !== 'light') {
            themeExtensions.push(oneDark);
        }

        const state = EditorState.create({
            doc: props.content,
            extensions: [
                basicSetup,
                ...themeExtensions,
                getLanguage(props.fileName),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) props.onChange(update.state.doc.toString());
                    if (update.selectionSet && props.onCursorUpdate) {
                        const pos = update.state.selection.main.head;
                        const line = update.state.doc.lineAt(pos);
                        props.onCursorUpdate(line.number, pos - line.from + 1);
                    }
                }),
                // 使用 CSS 变量，彻底解决主题同步问题
                EditorView.theme({
                    "&": { 
                        height: "100%", 
                        fontSize: "inherit",
                        backgroundColor: "var(--bg-editor)",
                        color: "var(--text-primary)"
                    },
                    "&.cm-focused": { outline: "none" },
                    ".cm-content": {
                        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
                        padding: "10px 0"
                    },
                    ".cm-line": {
                        padding: "0 12px",
                        lineHeight: "1.6" 
                    },
                    ".cm-gutters": { 
                        backgroundColor: "var(--bg-editor)",
                        border: "none",
                        borderRight: "1px solid var(--border-color)",
                        color: "var(--text-secondary)",
                        minWidth: "45px"
                    },
                    ".cm-activeLine": { backgroundColor: "var(--active-bg)" },
                    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--accent-color)" },
                    ".cm-selectionBackground, ::selection": { backgroundColor: "var(--accent-color) !important", opacity: "0.3" }
                })
            ],
        });

        if (viewRef.current) viewRef.current.destroy();
        const view = new EditorView({ state, parent: editorRef.current });
        viewRef.current = view;
        return () => view.destroy();
    }, [props.fileName, props.themeMode]); // 当文件名或主题模式变化时重新初始化

    // 处理外部内容更新 (如 AI 写入)
    useEffect(() => {
        if (viewRef.current && props.content !== viewRef.current.state.doc.toString()) {
            viewRef.current.dispatch({
                changes: { from: 0, to: viewRef.current.state.doc.length, insert: props.content }
            });
        }
    }, [props.content]);

    return { editorRef, viewRef };
}