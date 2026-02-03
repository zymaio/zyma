import React from 'react';
import SettingsModal from '../components/SettingsModal/SettingsModal';
import AboutModal from '../components/AboutModal/AboutModal';
import CommandPalette from '../components/CommandSystem/CommandPalette';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import type { WorkbenchLogic } from '../hooks/useWorkbenchLogic';

interface WorkbenchModalsProps {
    logic: WorkbenchLogic;
    settings: any;
    setSettings: (s: any) => void;
    platform: string;
    appVersion: string;
    fm: any;
    closeTab: (id: string) => void;
    isClosingApp: boolean;
    setIsClosingApp: (v: boolean) => void;
    setIsExiting: (v: boolean) => void;
    handleAppExit: (v: boolean) => void;
}

const WorkbenchModals: React.FC<WorkbenchModalsProps> = ({ 
    logic, settings, setSettings, platform, appVersion, 
    fm, closeTab, isClosingApp, setIsClosingApp, setIsExiting, handleAppExit 
}) => {
    const { t } = useTranslation();

    return (
        <>
            {logic.showSettings && (
                <SettingsModal 
                    currentSettings={settings} 
                    onSave={async (ns) => { 
                        setSettings(ns); 
                        try { await invoke('save_settings', { settings: ns }); } catch(e){} 
                    }} 
                    onClose={() => logic.setShowSettings(false)} 
                    platform={platform} 
                />
            )}
            
            {logic.aboutState.show && (
                <AboutModal 
                    version={appVersion} 
                    autoCheck={logic.aboutState.autoCheck} 
                    onClose={() => logic.setAboutState({ ...logic.aboutState, show: false })} 
                />
            )}
            
            <CommandPalette 
                visible={logic.showCommandPalette} 
                onClose={() => logic.setShowCommandPalette(false)} 
            />
            
            {/* 1. 单文件关闭确认 */}
            {logic.pendingCloseId && (
                <ConfirmModal 
                    title={t('File')} 
                    message={t('SaveBeforeClose', { name: fm.openFiles.find((f: any) => f.id === logic.pendingCloseId)?.name })} 
                    onSave={async () => { 
                        const id = logic.pendingCloseId!;
                        const f = fm.openFiles.find((x: any) => x.id === id); 
                        if (await fm.doSave(f || null)) closeTab(id); 
                        logic.setPendingCloseId(null); 
                    }} 
                    onDontSave={() => { 
                        closeTab(logic.pendingCloseId!); 
                        logic.setPendingCloseId(null); 
                    }} 
                    onCancel={() => logic.setPendingCloseId(null)} 
                />
            )}

            {/* 2. 整个应用退出确认 */}
            {isClosingApp && (
                <ConfirmModal 
                    title={t('ExitApp')} 
                    message={t('UnsavedChangesExit')} 
                    onSave={async () => { 
                        const dirtyFiles = fm.openFiles.filter((f: any) => f.isDirty);
                        for (const f of dirtyFiles) await fm.doSave(f);
                        setIsExiting(true); 
                        setTimeout(() => handleAppExit(false), 50);
                    }} 
                    onDontSave={() => {
                        setIsExiting(true); 
                        setTimeout(() => handleAppExit(false), 50);
                    }} 
                    onCancel={() => setIsClosingApp(false)} 
                />
            )}
        </>
    );
};

export default WorkbenchModals;
