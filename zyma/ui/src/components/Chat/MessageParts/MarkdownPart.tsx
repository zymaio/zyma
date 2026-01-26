import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown-light.css';

interface MarkdownPartProps {
    content: string;
}

const MarkdownPart: React.FC<MarkdownPartProps> = ({ content }) => {
    return (
        <div className="markdown-body" style={{ backgroundColor: 'transparent', fontSize: '13px' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownPart;
