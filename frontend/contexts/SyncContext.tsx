import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getQueueCount } from '../services/storage';
import { syncQueue } from '../services/api';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface SyncContextValue {
  isOnline: boolean;
  pendingCount: number;
  syncStatus: SyncStatus;
  refreshPendingCount: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  pendingCount: 0,
  syncStatus: 'idle',
  refreshPendingCount: async () => {},
});

export const useSyncContext = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const syncingRef = useRef(false);
  const clearSyncedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPendingCount = async () => {
    const count = await getQueueCount();
    setPendingCount(count);
  };

  const runSync = async () => {
    if (syncingRef.current) return;
    const count = await getQueueCount();
    if (count === 0) return;

    syncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const { synced } = await syncQueue();
      await refreshPendingCount();
      if (synced > 0) {
        setSyncStatus('synced');
        if (clearSyncedTimer.current) clearTimeout(clearSyncedTimer.current);
        clearSyncedTimer.current = setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('idle');
      }
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    refreshPendingCount();

    const unsubscribe = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(prev => {
        if (!prev && online) {
          // Voltou online: sincronizar automaticamente
          setTimeout(runSync, 1000);
        }
        return online;
      });
    });

    return () => {
      unsubscribe();
      if (clearSyncedTimer.current) clearTimeout(clearSyncedTimer.current);
    };
  }, []);

  // Atualizar contagem de pendentes periodicamente
  useEffect(() => {
    const interval = setInterval(refreshPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SyncContext.Provider value={{ isOnline, pendingCount, syncStatus, refreshPendingCount }}>
      {children}
    </SyncContext.Provider>
  );
}
