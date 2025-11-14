import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit, Save, Play, Pause, FileAudio, RefreshCw } from 'lucide-react';
import Waveform from '@components/Waveform';
import { ref as dbRef, get, set } from 'firebase/database';
import { database } from '@services/firebase';
import { useTheme } from '@hooks/useTheme';

/**
 * Komponenta pro editaci admin dat
 * Zobrazuje a umožňuje editaci popisků zvuků
 */
const AdminDataEditor = ({
  loading,
  setLoading,
  setStatus,
  isDarkMode
}) => {
  const theme = useTheme();
  const [soundFiles, setSoundFiles] = useState([]);
  const [editingDescriptions, setEditingDescriptions] = useState({});
  const [playingPreview, setPlayingPreview] = useState(null);
  const previewAudioRef = useRef(null);

  const cardBg = isDarkMode ? theme.colors.gray[800] : theme.colors.white;
  const cardBorder = isDarkMode ? theme.colors.gray[700] : theme.colors.gray[200];
  const cardText = isDarkMode ? theme.colors.white : theme.colors.gray[900];

  const loadSoundFiles = async () => {
    setLoading(true);
    setStatus('🔄 Načítám zvuky...');
    try {
      // Načti data z Realtime Database
      const metadataRef = dbRef(database, 'audio-metadata');
      const snapshot = await get(metadataRef);
      const allMetadata = snapshot.exists() ? snapshot.val() : {};

      // Převeď na pole a filtruj pouze soubory s downloadURL
      const files = Object.values(allMetadata)
        .filter(file => file.downloadURL || file.audioSrc)
        .map((file, index) => ({
          id: index,
          fileName: file.fileName || file.fullPath,
          name: file.displayName || file.title || (file.fileName || '').replace(/\.[^/.]+$/, ''),
          description: file.description || '',
          downloadURL: file.downloadURL || file.audioSrc,
          waveformData: file.waveformData,
          waveformMax: file.waveformMax
        }))
        .slice(0, 50); // Omez na prvních 50 pro výkon

      setSoundFiles(files);
      setStatus(`✅ Načteno ${files.length} zvuků`);
    } catch (error) {
      setStatus(`❌ Chyba při načítání: ${error.message}`);
      console.error('❌ Failed to load sound files:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDescription = async (fileName, description) => {
    setLoading(true);
    setStatus('💾 Ukládám popisek...');
    try {
      const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
      const safePath = realtimeMetadataService.sanitizePath(fileName);
      const fileRef = dbRef(database, `audio-metadata/${safePath}`);
      const snapshot = await get(fileRef);
      const currentData = snapshot.exists() ? snapshot.val() : {};

      await set(fileRef, {
        ...currentData,
        description: description,
        lastUpdated: new Date().toISOString()
      });

      setSoundFiles(prev => prev.map(file =>
        file.fileName === fileName ? { ...file, description } : file
      ));
      setEditingDescriptions(prev => {
        const next = { ...prev };
        delete next[fileName];
        return next;
      });

      setStatus('✅ Popisek uložen');
    } catch (error) {
      setStatus(`❌ Chyba při ukládání popisku: ${error.message}`);
      console.error('❌ Failed to save description:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (file) => {
    if (!file.downloadURL) {
      setStatus('⚠️ Není dostupná download URL pro preview');
      return;
    }

    if (playingPreview === file.fileName && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
      setPlayingPreview(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }

    const audio = new Audio(file.downloadURL);
    audio.volume = 0.7;

    audio.onended = () => {
      setPlayingPreview(null);
      previewAudioRef.current = null;
    };

    audio.onerror = (error) => {
      console.error('❌ Chyba při přehrávání preview:', error);
      setPlayingPreview(null);
      previewAudioRef.current = null;
    };

    try {
      await audio.play();
      previewAudioRef.current = audio;
      setPlayingPreview(file.fileName);
    } catch (error) {
      console.error('❌ Nelze přehrát audio:', error);
      setStatus('❌ Nelze přehrát audio');
    }
  };

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
        previewAudioRef.current = null;
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="p-6 rounded-lg border mt-6"
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        color: cardText,
        borderRadius: theme.borderRadius.lg
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3
          className="flex items-center"
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold
          }}
        >
          <Edit className="mr-2" size={24} style={{ color: theme.colors.indigo[500] }} />
          Editace popisků zvuků
        </h3>
        <button
          onClick={loadSoundFiles}
          disabled={loading}
          className="px-4 py-2 text-white rounded-lg transition-colors flex items-center"
          style={{
            backgroundColor: loading ? theme.colors.gray[400] : theme.colors.indigo[500],
            borderRadius: theme.borderRadius.lg
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = theme.colors.indigo[600];
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = theme.colors.indigo[500];
            }
          }}
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
        <p
          className="text-center py-8"
          style={{
            color: theme.colors.gray[500],
            fontSize: theme.typography.fontSize.base
          }}
        >
          Klikněte na &quot;Načíst zvuky&quot; pro zobrazení seznamu zvuků k editaci popisků.
        </p>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {soundFiles.map((file) => (
            <motion.div
              key={file.id}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: isDarkMode ? theme.colors.gray[700] : theme.colors.gray[50],
                borderColor: isDarkMode ? theme.colors.gray[600] : theme.colors.gray[300],
                borderRadius: theme.borderRadius.lg
              }}
            >
              <div className="mb-3">
                <div
                  className="mb-1"
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: isDarkMode ? theme.colors.white : theme.colors.gray[800]
                  }}
                >
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
                      className="w-full p-2 rounded border text-sm"
                      style={{
                        backgroundColor: isDarkMode ? theme.colors.gray[800] : theme.colors.white,
                        borderColor: isDarkMode ? theme.colors.gray[600] : theme.colors.gray[300],
                        color: isDarkMode ? theme.colors.white : theme.colors.gray[900],
                        fontSize: theme.typography.fontSize.sm,
                        borderRadius: theme.borderRadius.md
                      }}
                      rows={2}
                      placeholder="Zadejte popisek..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveDescription(file.fileName, editingDescriptions[file.fileName])}
                        disabled={loading}
                        className="px-3 py-1.5 text-white rounded text-sm transition-colors flex items-center"
                        style={{
                          backgroundColor: loading ? theme.colors.gray[400] : theme.colors.green[500],
                          fontSize: theme.typography.fontSize.sm,
                          borderRadius: theme.borderRadius.md
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
                        className="px-3 py-1.5 text-white rounded text-sm transition-colors"
                        style={{
                          backgroundColor: theme.colors.gray[500],
                          fontSize: theme.typography.fontSize.sm,
                          borderRadius: theme.borderRadius.md
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.colors.gray[600];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = theme.colors.gray[500];
                        }}
                      >
                        Zrušit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex-1"
                      style={{
                        fontSize: theme.typography.fontSize.xs,
                        color: isDarkMode ? theme.colors.gray[300] : theme.colors.gray[600]
                      }}
                    >
                      {file.description || <span className="italic">Žádný popisek</span>}
                    </div>
                    <button
                      onClick={() => {
                        setEditingDescriptions(prev => ({
                          ...prev,
                          [file.fileName]: file.description || ''
                        }));
                      }}
                      className="px-2 py-1 text-white rounded text-xs transition-colors flex items-center"
                      style={{
                        backgroundColor: theme.colors.indigo[500],
                        fontSize: theme.typography.fontSize.xs,
                        borderRadius: theme.borderRadius.md
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.indigo[600];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.indigo[500];
                      }}
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
                    color={isDarkMode ? theme.colors.gray[400] : theme.colors.gray[500]}
                  />
                </div>
                <button
                  onClick={() => handlePreview(file)}
                  className="p-2 rounded-full transition-colors flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: playingPreview === file.fileName
                      ? theme.colors.indigo[600]
                      : isDarkMode
                      ? theme.colors.gray[600]
                      : theme.colors.gray[200],
                    color: playingPreview === file.fileName
                      ? theme.colors.white
                      : isDarkMode
                      ? theme.colors.white
                      : theme.colors.gray[700],
                    borderRadius: theme.borderRadius.full
                  }}
                  onMouseEnter={(e) => {
                    if (playingPreview === file.fileName) {
                      e.currentTarget.style.backgroundColor = theme.colors.indigo[700];
                    } else if (isDarkMode) {
                      e.currentTarget.style.backgroundColor = theme.colors.gray[500];
                    } else {
                      e.currentTarget.style.backgroundColor = theme.colors.gray[300];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (playingPreview === file.fileName) {
                      e.currentTarget.style.backgroundColor = theme.colors.indigo[600];
                    } else if (isDarkMode) {
                      e.currentTarget.style.backgroundColor = theme.colors.gray[600];
                    } else {
                      e.currentTarget.style.backgroundColor = theme.colors.gray[200];
                    }
                  }}
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

export default AdminDataEditor;

