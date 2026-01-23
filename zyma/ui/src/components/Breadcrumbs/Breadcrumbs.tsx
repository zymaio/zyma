import React from 'react';
import { ChevronRight, FileCode } from 'lucide-react';

interface BreadcrumbsProps {
    path: string | null;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ path }) => {
    if (!path) return <div style={{ height: '22px', backgroundColor: 'var(--bg-dark)' }}></div>;

    // 处理 Windows 和 Unix 路径
    const parts = path.split(/[\/]/).filter(p => p.length > 0);
    const fileName = parts.pop();

    return (
        <div style={{
            height: '22px',
            backgroundColor: 'var(--bg-dark)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: 'calc(var(--ui-font-size) - 1px)',
            color: 'var(--text-secondary)',
            borderBottom: '1px solid var(--border-color)',
            userSelect: 'none'
        }}>
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    <span style={{ cursor: 'pointer' }} className="breadcrumb-item">{part}</span>
                    <ChevronRight size={14} style={{ margin: '0 4px', opacity: 0.5 }} />
                </React.Fragment>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>
                <FileCode size={14} style={{ marginRight: '6px', color: 'var(--accent-color)' }} />
                <span>{fileName}</span>
            </div>
        </div>
    );
};

export default Breadcrumbs;
