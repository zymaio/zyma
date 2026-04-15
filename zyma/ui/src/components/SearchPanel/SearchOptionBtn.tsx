import React from 'react';

interface SearchOptionBtnProps {
    active: boolean;
    onClick: () => void;
    icon: React.ComponentType<{ size: number }>;
    title: string;
    iconSize: number;
}

export const SearchOptionBtn: React.FC<SearchOptionBtnProps> = ({ 
    active, 
    onClick, 
    icon: Icon, 
    title,
    iconSize 
}) => (
    <button 
        onClick={onClick} 
        title={title} 
        style={{
            padding: '2px', 
            borderRadius: '3px', 
            border: 'none', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            transition: 'all 0.2s',
            backgroundColor: active ? 'var(--accent-color)' : 'transparent',
            color: active ? 'var(--accent-foreground)' : 'var(--text-muted)'
        }}
    >
        <Icon size={iconSize} />
    </button>
);
