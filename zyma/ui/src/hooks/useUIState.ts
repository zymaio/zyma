import { useState } from 'react';

export function useUIState() {
    const [showSettings, setShowSettings] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [aboutState, setAboutState] = useState({ show: false, autoCheck: false });
    const [showSidebar, setShowSidebar] = useState(true);
    const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);

    return {
        showSettings, setShowSettings,
        showCommandPalette, setShowCommandPalette,
        showSearch, setShowSearch,
        aboutState, setAboutState,
        showSidebar, setShowSidebar,
        pendingCloseId, setPendingCloseId
    };
}
