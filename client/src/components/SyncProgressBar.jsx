import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useSyncContext } from '../context/SyncContext';
import './SyncProgressBar.css';

const SyncProgressBar = () => {
    const { isSyncing, syncMessage } = useSyncContext();

    React.useEffect(() => {
        if (isSyncing) {
            document.body.classList.add('syncing');
        } else {
            document.body.classList.remove('syncing');
        }
        return () => document.body.classList.remove('syncing');
    }, [isSyncing]);

    if (!isSyncing) return null;

    return (
        <div className="sync-progress-bar">
            <div className="sync-progress-content">
                <RefreshCw size={16} className="sync-icon spinning" />
                <span className="sync-text">{syncMessage}</span>
            </div>
            <div className="sync-progress-line"></div>
        </div>
    );
};

export default SyncProgressBar;
