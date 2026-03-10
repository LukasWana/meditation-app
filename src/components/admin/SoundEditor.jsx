import React from 'react';
import { motion } from 'framer-motion';
import { Edit, Save, RefreshCw, FileAudio, Play, Pause } from 'lucide-react';
import Waveform from '@components/Waveform';

export const SoundEditor = ({
  soundFiles,
  editingDescriptions,
  setEditingDescriptions,
  playingPreview,
  loadSoundFiles,
  saveDescription,
  handlePreview,
  loading,
  isDarkMode
}) => {
  const cardClasses = isDarkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className={`p-6 rounded-lg border mt-6 ${cardClasses}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold flex items-center">
          <Edit className="mr-2 text-indigo-500" size={24} />
          Editace popisků zvuků
        </h3>
        <button
          onClick={loadSoundFiles}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center"
        >
          {loading ? (
            <RefreshCw className="animate-spin mr-2" size={16} />
          ) : (
            <FileAudio className="mr-2" size={16} />
          )}
          {soundFiles.length > 0 ? '🔄 Obnovit' : '📂 Načíst zvuky'}
        </button>
      </div>

      {soundFiles.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Klikněte na "Načíst zvuky" pro zobrazení seznamu zvuků k editaci popisků.
        </p>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {soundFiles.map((file) => (
            <motion.div
              key={file.id}
              className={`p-4 rounded-lg border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
              }`}
            >
              <div className="mb-3">
                <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {file.name}
                </div>
                {editingDescriptions[file.fileName] !== undefined ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingDescriptions[file.fileName]}
                      onChange={(e) => {
                        setEditingDescriptions(prev => ({
                          ...prev,
                          [file.fileName]: e.target.value
                        }));
                      }}
                      className={`w-full p-2 rounded border text-sm ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      rows={2}
                      placeholder="Zadejte popisek..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveDescription(file.fileName, editingDescriptions[file.fileName])}
                        disabled={loading}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded text-sm transition-colors flex items-center"
                      >
                        <Save size={14} className="mr-1" />
                        Uložit
                      </button>
                      <button
                        onClick={() => {
                          setEditingDescriptions(prev => {
                            const next = { ...prev };
                            delete next[file.fileName];
                            return next;
                          });
                        }}
                        className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                      >
                        Zrušit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className={`text-xs flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {file.description || <span className="italic">Žádný popisek</span>}
                    </div>
                    <button
                      onClick={() => {
                        setEditingDescriptions(prev => ({
                          ...prev,
                          [file.fileName]: file.description || ''
                        }));
                      }}
                      className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs transition-colors flex items-center"
                    >
                      <Edit size={12} className="mr-1" />
                      Editovat
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Waveform
                    key={`${file.fileName}-${file.waveformMax || 'no-globalMax'}`}
                    audioUrl={file.downloadURL}
                    waveformData={file.waveformData}
                    globalMax={file.waveformMax}
                    width="100%"
                    height={50}
                    color={isDarkMode ? "#9ca3af" : "#6b7280"}
                  />
                </div>
                <button
                  onClick={() => handlePreview(file)}
                  className={`p-2 rounded-full transition-colors flex items-center justify-center flex-shrink-0 ${
                    playingPreview === file.fileName
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : isDarkMode
                      ? 'bg-gray-600 hover:bg-gray-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  title={playingPreview === file.fileName ? 'Zastavit' : 'Přehrát'}
                  type="button"
                >
                  {playingPreview === file.fileName ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
