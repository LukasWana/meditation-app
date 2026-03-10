import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Database, Download, RefreshCw, Upload, FileAudio } from 'lucide-react';
import DataStorageCharts from '@components/admin/DataStorageCharts';

// Hooks
import { useAdminSync } from '../hooks/useAdminSync';
import { useSoundEditor } from '../hooks/useSoundEditor';

// Components
import { SyncCard } from '@components/admin/SyncCard';
import { SoundEditor } from '@components/admin/SoundEditor';
import { QuickActions } from '@components/admin/QuickActions';

const SimpleAdminScreen = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showCharts, setShowCharts] = useState(false);

  const {
    checkStatus,
    syncFirestoreToRealtime,
    fullMetadataSync,
    clearCacheAndReload,
    downloadMP3ForOffline
  } = useAdminSync(setLoading, setStatus);

  const {
    soundFiles,
    editingDescriptions,
    setEditingDescriptions,
    playingPreview,
    loadSoundFiles,
    saveDescription,
    handlePreview
  } = useSoundEditor(setLoading, setStatus);

  const cardClasses = isDarkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Zjednodušený Admin Panel</h1>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-4xl mx-auto">
        {/* Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border mb-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}
        >
          <div className="flex items-center">
            <Database className="mr-3 text-blue-500" size={20} />
            <span className="font-medium">Status:</span>
            <span className="ml-2">{status || 'Připraveno'}</span>
          </div>
        </motion.div>

        {/* Hlavní funkce */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SyncCard
            title="Kompletní synchronizace"
            description="Skenuje Firebase Storage, získá reálnou délku MP3 souborů a uloží metadata do Realtime Database. Doporučeno pro první spuštění."
            icon={Database}
            buttonIcon={Upload}
            buttonText="Kompletní synchronizace Storage → Realtime DB"
            onClick={fullMetadataSync}
            loading={loading}
            delay={0.1}
            color="green"
            isDarkMode={isDarkMode}
          />
          <SyncCard
            title="Rychlá synchronizace"
            description="Aktualizuje Realtime Database s metadaty z Firestore. Spustit po přidání nové meditace v adminu."
            icon={Database}
            buttonIcon={RefreshCw}
            buttonText="Synchronizovat Firestore → Realtime DB"
            onClick={syncFirestoreToRealtime}
            loading={loading}
            delay={0.2}
            color="purple"
            isDarkMode={isDarkMode}
          />
          <SyncCard
            title="Vymazat cache a načíst data"
            description="Vymaže všechny cache a načte data přímo z Realtime Database. Použít když se data neaktualizují v UI aplikaci."
            icon={RefreshCw}
            buttonIcon={RefreshCw}
            buttonText="Vymazat cache a načíst data"
            onClick={clearCacheAndReload}
            loading={loading}
            delay={0.4}
            color="orange"
            isDarkMode={isDarkMode}
          />
          <SyncCard
            title="Offline stahování"
            description="Stáhne všechny MP3 soubory pro offline použití. Uloží je do prohlížeče."
            icon={Download}
            buttonIcon={FileAudio}
            buttonText="Stáhnout MP3 pro offline"
            onClick={downloadMP3ForOffline}
            loading={loading}
            delay={0.4}
            color="blue"
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Grafy úložišť dat */}
        {showCharts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`mt-6 ${cardClasses}`}
          >
            <DataStorageCharts />
          </motion.div>
        )}

        <SoundEditor
          soundFiles={soundFiles}
          editingDescriptions={editingDescriptions}
          setEditingDescriptions={setEditingDescriptions}
          playingPreview={playingPreview}
          loadSoundFiles={loadSoundFiles}
          saveDescription={saveDescription}
          handlePreview={handlePreview}
          loading={loading}
          isDarkMode={isDarkMode}
        />

        <QuickActions
          checkStatus={checkStatus}
          setStatus={setStatus}
          showCharts={showCharts}
          setShowCharts={setShowCharts}
          setLoading={setLoading}
          loading={loading}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
};

export default SimpleAdminScreen;
