import React from 'react';
import { motion } from 'framer-motion';
import { Database, Upload, RefreshCw } from 'lucide-react';

/**
 * Komponenta pro správu metadat
 * Obsahuje funkce pro synchronizaci dat
 */
const AdminMetadataManager = ({
  loading,
  onFullSync,
  onFirestoreSync,
  onAutoSync,
  cardClasses
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Kompletní synchronizace Storage → Realtime DB */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`p-6 rounded-lg border ${cardClasses}`}
      >
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Database className="mr-2 text-green-500" size={24} />
          Kompletní synchronizace
        </h3>
        <p className="text-gray-500 mb-4">
          Skenuje Firebase Storage, získá reálnou délku MP3 souborů a uloží metadata do Realtime Database. Doporučeno pro první spuštění.
        </p>
        <button
          onClick={onFullSync}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          {loading ? (
            <RefreshCw className="animate-spin mr-2" size={20} />
          ) : (
            <Upload className="mr-2" size={20} />
          )}
          {loading ? 'Synchronizuji...' : '🚀 Kompletní synchronizace Storage → Realtime DB'}
        </button>
      </motion.div>

      {/* Synchronizace Firestore → Realtime DB */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`p-6 rounded-lg border ${cardClasses}`}
      >
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Database className="mr-2 text-purple-500" size={24} />
          Rychlá synchronizace
        </h3>
        <p className="text-gray-500 mb-4">
          Aktualizuje Realtime Database s metadaty z Firestore. Spustit po přidání nové meditace v adminu.
        </p>
        <button
          onClick={onFirestoreSync}
          disabled={loading}
          className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          {loading ? (
            <RefreshCw className="animate-spin mr-2" size={20} />
          ) : (
            <RefreshCw className="mr-2" size={20} />
          )}
          {loading ? 'Synchronizuji...' : '🔄 Synchronizovat Firestore → Realtime DB'}
        </button>
      </motion.div>

      {/* Automatická synchronizace všech souborů pomocí Firebase Function */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`p-6 rounded-lg border ${cardClasses}`}
      >
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Database className="mr-2 text-blue-500" size={24} />
          Automatická synchronizace všech souborů
        </h3>
        <p className="text-gray-500 mb-4">
          Vygeneruje metadata pro všechny MP3, OGG, OGA soubory a obrázky pomocí Firebase Function (server-side). Generuje také waveformy.
        </p>
        <button
          onClick={onAutoSync}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          {loading ? (
            <RefreshCw className="animate-spin mr-2" size={20} />
          ) : (
            <Database className="mr-2" size={20} />
          )}
          {loading ? 'Synchronizuji...' : '🚀 Automatická synchronizace všech souborů'}
        </button>
      </motion.div>
    </div>
  );
};

export default AdminMetadataManager;

