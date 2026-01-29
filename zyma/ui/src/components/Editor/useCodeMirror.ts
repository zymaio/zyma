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
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const zymaHighlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: "var(--syn-keyword)" },
    { tag: t.operator, color: "var(--syn-operator)" },
    { tag: t.string, color: "var(--syn-string)" },
    { tag: t.comment, color: "var(--syn-comment)", fontStyle: "italic" },
    { tag: t.variableName, color: "var(--syn-variable)" },
    { tag: t.number, color: "var(--syn-number)" },
    { tag: t.typeName, color: "var(--syn-type)" },
    { tag: t.className, color: "var(--syn-className)" },
    { tag: t.atom, color: "var(--syn-builtin)" },
    { tag: t.tagName, color: "var(--syn-tag)" },
    { tag: t.attributeName, color: "var(--syn-attr)" },
    { tag: t.regexp, color: "var(--syn-regex)" },
    
    // Markdown 增强
    { tag: t.heading, color: "var(--syn-md-heading)", fontWeight: "bold" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strong, color: "var(--syn-md-bold)", fontWeight: "bold" },
    { tag: t.link, color: "var(--syn-md-link)", textDecoration: "underline" },
    { tag: t.url, color: "var(--syn-md-link)" },
    { tag: t.list, color: "var(--syn-keyword)" },
    { tag: t.quote, color: "var(--syn-string)", fontStyle: "italic" },
].filter(rule => rule.tag !== undefined));

export function useCodeMirror(props: {
    content: string,
    fileName: string,
    themeMode: string,
    onChange: (val: string) => void,
    onCursorUpdate?: (line: number, col: number) => void
}) {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    
    // 使用 Refs 解决闭包陷阱，确保监听器永远调用最新的回调
    const onChangeRef = useRef(props.onChange);
    const onCursorUpdateRef = useRef(props.onCursorUpdate);
    
    useEffect(() => { onChangeRef.current = props.onChange; }, [props.onChange]);
    useEffect(() => { onCursorUpdateRef.current = props.onCursorUpdate; }, [props.onCursorUpdate]);

    const getLanguage = (name: string) => {
        const lower = name.toLowerCase();
        const ext = lower.split('.').pop();
        switch (ext) {
            case 'py': return python();
            case 'rs': return rust();
            case 'js': case 'jsx': return javascript();
            case 'ts': case 'tsx': return javascript({ typescript: true });
            case 'json': return json();
            case 'md': return markdown(); // 保持简单调用，但确保样式已定义
            case 'cpp': case 'c': case 'h': case 'hpp': return cpp();
            case 'html': case 'htm': return html();
            case 'css': return css();
            case 'xml': case 'svg': return xml();
            case 'yaml': case 'yml': case 'toml': case 'ini': case 'cargo.lock': return yaml();
            case 'sql': return sql();
            default: return [];
        }
    };

    useEffect(() => {
        if (!editorRef.current) return;

        const state = EditorState.create({
            doc: props.content,
            extensions: [
                basicSetup,
                syntaxHighlighting(zymaHighlightStyle),
                getLanguage(props.fileName),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChangeRef.current(update.state.doc.toString());
                    }
                    if (update.selectionSet && onCursorUpdateRef.current) {
                        const pos = update.state.selection.main.head;
                        const line = update.state.doc.lineAt(pos);
                        onCursorUpdateRef.current(line.number, pos - line.from + 1);
                    }
                }),
                EditorView.theme({
                    "&": { 
                        height: "100%", 
                        fontSize: "inherit",
                        backgroundColor: "var(--bg-editor)",
                        color: "var(--text-primary)"
                    },
                    "&.cm-focused": { outline: "none" },
                    ".cm-content": {
                        caretColor: "var(--cursor-color, var(--accent-color))",
                        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
                        padding: "10px 0"
                    },
                    ".cm-line": {
                        padding: "0 12px",
                        lineHeight: "1.6" 
                    },
                    ".cm-cursor, .cm-dropCursor": { 
                        borderLeft: "2px solid var(--cursor-color, var(--accent-color)) !important",
                        marginLeft: "-1px"
                    },
                    "&.cm-focused .cm-cursor": { borderLeft: "2px solid var(--cursor-color, var(--accent-color)) !important" },
                    ".cm-gutters": { 
                        backgroundColor: "var(--bg-editor)",
                        border: "none",
                        borderRight: "1px solid var(--border-color)",
                        color: "var(--text-secondary)",
                        minWidth: "45px"
                    },
                    ".cm-activeLine": { backgroundColor: "var(--bg-active-line)" },
                    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--accent-color)" },
                    ".cm-selectionBackground, ::selection": { backgroundColor: "var(--accent-color) !important", opacity: "0.25" }
                })
            ],
        });

        if (viewRef.current) viewRef.current.destroy();
        const view = new EditorView({ state, parent: editorRef.current });
        viewRef.current = view;
        return () => view.destroy();
    }, [props.fileName, props.themeMode]); // 内容变化不重建 View，靠下面的 dispatch 同步

    useEffect(() => {
        if (viewRef.current && props.content !== viewRef.current.state.doc.toString()) {
            viewRef.current.dispatch({
                changes: { from: 0, to: viewRef.current.state.doc.length, insert: props.content }
            });
        }
    }, [props.content]);

    return { editorRef, viewRef };
}
