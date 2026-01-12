import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchResult {
    path: string;
    line: number;
    content: string;
}

interface SearchPanelProps {
    rootPath: string;
    onFileSelect: (path: string, name: string) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ rootPath, onFileSelect }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        try {
            const data = await invoke<SearchResult[]>('search_in_dir', { 
                root: rootPath, 
                pattern: query 
            });
            setResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div style={{
            width: '250px', height: '100%', backgroundColor: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-color)', color: 'var(--text-primary)',
            display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ padding: '10px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                {t('Search')}
            </div>

            <div style={{ padding: '10px' }}>
                <div style={{ position: 'relative' }}>
                    <input 
                        type="text"
                        placeholder={`${t('Search')}...`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        style={{
                            width: '100%', backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--input-border)', color: 'var(--text-primary)',
                            padding: '4px 8px', fontSize: '13px', outline: 'none'
                        }}
                    />
                    {isSearching ? (
                        <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: '8px', top: '6px' }} />
                    ) : (
                        <Search size={14} style={{ position: 'absolute', right: '8px', top: '6px', cursor: 'pointer', opacity: 0.6 }} onClick={handleSearch} />
                    )}
                </div>
                <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.6 }}>
                    {results.length} results
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {results.map((res, idx) => (
                    <div 
                        key={idx} className="file-item-hover"
                        onClick={() => onFileSelect(res.path, res.path.split(/[\\/]/).pop() || 'file')}
                        style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                    >
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '3px' }}>
                            {res.path.split(/[\\/]/).pop()}
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Line {res.line}: {res.content}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SearchPanel;