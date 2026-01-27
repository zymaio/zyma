import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown.css';

interface PreviewProps {
    content: string;
    themeMode: 'dark' | 'light' | 'abyss';
}

const Preview: React.FC<PreviewProps> = ({ content, themeMode }) => {
  const isDark = themeMode === 'dark' || themeMode === 'abyss';
  
  return (
    <div 
        data-theme={isDark ? 'dark' : 'light'}
        style={{
            flex: 1,
            height: '100%',
            overflowY: 'auto',
            padding: '20px',
            backgroundColor: themeMode === 'abyss' ? '#000c18' : 'var(--bg-editor)',
            color: 'var(--text-primary)'
        }}
    >
      <div 
        className="markdown-body" 
        style={{ 
            backgroundColor: 'transparent', 
            fontSize: '14px'
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default Preview;