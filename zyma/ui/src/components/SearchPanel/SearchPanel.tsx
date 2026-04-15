import React, { useState, useEffect, useCallback } from 'react';
import {
    ChevronRight, ChevronDown, FileCode,
    X, RefreshCw, Layers,
    CaseSensitive, WholeWord, Regex, MoreHorizontal, List, Network
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../core/WorkbenchContext';
import { useSearch } from './useSearch';
import { SearchOptionBtn } from './SearchOptionBtn';
import { SearchResultTree } from './SearchResultTree';
import { pathUtils } from '../../utils/pathUtils';

interface SearchPanelProps {}

const SearchPanel: React.FC<SearchPanelProps> = () => {
    const { t } = useTranslation();
    const { settings, rootPath, fm } = useWorkbench();
    const onFileSelect = fm.handleFileSelect;

    // --- 动态尺寸计算 ---
    const uiSize = settings?.ui_font_size || 13;
    const iconSizeSm = uiSize + 1;
    const iconSizeMd = uiSize + 3;

    // --- 状态管理 ---
    const [query, setQuery] = useState('');
    const [replaceQuery, setReplaceQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [includePattern, setIncludePattern] = useState('');
    const [excludePattern, setExcludePattern] = useState('');
    const [showReplace, setShowReplace] = useState(false);

    const {
        isSearching,
        groupedResults,
        treeData,
        resultStats,
        handleSearch,
        toggleExpand,
        collapseAll,
        clearResults,
        expandedFiles,
        setExpandedFiles
    } = useSearch(rootPath);

    // --- 自动搜索 ---
    useEffect(() => {
        if (query) {
            handleSearch({
                query,
                caseSensitive,
                wholeWord,
                useRegex,
                includePattern,
                excludePattern
            });
        }
    }, [caseSensitive, wholeWord, useRegex]);

    const handleSearchClick = useCallback(() => {
        if (query.trim()) {
            handleSearch({
                query,
                caseSensitive,
                wholeWord,
                useRegex,
                includePattern,
                excludePattern
            });
        } else {
            clearResults();
        }
    }, [query, caseSensitive, wholeWord, useRegex, includePattern, excludePattern, handleSearch, clearResults]);

    return (
        <div style={{
            width: '100%', height: '100%', backgroundColor: 'var(--bg-sidebar)',
            display: 'flex', flexDirection: 'column', fontSize: 'var(--ui-font-size)', color: 'var(--text-primary)', fontFamily: 'inherit'
        }}>
            {/* Header Toolbar */}
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.8 }}>
                <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: 'calc(var(--ui-font-size) - 2px)', letterSpacing: '0.5px' }}>
                    {t('Search')}
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div
                        onClick={() => setViewMode(viewMode === 'list' ? 'tree' : 'list')}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title={viewMode === 'list' ? "切换到树形视图" : "切换到列表视图"}
                    >
                        {viewMode === 'list' ? <Network size={iconSizeSm} /> : <List size={iconSizeSm} />}
                    </div>
                    <RefreshCw 
                        size={iconSizeSm} 
                        className={`cursor-pointer ${isSearching ? 'animate-spin' : ''}`} 
                        onClick={handleSearchClick} 
                    />
                    <div title="折叠全部" style={{ display: 'flex', alignItems: 'center' }}>
                        <Layers size={iconSizeSm} className="cursor-pointer" onClick={collapseAll} />
                    </div>
                    <X size={iconSizeSm} className="cursor-pointer" onClick={() => { setQuery(''); clearResults(); }} />
                </div>
            </div>

            {/* Input Section */}
            <div style={{ padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <div onClick={() => setShowReplace(!showReplace)} style={{ padding: '6px 0', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        {showReplace ? <ChevronDown size={iconSizeMd} /> : <ChevronRight size={iconSizeMd} />}
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input 
                            value={query} 
                            onChange={(e) => setQuery(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()} 
                            placeholder="搜索" 
                            style={{
                                width: '100%', 
                                backgroundColor: 'var(--input-bg)', 
                                color: 'var(--text-primary)', 
                                border: '1px solid var(--input-border)', 
                                padding: `4px ${iconSizeMd * 3 + 12}px 4px 8px`, 
                                outline: 'none', 
                                fontSize: 'var(--ui-font-size)', 
                                fontFamily: 'inherit'
                            }} 
                        />
                        <div style={{ position: 'absolute', right: '4px', top: '4px', display: 'flex', gap: '2px' }}>
                            <SearchOptionBtn 
                                active={caseSensitive} 
                                onClick={() => setCaseSensitive(!caseSensitive)} 
                                icon={CaseSensitive} 
                                title="区分大小写"
                                iconSize={iconSizeSm}
                            />
                            <SearchOptionBtn 
                                active={wholeWord} 
                                onClick={() => setWholeWord(!wholeWord)} 
                                icon={WholeWord} 
                                title="全字匹配"
                                iconSize={iconSizeSm}
                            />
                            <SearchOptionBtn 
                                active={useRegex} 
                                onClick={() => setUseRegex(!useRegex)} 
                                icon={Regex} 
                                title="使用正则表达式"
                                iconSize={iconSizeSm}
                            />
                        </div>
                    </div>
                </div>

                {showReplace && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '20px' }}>
                        <input 
                            value={replaceQuery} 
                            onChange={(e) => setReplaceQuery(e.target.value)} 
                            placeholder="替换" 
                            style={{
                                flex: 1, 
                                backgroundColor: 'var(--input-bg)', 
                                color: 'var(--text-primary)', 
                                border: '1px solid var(--input-border)', 
                                padding: '4px 8px', 
                                outline: 'none', 
                                fontSize: 'var(--ui-font-size)', 
                                opacity: 0.7, 
                                fontFamily: 'inherit'
                            }} 
                        />
                    </div>
                )}

                <div 
                    onClick={() => setShowDetails(!showDetails)} 
                    style={{ 
                        fontSize: 'calc(var(--ui-font-size) - 2px)', 
                        color: 'var(--text-muted)', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        marginTop: '2px' 
                    }}
                >
                    <MoreHorizontal size={iconSizeSm} />
                    <span>详细过滤选项</span>
                </div>

                {showDetails && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0 4px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: 'calc(var(--ui-font-size) - 2px)', opacity: 0.6 }}>
                                包含的文件 (glob)
                            </span>
                            <input 
                                value={includePattern} 
                                onChange={(e) => setIncludePattern(e.target.value)} 
                                placeholder="例如: src/**/*.ts" 
                                style={{
                                    backgroundColor: 'var(--input-bg)', 
                                    border: '1px solid var(--input-border)', 
                                    color: 'var(--text-primary)', 
                                    padding: '2px 6px', 
                                    fontSize: 'calc(var(--ui-font-size) - 1px)', 
                                    fontFamily: 'inherit'
                                }} 
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: 'calc(var(--ui-font-size) - 2px)', opacity: 0.6 }}>
                                排除的文件 (glob)
                            </span>
                            <input 
                                value={excludePattern} 
                                onChange={(e) => setExcludePattern(e.target.value)} 
                                placeholder="例如: node_modules/**" 
                                style={{
                                    backgroundColor: 'var(--input-bg)', 
                                    border: '1px solid var(--input-border)', 
                                    color: 'var(--text-primary)', 
                                    padding: '2px 6px', 
                                    fontSize: 'calc(var(--ui-font-size) - 1px)', 
                                    fontFamily: 'inherit'
                                }} 
                            />
                        </div>
                    </div>
                )}
            </div>

            {resultStats.matchCount > 0 && (
                <div style={{
                    padding: '4px 12px',
                    fontSize: 'calc(var(--ui-font-size) - 1px)',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-tabs)',
                    opacity: 0.8
                }}>
                    在 {resultStats.fileCount} 个文件中找到 {resultStats.matchCount} 个结果
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                {viewMode === 'tree' ? (
                    <SearchResultTree
                        nodes={treeData.children}
                        level={0}
                        expandedFiles={expandedFiles}
                        onToggleExpand={toggleExpand}
                        onFileSelect={onFileSelect}
                        iconSizeSm={iconSizeSm}
                    />
                ) : (
                    Object.keys(groupedResults).map(path => {
                        const fileName = pathUtils.getFileName(path);
                        const isExpanded = expandedFiles[path];
                        const matches = groupedResults[path];
                        const relPath = path.replace(rootPath, '').replace(/^[\/\\]+/, '');

                        return (
                            <div key={path} style={{ display: 'flex', flexDirection: 'column' }}>
                                <div 
                                    onClick={() => toggleExpand(path)} 
                                    className="file-item-hover" 
                                    style={{ padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    {isExpanded ? <ChevronDown size={iconSizeSm} /> : <ChevronRight size={iconSizeSm} />}
                                    <FileCode size={iconSizeMd} style={{ color: 'var(--accent-color)' }} />
                                    <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {fileName}
                                    </span>
                                    <span style={{ opacity: 0.5, fontSize: '11px' }}>{matches.length}</span>
                                </div>
                                {isExpanded && (
                                    <div style={{ 
                                        padding: '2px 28px', 
                                        fontSize: 'calc(var(--ui-font-size) - 2px)', 
                                        color: 'var(--text-muted)', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap' 
                                    }}>
                                        {relPath.replace(fileName, '')}
                                    </div>
                                )}
                                {isExpanded && (
                                    <div style={{ marginBottom: '4px' }}>
                                        {matches.map((res, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => onFileSelect(res.path, fileName, res.line)} 
                                                className="file-item-hover" 
                                                style={{ padding: '3px 8px 3px 44px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                                            >
                                                <span style={{ minWidth: '24px', textAlign: 'right', fontSize: 'calc(var(--ui-font-size) - 2px)', fontFamily: 'monospace', opacity: 0.5, userSelect: 'none', paddingTop: '2px' }}>
                                                    {res.line}
                                                </span>
                                                <span style={{ fontFamily: 'var(--editor-font-family, monospace)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '1.4', fontSize: 'calc(var(--ui-font-size) - 1px)' }}>
                                                    {res.content}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                {query && !isSearching && results.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                        未找到结果
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPanel;
