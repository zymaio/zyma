import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPartProps {
    content: string;
}

const MarkdownPart: React.FC<MarkdownPartProps> = ({ content }) => {
    return (
        <div style={{ backgroundColor: 'transparent', fontSize: 'inherit' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownPart;
