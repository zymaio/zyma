export interface LogStyle {
    color: string;
    fontWeight: string;
    opacity: number;
}

export function parseLogLevel(text: string): LogStyle {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('[error]') || lowerText.includes('[fatal]') || lowerText.includes('failed')) {
        return { color: 'var(--status-error)', fontWeight: 'bold', opacity: 1 };
    }
    if (lowerText.includes('[warning]') || lowerText.includes('warn')) {
        return { color: 'var(--status-warning)', fontWeight: 'normal', opacity: 1 };
    }
    if (lowerText.includes('[success]') || lowerText.includes('[done]') || lowerText.includes('成功')) {
        return { color: 'var(--status-success)', fontWeight: 'normal', opacity: 1 };
    }
    if (lowerText.includes('[info]') || lowerText.includes('[system]') || lowerText.includes('[restore]')) {
        return { color: 'var(--status-info)', fontWeight: 'normal', opacity: 1 };
    }
    
    return { color: 'var(--text-primary)', fontWeight: 'normal', opacity: 0.8 };
}
