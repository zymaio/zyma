import { useState, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface SearchResult {
    path: string;
    line: number;
    content: string;
}

export interface SearchTreeNode {
    name: string;
    fullPath: string;
    isDir: boolean;
    children: Record<string, SearchTreeNode>;
    matches?: SearchResult[];
}

export interface SearchOptions {
    query: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
    includePattern: string;
    excludePattern: string;
}

export function useSearch(rootPath: string) {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

    const handleSearch = useCallback(async (options: SearchOptions) => {
        if (!options.query.trim()) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const data = await invoke<SearchResult[]>('search_in_dir', {
                root: rootPath,
                pattern: options.query,
                case_sensitive: options.caseSensitive,
                whole_word: options.wholeWord,
                use_regex: options.useRegex,
                include: options.includePattern || undefined,
                exclude: options.excludePattern || undefined
            });
            setResults(data);

            // 默认展开所有结果
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
            console.error('Search failed:', e);
        } finally {
            setIsSearching(false);
        }
    }, [rootPath]);

    const toggleExpand = useCallback((path: string) => {
        setExpandedFiles(prev => ({ ...prev, [path]: !prev[path] }));
    }, []);

    const collapseAll = useCallback(() => {
        setExpandedFiles({});
    }, []);

    const clearResults = useCallback(() => {
        setResults([]);
        setExpandedFiles({});
    }, []);

    // 分组结果 (用于列表模式)
    const groupedResults = useMemo(() => {
        const groups: Record<string, SearchResult[]> = {};
        results.forEach(res => {
            if (!groups[res.path]) groups[res.path] = [];
            groups[res.path].push(res);
        });
        return groups;
    }, [results]);

    // 树形数据 (用于树形模式)
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

    const resultStats = useMemo(() => {
        const fileCount = Object.keys(groupedResults).length;
        const matchCount = results.length;
        return { fileCount, matchCount };
    }, [groupedResults, results]);

    return {
        results,
        isSearching,
        expandedFiles,
        groupedResults,
        treeData,
        resultStats,
        handleSearch,
        toggleExpand,
        collapseAll,
        clearResults,
        setExpandedFiles
    };
}
