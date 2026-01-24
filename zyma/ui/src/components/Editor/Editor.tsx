import React, { useMemo, useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { githubLight } from '@uiw/codemirror-theme-github';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { search } from '@codemirror/search';
import { defaultKeymap } from '@codemirror/commands';
import { keymap } from '@codemirror/view';

// --- 手动增强色彩方案 ---
const richHighlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: "#bb9af7", fontWeight: "bold" },
    { tag: t.operator, color: "#89ddff" },
    { tag: t.variableName, color: "#e0afaf" },
    { tag: t.definition(t.variableName), color: "#bb9af7" },
    { tag: t.propertyName, color: "#7aa2f7" },
    { tag: t.function(t.variableName), color: "#7de374" },
    { tag: t.typeName, color: "#0db9d7" },
    { tag: t.string, color: "#e9e97a" },
    { tag: t.number, color: "#ff9e64" },
    { tag: t.bool, color: "#ff9e64" },
    { tag: t.comment, color: "#565f89", fontStyle: "italic" },
]);

interface EditorProps {
    content: string;
    fileName: string;
    themeMode: 'dark' | 'light';
    fontSize?: number;
    onChange?: (val: string) => void;
    onCursorUpdate?: (line: number, col: number) => void;
    editorRef?: React.MutableRefObject<EditorView | null>;
}

// 语言包映射表：改为返回 Promise 的动态导入
const LANGUAGE_LOADERS: Record<string, () => Promise<any>> = {
    'js': () => import('@codemirror/lang-javascript').then(m => m.javascript()),
    'jsx': () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true })),
    'ts': () => import('@codemirror/lang-javascript').then(m => m.javascript({ typescript: true })),
    'tsx': () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true, typescript: true })),
    'rs': () => import('@codemirror/lang-rust').then(m => m.rust()),
    'py': () => import('@codemirror/lang-python').then(m => m.python()),
    'md': () => import('@codemirror/lang-markdown').then(m => m.markdown()),
    'html': () => import('@codemirror/lang-html').then(m => m.html()),
    'css': () => import('@codemirror/lang-css').then(m => m.css()),
    'scss': () => import('@codemirror/lang-sass').then(m => m.sass()),
    'sass': () => import('@codemirror/lang-sass').then(m => m.sass()),
    'cpp': () => import('@codemirror/lang-cpp').then(m => m.cpp()),
    'hpp': () => import('@codemirror/lang-cpp').then(m => m.cpp()),
    'c': () => import('@codemirror/lang-cpp').then(m => m.cpp()),
    'h': () => import('@codemirror/lang-cpp').then(m => m.cpp()),
    'cs': () => import('@codemirror/lang-cpp').then(m => m.cpp()),
    'json': () => import('@codemirror/lang-json').then(m => m.json()),
    'java': () => import('@codemirror/lang-java').then(m => m.java()),
    'yaml': () => import('@codemirror/lang-yaml').then(m => m.yaml()),
    'yml': () => import('@codemirror/lang-yaml').then(m => m.yaml()),
    'toml': () => import('@codemirror/lang-rust').then(m => m.rust()),
    'php': () => import('@codemirror/lang-php').then(m => m.php()),
    'go': () => import('@codemirror/lang-go').then(m => m.go()),
    'sql': () => import('@codemirror/lang-sql').then(m => m.sql()),
    'xml': () => import('@codemirror/lang-xml').then(m => m.xml()),
    'svg': () => import('@codemirror/lang-xml').then(m => m.xml()),
    'vue': () => import('@codemirror/lang-vue').then(m => m.vue()),
};

const Editor: React.FC<EditorProps> = ({ content, fileName, themeMode, fontSize = 14, onChange, onCursorUpdate, editorRef }) => {
  const [langExtension, setLangExtension] = useState<any>(null);

  // 异步加载语言包
  useEffect(() => {
    let ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (fileName.toLowerCase() === 'cargo.lock') ext = 'toml';
    
    const loader = LANGUAGE_LOADERS[ext];
    if (loader) {
        loader().then(setLangExtension).catch(err => {
            console.error(`Failed to load language for ${ext}:`, err);
            setLangExtension(null);
        });
    } else {
        setLangExtension(null);
    }
  }, [fileName]);

  const extensions = useMemo(() => {
    const exts: any[] = [
        EditorView.lineWrapping,
        search({ createPanel: () => ({ dom: document.createElement('div') }) }),
        keymap.of(defaultKeymap.filter(k => k.key !== 'Mod-f')),
        EditorView.updateListener.of((update) => {
            if (update.selectionSet && onCursorUpdate) {
                const pos = update.state.selection.main.head;
                const line = update.state.doc.lineAt(pos);
                onCursorUpdate(line.number, pos - line.from + 1);
            }
        }),
        EditorView.theme({
            "&": { height: "100%" },
            ".cm-scroller": { fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace" },
            ".cm-content": { padding: "10px 0" },
            ".cm-gutters": { 
                border: "none", 
                backgroundColor: "transparent",
                color: themeMode === 'dark' ? '#565f89' : '#999'
            },
            ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.03)" }
        })
    ];

    if (themeMode === 'dark') {
        exts.push(syntaxHighlighting(richHighlightStyle));
    }

    if (langExtension) {
        exts.push(langExtension);
    }

    return exts;
  }, [langExtension, themeMode, onCursorUpdate]);

  return (
    <div style={{
      flex: 1,
      height: '100%',
      backgroundColor: themeMode === 'dark' ? '#1a1b26' : '#ffffff',
      overflow: 'hidden'
    }}>
      <CodeMirror
        value={content}
        height="100%"
        onCreateEditor={(view) => {
            if (editorRef) editorRef.current = view;
        }}
        theme={themeMode === 'dark' ? tokyoNight : githubLight}
        extensions={extensions}
        onChange={onChange}
        basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
        }}
        style={{ fontSize: `${fontSize}px`, height: '100%' }}
      />
    </div>
  );
};

export default Editor;