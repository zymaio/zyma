import React, { useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Loader2, FileCode, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchResult {
    path: string;
    line: number;
    content: string;
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
    const [searchMode, setSearchMode] = useState<'content' | 'filename'>('content');
    const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

    // 按文件路径对结果进行分组
    const groupedResults = useMemo(() => {
        const groups: Record<string, SearchResult[]> = {};
        results.forEach(res => {
            if (!groups[res.path]) groups[res.path] = [];
            groups[res.path].push(res);
        });
        return groups;
    }, [results]);

    const handleSearch = async () => {
        if (!query.trim()) return;
        let effectiveMode = searchMode;
        if (query.includes('*') && searchMode === 'content') {
            effectiveMode = 'filename';
            setSearchMode('filename');
        }
        setIsSearching(true);
        setResults([]); 
        try {
            const data = await invoke<SearchResult[]>('search_in_dir', { 
                root: rootPath, 
                pattern: query,
                mode: effectiveMode 
            });
            setResults(data);
            // 默认展开所有搜到的文件
            const initialExpanded: Record<string, boolean> = {};
            data.forEach(r => initialExpanded[r.path] = true);
            setExpandedFiles(initialExpanded);
        } catch (e) {
            alert('Search failed: ' + String(e));
        } finally {
            setIsSearching(false);
        }
    };

    const toggleFile = (path: string) => {
        setExpandedFiles(prev => ({ ...prev, [path]: !prev[path] }));
    };

    return (
        <div style={{
            width: '100%', height: '100%', backgroundColor: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-color)', color: 'var(--text-primary)',
            display: 'flex', flexDirection: 'column', fontSize: 'var(--ui-font-size)'
        }}>
            <div style={{ padding: '10px', fontSize: 'calc(var(--ui-font-size) - 2px)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('Search')}</span>
                {results.length > 0 && <span style={{ cursor: 'pointer', color: 'var(--accent-color)' }} onClick={() => setResults([])}>{t('Clear')}</span>}
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
                    <div title={t('SearchContentMode')} style={{ padding: '2px 6px', cursor: 'pointer', borderRadius: '3px', backgroundColor: searchMode === 'content' ? 'var(--accent-color)' : 'transparent', color: searchMode === 'content' ? '#fff' : 'inherit', opacity: searchMode === 'content' ? 1 : 0.6, display: 'flex', alignItems: 'center' }} onClick={() => setSearchMode('content')}><FileText size={14} /></div>
                    <div title={t('SearchFilenameMode')} style={{ padding: '2px 6px', cursor: 'pointer', borderRadius: '3px', backgroundColor: searchMode === 'filename' ? 'var(--accent-color)' : 'transparent', color: searchMode === 'filename' ? '#fff' : 'inherit', opacity: searchMode === 'filename' ? 1 : 0.6, display: 'flex', alignItems: 'center' }} onClick={() => setSearchMode('filename')}><FileCode size={14} /></div>
                </div>

                <div style={{ fontSize: 'calc(var(--ui-font-size) - 2px)', marginTop: '2px', opacity: 0.6 }}>
                    {results.length} {t('Results')}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {Object.keys(groupedResults).map((path) => {
                    const fileName = path.split(/[\\/]/).pop() || 'file';
                    const isExpanded = expandedFiles[path];
                    const fileMatches = groupedResults[path];

                    return (
                        <div key={path} style={{ display: 'flex', flexDirection: 'column' }}>
                            <div 
                                onClick={() => toggleFile(path)}
                                style={{ padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', backgroundColor: 'rgba(128,128,128,0.05)' }}
                                className="file-item-hover"
                            >
                                {isExpanded ? <ChevronDown size={14} style={{ marginRight: '4px', opacity: 0.6 }} /> : <ChevronRight size={14} style={{ marginRight: '4px', opacity: 0.6 }} />}
                                <FileCode size={14} style={{ marginRight: '6px', color: 'var(--accent-color)' }} />
                                <span style={{ fontWeight: 'bold', fontSize: 'calc(var(--ui-font-size) - 1px)' }}>{fileName}</span>
                                <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.4 }}>{fileMatches.length}</span>
                            </div>
                            
                            {isExpanded && fileMatches.map((res, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => onFileSelect(res.path, fileName, res.line)}
                                    style={{ padding: '4px 10px 4px 34px', cursor: 'pointer', fontSize: 'calc(var(--ui-font-size) - 2px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.8 }}
                                    className="file-item-hover"
                                >
                                    <span style={{ color: 'var(--accent-color)', marginRight: '8px' }}>{res.line}:</span>
                                    <span style={{ fontFamily: 'monospace' }}>{res.content}</span>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SearchPanel;
