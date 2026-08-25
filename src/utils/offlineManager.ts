import { useEffect, useState } from 'react';

export interface StorageStatus {
  persisted: boolean;
  quotaMB: number | null;
  usageMB: number | null;
  isServiceWorkerReady: boolean;
}

export async function registerServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    
    // Check if installed/active
    if (registration.installing) {
      console.log('Service worker installing for offline persistence');
    } else if (registration.active) {
      console.log('Service worker active and caching assets for offline execution');
    }
    return true;
  } catch (error) {
    console.warn('Service worker registration failed:', error);
    return false;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const isAlreadyPersisted = await navigator.storage.persisted();
    if (isAlreadyPersisted) {
      return true;
    }
    const granted = await navigator.storage.persist();
    return granted;
  } catch (e) {
    console.warn('Could not request persistent storage:', e);
    return false;
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  let isPersisted = false;
  let quota: number | null = null;
  let usage: number | null = null;

  if (typeof window !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota) quota = Math.round(estimate.quota / (1024 * 1024));
        if (estimate.usage) usage = Math.round(estimate.usage / (1024 * 1024));
      }
    } catch (e) {
      console.warn('Storage status check failed:', e);
    }
  }

  const hasSw = typeof window !== 'undefined' && 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;

  return {
    persisted: isPersisted,
    quotaMB: quota,
    usageMB: usage,
    isServiceWorkerReady: hasSw,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
