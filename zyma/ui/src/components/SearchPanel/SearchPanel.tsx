import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Loader2, ChevronRight, ChevronDown, FileCode, Folder, List, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { pathUtils } from '../../utils/pathUtils';

interface SearchResult {
    path: string;
    line: number;
    content: string;
}

interface SearchTreeNode {
    name: string;
    fullPath: string;
    isDir: boolean;
    children: Record<string, SearchTreeNode>;
    matches?: SearchResult[];
}

interface SearchPanelProps {
    rootPath: string;
    onFileSelect: (path: string, name: string, line?: number) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ rootPath, onFileSelect }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchMode, setSearchMode] = useState<'content' | 'filename'>('filename');
    const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
    const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

    // 构建树形结构
    const treeData = useMemo(() => {
        const root: SearchTreeNode = { name: 'root', fullPath: rootPath, isDir: true, children: {} };
        
        results.forEach(res => {
            const relPath = res.path.startsWith(rootPath) 
                ? res.path.substring(rootPath.length).replace(/^[\/\\]+/, '') 
                : res.path;
            
            const parts = relPath.split(/[\/\\]+/);
            let current = root;
            
            parts.forEach((part, index) => {
                const isLast = index === parts.length - 1;
                const currentPath = res.path.split(part)[0] + part;

                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        fullPath: isLast ? res.path : currentPath,
                        isDir: !isLast,
                        children: {}
                    };
                }
                
                if (isLast) {
                    if (!current.children[part].matches) current.children[part].matches = [];
                    current.children[part].matches?.push(res);
                }
                current = current.children[part];
            });
        });
        return root;
    }, [results, rootPath]);

    // 按文件路径对结果进行分组 (用于列表模式)
    const groupedResults = useMemo(() => {
        const groups: Record<string, SearchResult[]> = {};
        results.forEach(res => {
            if (!groups[res.path]) groups[res.path] = [];
            groups[res.path].push(res);
        });
        return groups;
    }, [results]);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        setResults([]); 
        try {
            const data = await invoke<SearchResult[]>('search_in_dir', { 
                root: rootPath, 
                pattern: query,
                mode: searchMode 
            });
            setResults(data);
            
            const initialExpanded: Record<string, boolean> = {};
            data.forEach(r => {
                initialExpanded[r.path] = true;
                let currentPath = r.path;
                while (currentPath.length > rootPath.length) {
                    initialExpanded[currentPath] = true;
                    const lastSep = Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'));
                    if (lastSep <= 0) break;
                    currentPath = currentPath.substring(0, lastSep);
                }
            });
            setExpandedFiles(initialExpanded);
        } catch (e) {
            alert('Search failed: ' + String(e));
        } finally {
            setIsSearching(false);
        }
    }, [query, rootPath, searchMode]);

    const toggleExpand = (path: string) => {
        setExpandedFiles(prev => ({ ...prev, [path]: !prev[path] }));
    };

    // 模式切换时立即重新搜索
    React.useEffect(() => {
        if (query.trim() && !isSearching) {
            handleSearch();
        }
    }, [searchMode]);

    const renderTreeNodes = (nodes: Record<string, SearchTreeNode>, level: number) => {
        return Object.values(nodes)
            .sort((a, b) => {
                if (a.isDir !== b.isDir) return b.isDir ? 1 : -1;
                return a.name.localeCompare(b.name);
            })
            .map(node => {
                const isExpanded = expandedFiles[node.fullPath] || false;
                const hasMatches = node.matches && node.matches.length > 0;

                return (
                        <div key={node.fullPath} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div 
                            onClick={() => {
                                if (node.isDir || (hasMatches && searchMode === 'content')) {
                                    toggleExpand(node.fullPath);
                                } else {
                                    onFileSelect(node.fullPath, node.name);
                                }
                            }}
                            className="file-item-hover"
                            style={{ 
                                padding: `6px 12px 6px ${12 + level * 12}px`, 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: '8px',
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-sidebar)'
                            }}
                        >
                            {(node.isDir || (hasMatches && searchMode === 'content')) ? (
                                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                            ) : (
                                <div style={{ width: '16px' }} />
                            )}
                            {node.isDir ? <Folder size={16} style={{ color: 'var(--accent-color)' }} /> : <FileCode size={16} style={{ color: 'var(--accent-color)' }} />}
                            <span style={{ 
                                fontSize: 'var(--ui-font-size)', 
                                color: node.isDir ? 'var(--text-secondary)' : 'var(--text-primary)',
                                fontWeight: node.isDir ? 'normal' : '600'
                            }}>
                                {node.name}
                            </span>
                        </div>
                        
                        {isExpanded && node.isDir && renderTreeNodes(node.children, level + 1)}
                        
                        {isExpanded && !node.isDir && hasMatches && searchMode === 'content' && (
                            <div style={{ backgroundColor: 'var(--bg-editor-dim, var(--bg-editor))' }}>
                                {node.matches?.map((res, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => onFileSelect(res.path, node.name, res.line)}
                                        style={{ 
                                            padding: `6px 12px 6px ${44 + level * 12}px`, 
                                            cursor: 'pointer', 
                                            fontSize: 'var(--ui-font-size)', 
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px'
                                        }}
                                        className="file-item-hover"
                                    >
                                        <span style={{ 
                                            color: 'var(--text-secondary)', 
                                            minWidth: '32px', 
                                            textAlign: 'right',
                                            fontFamily: 'monospace',
                                            opacity: 0.7,
                                            userSelect: 'none'
                                        }}>{res.line}</span>
                                        <span style={{ 
                                            fontFamily: 'var(--editor-font-family, monospace)', 
                                            color: 'var(--text-primary)', 
                                            wordBreak: 'break-all',
                                            lineHeight: '1.5'
                                        }}>{res.content}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            });
    };

    return (
        <div style={{
            width: '100%', height: '100%', backgroundColor: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-color)', color: 'var(--text-primary)',
            display: 'flex', flexDirection: 'column', fontSize: 'var(--ui-font-size)'
        }}>
            <div style={{ padding: '10px', fontSize: 'calc(var(--ui-font-size) - 2px)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('Search')}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div 
                        onClick={() => setViewMode(viewMode === 'list' ? 'tree' : 'list')}
                        style={{ cursor: 'pointer', color: 'var(--accent-color)', display: 'flex', alignItems: 'center' }}
                        title={viewMode === 'list' ? t('SwitchToTree') : t('SwitchToList')}
                    >
                        {viewMode === 'list' ? <Network size={14} /> : <List size={14} />}
                    </div>
                    {results.length > 0 && <span style={{ cursor: 'pointer', color: 'var(--accent-color)' }} onClick={() => setResults([])}>{t('Clear')}</span>}
                </div>
            </div>

            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                    <input 
                        type="text"
                        placeholder={searchMode === 'content' ? t('SearchText') : t('SearchFilename')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        style={{
                            width: '100%', backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--input-border)', color: 'var(--text-primary)',
                            padding: '4px 8px', fontSize: 'var(--ui-font-size)', outline: 'none'
                        }}
                    />
                    {isSearching ? (
                        <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: '8px', top: '6px' }} />
                    ) : (
                        <Search size={14} style={{ position: 'absolute', right: '8px', top: '6px', cursor: 'pointer', opacity: 0.6 }} onClick={handleSearch} />
                    )}
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                    <div title={t('SearchFilenameMode')} style={{ padding: '2px 8px', cursor: 'pointer', borderRadius: '3px', backgroundColor: searchMode === 'filename' ? 'var(--accent-color)' : 'transparent', color: searchMode === 'filename' ? 'var(--accent-foreground)' : 'var(--text-secondary)', opacity: 1, display: 'flex', alignItems: 'center', fontSize: 'calc(var(--ui-font-size) - 1px)', fontWeight: 'bold' }} onClick={() => setSearchMode('filename')}>{t('ModeFile')}</div>
                    <div title={t('SearchContentMode')} style={{ padding: '2px 8px', cursor: 'pointer', borderRadius: '3px', backgroundColor: searchMode === 'content' ? 'var(--accent-color)' : 'transparent', color: searchMode === 'content' ? 'var(--accent-foreground)' : 'var(--text-secondary)', opacity: 1, display: 'flex', alignItems: 'center', fontSize: 'calc(var(--ui-font-size) - 1px)', fontWeight: 'bold' }} onClick={() => setSearchMode('content')}>{t('ModeText')}</div>
                </div>

                <div style={{ fontSize: 'calc(var(--ui-font-size) - 2px)', marginTop: '2px', opacity: 1, color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                    {results.length} {t('Results')}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {viewMode === 'tree' ? (
                    <div style={{ padding: '2px 0' }}>
                        {renderTreeNodes(treeData.children, 0)}
                    </div>
                ) : (
                    Object.keys(groupedResults).map((path) => {
                        const fileName = pathUtils.getFileName(path);
                        let displayPath = path;
                        if (path.startsWith(rootPath)) displayPath = path.substring(rootPath.length);
                        const cleanPath = displayPath.replace(fileName, '').replace(/^[\/\\]+/, '').replace(/[\/\\]+$/, '').split(/[\/\\]+/).filter(Boolean).join(' › ');
                        const isExpanded = expandedFiles[path];
                        const fileMatches = groupedResults[path];

                        return (
                            <div key={path} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-color)' }}>
                                <div onClick={() => { if (searchMode === 'filename') onFileSelect(path, fileName); else toggleExpand(path); }} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'var(--bg-sidebar)' }} className="file-item-hover">
                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        {searchMode === 'content' && (<span style={{ marginRight: '6px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>)}
                                        <FileCode size={16} style={{ color: 'var(--accent-color)', marginRight: '8px' }} />
                                        <span style={{ fontWeight: '600', fontSize: 'var(--ui-font-size)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</span>
                                        {fileMatches.length > 1 && (<span style={{ marginLeft: 'auto', fontSize: 'calc(var(--ui-font-size) - 2px)', padding: '1px 8px', borderRadius: '12px', backgroundColor: 'var(--active-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>{fileMatches.length}</span>)}
                                    </div>
                                    {cleanPath && (<div style={{ paddingLeft: searchMode === 'content' ? '30px' : '24px', fontSize: 'calc(var(--ui-font-size) - 1px)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cleanPath}</span></div>)}
                                </div>
                                {isExpanded && searchMode === 'content' && (<div style={{ backgroundColor: 'var(--bg-editor-dim, var(--bg-editor))' }}>{fileMatches.map((res, idx) => (<div key={idx} onClick={() => onFileSelect(res.path, fileName, res.line)} style={{ padding: '6px 12px 6px 42px', cursor: 'pointer', fontSize: 'var(--ui-font-size)', display: 'flex', alignItems: 'flex-start', gap: '12px' }} className="file-item-hover"><span style={{ color: 'var(--accent-color)', minWidth: '32px', textAlign: 'right', fontSize: 'calc(var(--ui-font-size) - 1px)', fontFamily: 'monospace', opacity: 0.8 }}>{res.line}</span><span style={{ fontFamily: 'var(--editor-font-family, monospace)', color: 'var(--text-primary)', wordBreak: 'break-all', lineHeight: '1.5' }}>{res.content}</span></div>))}</div>)}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default SearchPanel;