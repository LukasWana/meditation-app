import { useState, useEffect } from 'react';

export const useOfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowOfflineMessage(true);

      // Skryj zprávu po 5 sekundách
      setTimeout(() => {
        setShowOfflineMessage(false);
      }, 5000);
    };

    // Přidej event listenery
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOffline,
    showOfflineMessage
  };
};

export default useOfflineStatus;
