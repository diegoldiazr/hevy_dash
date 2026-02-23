import React, { createContext, useContext, useState } from 'react';

const SyncContext = createContext();

export const useSyncContext = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSyncContext must be used within SyncProvider');
    }
    return context;
};

export const SyncProvider = ({ children }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState('Sincronizando datos de Hevy...');

    const startSync = (message = 'Sincronizando datos de Hevy...') => {
        setIsSyncing(true);
        setSyncMessage(message);
    };

    const endSync = () => {
        setIsSyncing(false);
    };

    return (
        <SyncContext.Provider value={{ isSyncing, syncMessage, startSync, endSync }}>
            {children}
        </SyncContext.Provider>
    );
};
