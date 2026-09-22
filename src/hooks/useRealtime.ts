import { useEffect, useState, useCallback } from 'react';
import { db } from '../lib/database';

export function useRealtimeSubscription(onUpdate?: () => void) {
  const [isConnected, setIsConnected] = useState<boolean>(db.isRealtimeConnected());
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const handleUpdate = useCallback(() => {
    setIsConnected(db.isRealtimeConnected());
    setLastSync(new Date());
    if (onUpdate) {
      onUpdate();
    }
  }, [onUpdate]);

  useEffect(() => {
    // Initial check
    setIsConnected(db.isRealtimeConnected());

    // Subscribe to all database changes (local, server broadcast, cross-device SSE)
    const unsubscribe = db.subscribe(() => {
      handleUpdate();
    });

    return () => {
      unsubscribe();
    };
  }, [handleUpdate]);

  return { isConnected, lastSync };
}
