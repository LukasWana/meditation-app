import React from 'react';
import { motion } from 'framer-motion';
import { Database, Upload, RefreshCw } from 'lucide-react';
import { useTheme } from '@hooks/useTheme';

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
  const theme = useTheme();
  // Parsuj cardClasses pro získání barev (fallback pokud není poskytnuto)
  const cardBg = cardClasses?.includes('bg-gray-800') ? theme.colors.gray[800] : theme.colors.white;
  const cardBorder = cardClasses?.includes('border-gray-700') ? theme.colors.gray[700] : theme.colors.gray[200];
  const cardText = cardClasses?.includes('text-white') ? theme.colors.white : theme.colors.gray[900];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Kompletní synchronizace Storage → Realtime DB */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-lg border"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: cardText,
          borderRadius: theme.borderRadius.lg
        }}
      >
        <h3
          className="mb-4 flex items-center"
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold
          }}
        >
          <Database className="mr-2" size={24} style={{ color: theme.colors.green[500] }} />
          Kompletní synchronizace
        </h3>
        <p
          className="mb-4"
          style={{
            color: theme.colors.gray[500],
            fontSize: theme.typography.fontSize.base
          }}
        >
          Skenuje Firebase Storage, získá reálnou délku MP3 souborů a uloží metadata do Realtime Database. Doporučeno pro první spuštění.
        </p>
        <button
          onClick={onFullSync}
          disabled={loading}
          className="w-full text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          style={{
            backgroundColor: loading ? theme.colors.gray[400] : theme.colors.green[500],
            borderRadius: theme.borderRadius.lg
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = theme.colors.green[600];
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = theme.colors.green[500];
            }
          }}
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
        className="p-6 rounded-lg border"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: cardText,
          borderRadius: theme.borderRadius.lg
        }}
      >
        <h3
          className="mb-4 flex items-center"
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold
          }}
        >
          <Database className="mr-2" size={24} style={{ color: theme.colors.purple[500] }} />
          Rychlá synchronizace
        </h3>
        <p
          className="mb-4"
          style={{
            color: theme.colors.gray[500],
            fontSize: theme.typography.fontSize.base
          }}
        >
          Aktualizuje Realtime Database s metadaty z Firestore. Spustit po přidání nové meditace v adminu.
        </p>
        <button
          onClick={onFirestoreSync}
          disabled={loading}
          className="w-full text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          style={{
            backgroundColor: loading ? theme.colors.gray[400] : theme.colors.purple[500],
            borderRadius: theme.borderRadius.lg
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = theme.colors.purple[600];
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = theme.colors.purple[500];
            }
          }}
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
        className="p-6 rounded-lg border"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: cardText,
          borderRadius: theme.borderRadius.lg
        }}
      >
        <h3
          className="mb-4 flex items-center"
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold
          }}
        >
          <Database className="mr-2" size={24} style={{ color: theme.colors.blue[500] }} />
          Automatická synchronizace všech souborů
        </h3>
        <p
          className="mb-4"
          style={{
            color: theme.colors.gray[500],
            fontSize: theme.typography.fontSize.base
          }}
        >
          Vygeneruje metadata pro všechny MP3, OGG, OGA soubory a obrázky pomocí Firebase Function (server-side). Generuje také waveformy.
        </p>
        <button
          onClick={onAutoSync}
          disabled={loading}
          className="w-full text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          style={{
            backgroundColor: loading ? theme.colors.gray[400] : theme.colors.blue[500],
            borderRadius: theme.borderRadius.lg
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = theme.colors.blue[600];
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = theme.colors.blue[500];
            }
          }}
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

