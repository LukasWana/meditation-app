import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { usePageVisible } from '@hooks/usePageVisible';

const OfflineIndicator = ({ isOffline, showOfflineMessage }) => {
  const isPageVisible = usePageVisible();
  // Pulzovat má smysl jen jako upozornění na offline stav a jen na viditelné
  // stránce — jinak to je nekonečná animace běžící přes celou dobu používání
  const shouldPulse = isOffline && isPageVisible;

  return (
    <>
      {/* Offline zpráva - zobrazí se na 5 sekund */}
      <AnimatePresence>
        {showOfflineMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
          >
            <WifiOff className="w-4 h-4" />
            <span>Offline režim</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trvalý indikátor - červená/zelená tečka */}
      <div className="fixed top-4 right-4 z-50">
        <motion.div
          animate={shouldPulse ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={shouldPulse ? { duration: 0.5, repeat: Infinity } : { duration: 0 }}
          className={`w-3 h-3 rounded-full ${
            isOffline ? 'bg-red-500' : 'bg-green-500'
          }`}
          title={isOffline ? 'Offline' : 'Online'}
        >
          <div className="w-full h-full rounded-full bg-white opacity-30"></div>
        </motion.div>
      </div>
    </>
  );
};

export default OfflineIndicator;