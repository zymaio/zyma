import { commands } from '../components/CommandSystem/CommandRegistry';
import type { WorkbenchHandlers } from '../components/PluginSystem/types';

export function registerFileCommands(t: (key: string) => string, handlers: WorkbenchHandlers) {
    commands.registerCommand({
        id: 'file.new',
        title: t('NewFile'),
        category: 'File',
        callback: handlers.handleNewFile
    });

    commands.registerCommand({
        id: 'file.save',
        title: t('Save'),
        category: 'File',
        callback: () => handlers.handleSave(false)
    });

    commands.registerCommand({
        id: 'file.saveAs',
        title: t('SaveAs'),
        category: 'File',
        callback: () => handlers.handleSave(true)
    });

    commands.registerCommand({
        id: 'file.delete',
        title: t('Delete'),
        category: 'File',
        callback: () => {
            const path = handlers.fm.activeFilePath;
            if (!path) return;

            // 从路径中提取文件名
            const name = path.split('/').pop() || path.split('\\').pop() || 'file';

            // handleDelete 内部会显示确认对话框
            handlers.fm.handleDelete(path, name);
        }
    });
}
