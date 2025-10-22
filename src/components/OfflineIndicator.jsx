import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, HardDrive, Download } from 'lucide-react';
import useOfflineCache from '@hooks/useOfflineCache';

const OfflineIndicator = () => {
  const { isOfflineReady, cacheStats, isCaching } = useOfflineCache();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  // Sleduj online/offline stav
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

  // Zobraz indikátor při změně stavu
  useEffect(() => {
    if (!isOnline || isCaching) {
      setShowIndicator(true);
    } else if (isOnline && !isCaching) {
      // Skryj po 3 sekundách
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isCaching]);

  // Pokud je online a není stahování, neskrývej
  if (isOnline && !isCaching && !showIndicator) {
    return null;
  }

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className={`p-3 rounded-lg shadow-lg backdrop-blur-sm border ${
            isCaching
              ? 'bg-blue-500 text-white border-blue-400'
              : !isOnline
                ? isOfflineReady
                  ? 'bg-green-500 text-white border-green-400'
                  : 'bg-red-500 text-white border-red-400'
                : 'bg-gray-500 text-white border-gray-400'
          }`}>
            <div className="flex items-center space-x-2">
              {isCaching ? (
                <>
                  <Download className="animate-pulse" size={16} />
                  <span className="text-sm font-medium">Stahování...</span>
                </>
              ) : !isOnline ? (
                isOfflineReady ? (
                  <>
                    <Wifi className="text-green-200" size={16} />
                    <span className="text-sm font-medium">Offline režim</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="text-red-200" size={16} />
                    <span className="text-sm font-medium">Bez připojení</span>
                  </>
                )
              ) : (
                <>
                  <Wifi className="text-gray-200" size={16} />
                  <span className="text-sm font-medium">Online</span>
                </>
              )}
            </div>

            {/* Cache info pro offline režim */}
            {!isOnline && isOfflineReady && cacheStats && (
              <div className="mt-1 text-xs opacity-80">
                {cacheStats.totalFiles} souborů v cache
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
