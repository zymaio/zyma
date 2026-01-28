import { commands } from '../components/CommandSystem/CommandRegistry';

export function registerFileCommands(t: any, handlers: any) {
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
}
