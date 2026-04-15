import { pathUtils } from '../pathUtils';

describe('pathUtils', () => {
    describe('normalize', () => {
        it('should convert backslashes to forward slashes and lowercase', () => {
            expect(pathUtils.normalize('C:\\Users\\Test')).toBe('c:/users/test');
        });

        it('should handle empty input', () => {
            expect(pathUtils.normalize('')).toBe('');
            expect(pathUtils.normalize(null as any)).toBe('');
        });

        it('should remove surrounding quotes', () => {
            expect(pathUtils.normalize('"path/to/file"')).toBe('path/to/file');
        });
    });

    describe('toForwardSlashes', () => {
        it('should replace backslashes', () => {
            expect(pathUtils.toForwardSlashes('some\\path')).toBe('some/path');
        });

        it('should preserve original casing', () => {
            expect(pathUtils.toForwardSlashes('C:\\Users\\Test')).toBe('C:/Users/Test');
        });

        it('should handle empty input', () => {
            expect(pathUtils.toForwardSlashes('')).toBe('');
        });
    });

    describe('getFileName', () => {
        it('should extract filename from path', () => {
            expect(pathUtils.getFileName('/path/to/file.txt')).toBe('file.txt');
            expect(pathUtils.getFileName('C:\\Users\\Test\\doc.md')).toBe('doc.md');
        });

        it('should handle trailing slashes', () => {
            expect(pathUtils.getFileName('/path/to/folder/')).toBe('folder');
        });

        it('should handle empty input', () => {
            expect(pathUtils.getFileName('')).toBe('');
        });
    });

    describe('isEqual', () => {
        it('should compare paths case-insensitively', () => {
            expect(pathUtils.isEqual('C:\\Path', 'c:/path')).toBe(true);
        });

        it('should handle null values', () => {
            expect(pathUtils.isEqual(null, null)).toBe(true);
            expect(pathUtils.isEqual('path', null)).toBe(false);
        });

        it('should normalize slashes before comparing', () => {
            expect(pathUtils.isEqual('a\\b\\c', 'a/b/c')).toBe(true);
        });
    });
});
