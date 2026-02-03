import React, { createContext, useContext } from 'react';
import type { AppSettings } from '../components/SettingsModal/SettingsModal';
import type { FileManagement } from '../hooks/useFileManagement';

export interface WorkbenchContextType {
    settings: AppSettings;
    setSettings: (s: AppSettings) => void;
    platform: string;
    appVersion: string;
    isAdmin: boolean;
    productName: string;
    rootPath: string;
    setRootPath: (path: string) => void;
    activeTabId: string | null;
    setActiveTabId: (id: string | null) => void;
    fm: FileManagement;
    handleAppExit: (saveAll: boolean) => Promise<void>;
}

const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined);

export const WorkbenchProvider: React.FC<{ value: WorkbenchContextType, children: React.ReactNode }> = ({ value, children }) => {
    return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
};

export const useWorkbench = () => {
    const context = useContext(WorkbenchContext);
    if (!context) throw new Error('useWorkbench must be used within a WorkbenchProvider');
    return context;
};
