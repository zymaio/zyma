import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { githubLight } from '@uiw/codemirror-theme-github';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';

// 导入语言包
import { javascript } from '@codemirror/lang-javascript';
import { rust } from '@codemirror/lang-rust';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { cpp } from '@codemirror/lang-cpp';
import { json } from '@codemirror/lang-json';
import { java } from '@codemirror/lang-java';
import { yaml } from '@codemirror/lang-yaml';
import { php } from '@codemirror/lang-php';
import { go } from '@codemirror/lang-go';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { sass } from '@codemirror/lang-sass';
import { vue } from '@codemirror/lang-vue';

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
}

const LANGUAGE_MAP: Record<string, () => any> = {
    'js': () => javascript(),
    'jsx': () => javascript({ jsx: true }),
    'ts': () => javascript({ typescript: true }),
    'tsx': () => javascript({ jsx: true, typescript: true }),
    'rs': () => rust(),
    'py': () => python(),
    'md': () => markdown(),
    'html': () => html(),
    'css': () => css(),
    'scss': () => sass(),
    'sass': () => sass(),
    'cpp': () => cpp(),
    'hpp': () => cpp(),
    'c': () => cpp(),
    'h': () => cpp(),
    'cs': () => cpp(),
    'json': () => json(),
    'java': () => java(),
    'yaml': () => yaml(),
    'yml': () => yaml(),
    'toml': () => rust(),
    'php': () => php(),
    'go': () => go(),
    'sql': () => sql(),
    'xml': () => xml(),
    'vue': () => vue(),
};

const Editor: React.FC<EditorProps> = ({ content, fileName, themeMode, fontSize = 14, onChange }) => {
  const extensions = useMemo(() => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    
    const exts: any[] = [
        EditorView.lineWrapping,
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

    try {
        const langFunc = LANGUAGE_MAP[ext];
        if (langFunc) {
            const langExt = langFunc();
            if (langExt) {
                exts.push(langExt);
            }
        }
    } catch (e) {
        console.error(`Failed to load language extension for ${ext}:`, e);
    }

    return exts;
  }, [fileName, themeMode]);

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