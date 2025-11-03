import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FramerButton } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

const SoundThemeGallery = ({ isOpen, onClose, onSelectSound, selectedInSound, selectedOutSound }) => {
  const { t } = useLanguage();
  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (isOpen) {
      loadMusicFiles();
    }
  }, [isOpen]);

  const loadMusicFiles = async () => {
    try {
      setLoading(true);
      const allMetadata = await realtimeMetadataService.getAllMetadata();

      console.log('🔍 SoundThemeGallery: Načteno metadata:', Object.keys(allMetadata).length);

      // Debug: zobraz všechny soubory s "dychanie" v názvu
      const allDychanieFiles = Object.values(allMetadata).filter(file => {
        const fileName = (file.fileName || '').toLowerCase();
        return fileName.includes('dychanie');
      });
      console.log('🫁 SoundThemeGallery: Všechny soubory s "dychanie":', allDychanieFiles.length);
      console.log('🫁 Sample dychanie files:', allDychanieFiles.slice(0, 5).map(f => ({
        fileName: f.fileName,
        folder: f.folder,
        hasDownloadURL: !!(f.downloadURL || f.audioSrc)
      })));

      // Filtruj pouze soubory z kategorie "dychanie" (OGG formát)
      const dychanieFiles = Object.values(allMetadata).filter(file => {
        const fileName = file.fileName || '';
        const isInDychanieFolder = fileName.startsWith('dychanie/');
        const isOggFile = fileName.endsWith('.ogg') || fileName.endsWith('.oga');
        const isMp3File = fileName.endsWith('.mp3'); // Fallback pro MP3

        const matches = isInDychanieFolder && (isOggFile || isMp3File);
        if (isInDychanieFolder) {
          console.log(`🫁 Soubor dychanie: ${fileName}, isOgg: ${isOggFile}, isMp3: ${isMp3File}, matches: ${matches}`);
        }

        return matches;
      });

      console.log('🫁 SoundThemeGallery: Filtrováno dychanie souborů:', dychanieFiles.length);

      // Mapuj na formát pro galerii
      const mappedFiles = dychanieFiles.map(file => {
        const fileNameOnly = file.fileNameOnly || file.fileName.split('/').pop();
        const name = file.displayName || file.fileNameOnly || fileNameOnly.replace(/\.(ogg|oga|mp3)$/i, '');

        return {
          id: file.fileName,
          fileName: file.fileName,
          fileNameOnly: fileNameOnly,
          name: name,
          downloadURL: file.downloadURL || file.audioSrc,
          coverImage: file.coverImage || file.albumCover || null,
          duration: file.duration || file.durationFormatted || 'N/A'
        };
      });

      console.log('🫁 SoundThemeGallery: Zmapováno souborů:', mappedFiles.length);
      setAudioFiles(mappedFiles);
      setLoading(false);
    } catch (error) {
      console.error('❌ Failed to load dychanie files:', error);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleFileSelect = (type, fileName) => {
    onSelectSound(type, fileName);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-[#f4ddc4] w-full max-w-md max-h-[90vh] overflow-y-auto p-4 relative m-4 border border-black/10"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-light">
                {t('galeriaZvukovychTemat')}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="text-center py-4 text-gray-600">
                <p>{t('loading')}...</p>
              </div>
            )}

            {/* Textový seznam skladeb - kompaktní */}
            {!loading && (
              <div className="flex flex-col space-y-2 w-full">
                {audioFiles.map((file) => (
                  <motion.div
                    key={file.id}
                    className="bg-white/50 backdrop-blur rounded-none border border-black/10 p-3 w-full hover:bg-white/70 transition-colors"
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Název skladby */}
                    <div className="mb-2">
                      <h3 className="font-medium text-base">
                        {file.name}
                      </h3>
                    </div>

                    {/* Tlačítka pro výběr */}
                    <div className="flex gap-2">
                      <FramerButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect('in', file.fileName);
                        }}
                        variant={selectedInSound === file.fileName ? 'rounded' : 'secondary'}
                        className="flex-1 py-1.5 text-xs"
                      >
                        {t('zvolteZvukNadech')}
                      </FramerButton>
                      <FramerButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect('out', file.fileName);
                        }}
                        variant={selectedOutSound === file.fileName ? 'rounded' : 'secondary'}
                        className="flex-1 py-1.5 text-xs"
                      >
                        {t('zvolteZvukVydech')}
                      </FramerButton>
                    </div>
                  </motion.div>
                ))}

                {/* Žádný zvuk */}
                <motion.div
                  className="bg-white/50 backdrop-blur rounded-none border border-black/10 p-3 w-full hover:bg-white/70 transition-colors cursor-pointer"
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleFileSelect('in', 'none');
                    handleFileSelect('out', 'none');
                  }}
                >
                  <h3 className="font-medium text-base">
                    {t('ziadnyZvuk')}
                  </h3>
                  {selectedInSound === 'none' && selectedOutSound === 'none' && (
                    <p className="text-xs text-gray-600 mt-1">
                      {t('selected')}
                    </p>
                  )}
                </motion.div>
              </div>
            )}

            {!loading && audioFiles.length === 0 && (
              <div className="text-center py-4 text-gray-600">
                <p>{t('emptyState')}</p>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SoundThemeGallery;
