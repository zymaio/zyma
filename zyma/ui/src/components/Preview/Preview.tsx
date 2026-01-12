import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown.css';

interface PreviewProps {
    content: string;
    themeMode: 'dark' | 'light';
}

const Preview: React.FC<PreviewProps> = ({ content, themeMode }) => {
  return (
    <div 
        style={{
            flex: 1,
            height: '100%',
            overflowY: 'auto',
            padding: '20px',
            backgroundColor: 'var(--preview-bg)',
            borderLeft: '1px solid var(--border-color)',
            color: 'var(--preview-color)'
        }}
    >
      <div 
        className={`markdown-body ${themeMode === 'dark' ? 'markdown-body-dark' : ''}`} 
        style={{ 
            backgroundColor: 'transparent', 
            fontSize: '14px',
            color: 'var(--preview-color)' 
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