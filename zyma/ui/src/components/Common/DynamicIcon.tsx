import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Puzzle } from 'lucide-react';

interface DynamicIconProps {
    icon: any;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * 通用动态图标组件：支持 Lucide 字符串、React 元素和函数组件。
 */
export const DynamicIcon: React.FC<DynamicIconProps> = ({ icon, size = 24, className, style }) => {
    if (!icon) return <Puzzle size={size} className={className} style={style} />;
    
    // 1. 如果已经是 React 元素
    if (React.isValidElement(icon)) {
        return icon;
    }

    // 2. 如果是字符串（Lucide 图标名或纯文字）
    if (typeof icon === 'string') {
        const IconComponent = (LucideIcons as any)[icon];
        if (IconComponent) {
            return <IconComponent size={size} className={className} style={style} />;
        }
        
        // 如果找不到对应的 Lucide 图标，渲染为标准化的文字占位符
        return (
            <div className={className} style={{ 
                width: size, 
                height: size, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: `${Math.round(size * 0.5)}px`,
                fontWeight: 800,
                fontFamily: 'system-ui, sans-serif',
                lineHeight: 1,
                userSelect: 'none',
                letterSpacing: '-0.5px',
                color: 'var(--text-secondary)',
                ...style
            }}>
                {icon.substring(0, 2).toUpperCase()}
            </div>
        );
    }
    
    // 3. 如果是函数组件类型
    try {
        const Component = icon;
        return <Component size={size} className={className} style={style} />;
    } catch(e) {
        return <Puzzle size={size} className={className} style={style} />;
    }
};
