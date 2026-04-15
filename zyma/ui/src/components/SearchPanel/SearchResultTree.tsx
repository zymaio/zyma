import React from 'react';
import { ChevronRight, ChevronDown, FileCode, Folder } from 'lucide-react';
import type { SearchTreeNode, SearchResult } from './useSearch';

interface SearchResultTreeProps {
    nodes: Record<string, SearchTreeNode>;
    level: number;
    expandedFiles: Record<string, boolean>;
    onToggleExpand: (path: string) => void;
    onFileSelect: (path: string, name: string, line?: number) => Promise<void>;
    iconSizeSm: number;
}

export const SearchResultTree: React.FC<SearchResultTreeProps> = ({
    nodes,
    level,
    expandedFiles,
    onToggleExpand,
    onFileSelect,
    iconSizeSm
}) => {
    return (
        <>
            {Object.values(nodes)
                .sort((a, b) => {
                    if (a.isDir !== b.isDir) return b.isDir ? -1 : 1;
                    return a.name.localeCompare(b.name);
                })
                .map(node => {
                    const isExpanded = expandedFiles[node.fullPath] || false;
                    const hasMatches = node.matches && node.matches.length > 0;

                    return (
                        <div key={node.fullPath} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div
                                onClick={() => node.isDir || hasMatches ? onToggleExpand(node.fullPath) : onFileSelect(node.fullPath, node.name)}
                                className="file-item-hover"
                                style={{
                                    padding: `4px 8px 4px ${8 + level * 12}px`,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                {(node.isDir || hasMatches) ? (
                                    isExpanded ? <ChevronDown size={iconSizeSm} /> : <ChevronRight size={iconSizeSm} />
                                ) : <div style={{ width: iconSizeSm }} />}

                                {node.isDir ? (
                                    <Folder size={16} style={{ color: 'var(--accent-color)', opacity: 0.8 }} />
                                ) : (
                                    <FileCode size={16} style={{ color: 'var(--accent-color)' }} />
                                )}

                                <span style={{
                                    fontWeight: node.isDir ? 'normal' : '600', 
                                    flex: 1,
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    opacity: node.isDir ? 0.8 : 1
                                }}>
                                    {node.name}
                                </span>
                                {hasMatches && (
                                    <span style={{ opacity: 0.5, fontSize: '11px' }}>
                                        {node.matches?.length}
                                    </span>
                                )}
                            </div>

                            {isExpanded && node.isDir && (
                                <SearchResultTree
                                    nodes={node.children}
                                    level={level + 1}
                                    expandedFiles={expandedFiles}
                                    onToggleExpand={onToggleExpand}
                                    onFileSelect={onFileSelect}
                                    iconSizeSm={iconSizeSm}
                                />
                            )}

                            {isExpanded && hasMatches && (
                                <div style={{ marginBottom: '4px' }}>
                                    {node.matches?.map((res, idx) => (
                                        <SearchResultItem
                                            key={idx}
                                            result={res}
                                            fileName={node.name}
                                            level={level}
                                            onFileSelect={onFileSelect}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
        </>
    );
};

interface SearchResultItemProps {
    result: SearchResult;
    fileName: string;
    level: number;
    onFileSelect: (path: string, name: string, line?: number) => Promise<void>;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
    result,
    fileName,
    level,
    onFileSelect
}) => (
    <div 
        onClick={() => onFileSelect(result.path, fileName, result.line)} 
        className="file-item-hover" 
        style={{
            padding: `3px 8px 3px ${32 + level * 12}px`, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px'
        }}
    >
        <span style={{ 
            minWidth: '24px', 
            textAlign: 'right', 
            fontSize: '11px', 
            fontFamily: 'monospace', 
            opacity: 0.5, 
            userSelect: 'none', 
            paddingTop: '2px' 
        }}>
            {result.line}
        </span>
        <span style={{ 
            fontFamily: 'var(--editor-font-family, monospace)', 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-all', 
            lineHeight: '1.4', 
            fontSize: 'calc(var(--ui-font-size) - 1px)' 
        }}>
            {result.content}
        </span>
    </div>
);
