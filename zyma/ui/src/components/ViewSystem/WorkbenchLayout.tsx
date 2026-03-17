import React from 'react';
import { Toaster } from 'react-hot-toast';

export const WorkbenchLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="app-root">
            {children}
            <Toaster position="bottom-right" />
        </div>
    );
};
