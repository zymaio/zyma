/**
 * Simple logger that respects NODE_ENV to suppress debug output in production.
 */
const isDev = import.meta.env?.DEV ?? true;

export const logger = {
    debug: (...args: unknown[]) => {
        if (isDev) console.log('[Zyma]', ...args);
    },
    warn: (...args: unknown[]) => {
        if (isDev) console.warn('[Zyma]', ...args);
    },
    error: (...args: unknown[]) => {
        console.error('[Zyma]', ...args);
    },
};
