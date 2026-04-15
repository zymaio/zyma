/**
 * 路径处理工具函数，确保全系统路径表现一致
 */
export const pathUtils = {
    /**
     * 将路径标准化为正斜杠并转为小写（用于唯一键对比）
     */
    normalize: (path: string): string => {
        if (!path) return "";
        return path.replace(/^\"(.*)\"$/, '$1').replace(/\\/g, '/').toLowerCase();
    },

    /**
     * 仅标准化斜杠，保留原始大小写（用于显示）
     */
    toForwardSlashes: (path: string): string => {
        if (!path) return "";
        return path.replace(/\\/g, '/');
    },

    /**
     * 获取路径中的文件名
     */
    getFileName: (path: string): string => {
        if (!path) return "";
        // 处理末尾斜杠的情况，并统一标准化
        return path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || path;
    },

    /**
     * 比较两个路径是否相等（大小写不敏感，统一斜杠）
     */
    isEqual: (p1: string | null, p2: string | null): boolean => {
        if (!p1 || !p2) return p1 === p2;
        return p1.replace(/\\/g, '/').toLowerCase() === p2.replace(/\\/g, '/').toLowerCase();
    }
};

