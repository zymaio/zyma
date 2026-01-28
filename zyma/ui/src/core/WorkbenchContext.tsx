import React, { createContext, useContext } from 'react';
import type { AppSettings } from '../components/SettingsModal/SettingsModal';

interface WorkbenchContextType {
    settings: AppSettings;
    setSettings: (s: AppSettings) => void;
    platform: string;
    appVersion: string;
    isAdmin: boolean;
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
