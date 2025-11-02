import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FramerButton } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

const SoundThemeGallery = ({ isOpen, onClose, onSelectSound, selectedInSound, selectedOutSound, layout = 'grid' }) => {
  const { t } = useLanguage();
  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Debug: zkontroluj layout prop
  useEffect(() => {
    if (isOpen) {
      console.log('SoundThemeGallery layout:', layout);
    }
  }, [isOpen, layout]);

  useEffect(() => {
    if (isOpen) {
      loadMusicFiles();
    }
  }, [isOpen]);

  const loadMusicFiles = async () => {
    try {
      setLoading(true);
      const allMetadata = await realtimeMetadataService.getAllMetadata();

      // Filtruj pouze soubory z kategorie "hudba"
      const musicFiles = Object.values(allMetadata).filter(file => {
        const fileName = file.fileName || '';
        return fileName.startsWith('hudba/') && fileName.endsWith('.mp3');
      });

      // Mapuj na formát pro galerii
      const mappedFiles = musicFiles.map(file => ({
        id: file.fileName,
        fileName: file.fileName,
        fileNameOnly: file.fileNameOnly || file.fileName.split('/').pop(),
        name: file.displayName || file.fileNameOnly || file.fileName.split('/').pop().replace('.mp3', ''),
        downloadURL: file.downloadURL || file.audioSrc,
        coverImage: file.coverImage || file.albumCover || null,
        duration: file.duration || file.durationFormatted || 'N/A'
      }));

      setAudioFiles(mappedFiles);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load music files:', error);
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
            className="bg-[#f4ddc4] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative m-4 border border-black/10"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-light">
                {t('galeriaZvukovychTemat')}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="text-center py-8 text-gray-600">
                <p>{t('loading')}...</p>
              </div>
            )}

            {/* Galerie hudba souborů */}
            {!loading && (
              <div
                className={
                  layout === 'list'
                    ? 'flex flex-col space-y-3 w-full'
                    : 'flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide'
                }
                style={layout === 'list' ? { display: 'flex', flexDirection: 'column' } : {}}
              >
                {audioFiles.map((file) => (
                  <motion.div
                    key={file.id}
                    className={`bg-white/50 backdrop-blur rounded-none border border-black/10 cursor-pointer hover:bg-white/70 transition-colors ${
                      layout === 'list'
                        ? 'p-4 flex items-center gap-4 w-full'
                        : 'p-4 min-w-[calc(33.333%-0.667rem)] flex-shrink-0 sm:min-w-[calc(25%-0.75rem)] md:min-w-[calc(16.666%-0.667rem)] lg:min-w-[calc(12.5%-0.75rem)] snap-start'
                    }`}
                    whileHover={{ scale: layout === 'list' ? 1.01 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Cover obrázek nebo placeholder */}
                    <div className={`${layout === 'list' ? 'w-20 h-20 flex-shrink-0' : 'w-full aspect-square mb-3'} bg-black/5 rounded-none flex items-center justify-center overflow-hidden`}>
                      {file.coverImage ? (
                        <img
                          src={file.coverImage}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${layout === 'list' ? 'text-2xl' : 'text-4xl'} ${file.coverImage ? 'hidden' : ''}`}>
                        🎵
                      </div>
                    </div>

                    {/* Content area */}
                    <div className={`${layout === 'list' ? 'flex-1 flex flex-col' : 'text-center'}`}>
                      {/* Název */}
                      <h3 className={`font-medium ${layout === 'list' ? 'text-lg mb-1' : 'text-base mb-1 line-clamp-2'}`}>
                        {file.name}
                      </h3>

                      {/* Délka */}
                      {file.duration !== 'N/A' && (
                        <p className={`text-gray-500 ${layout === 'list' ? 'text-sm mb-3' : 'text-xs text-center mb-3'}`}>
                          {file.duration}
                        </p>
                      )}

                      {/* Tlačítka pro výběr */}
                      <div className={layout === 'list' ? 'flex gap-2' : 'space-y-2'}>
                        <FramerButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileSelect('in', file.fileName);
                          }}
                          variant={selectedInSound === file.fileName ? 'rounded' : 'secondary'}
                          className={`${layout === 'list' ? 'flex-1 py-2 text-sm' : 'w-full py-2 text-sm'}`}
                        >
                          {t('zvolteZvukNadech')}
                        </FramerButton>
                        <FramerButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileSelect('out', file.fileName);
                          }}
                          variant={selectedOutSound === file.fileName ? 'rounded' : 'secondary'}
                          className={`${layout === 'list' ? 'flex-1 py-2 text-sm' : 'w-full py-2 text-sm'}`}
                        >
                          {t('zvolteZvukVydech')}
                        </FramerButton>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Žádný zvuk */}
                <motion.div
                  className={`bg-white/50 backdrop-blur rounded-none border border-black/10 cursor-pointer hover:bg-white/70 transition-colors ${
                    layout === 'list'
                      ? 'p-4 flex items-center gap-4 w-full'
                      : 'p-4 flex flex-col items-center justify-center'
                  }`}
                  whileHover={{ scale: layout === 'list' ? 1.01 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    handleFileSelect('in', 'none');
                    handleFileSelect('out', 'none');
                  }}
                >
                  <div className={`${layout === 'list' ? 'w-20 h-20 flex-shrink-0 flex items-center justify-center text-4xl' : 'text-6xl mb-3'}`}>
                    🔇
                  </div>
                  <div className={layout === 'list' ? 'flex-1' : ''}>
                    <h3 className={`font-medium ${layout === 'list' ? 'text-lg mb-1' : 'text-lg text-center mb-2'}`}>
                      {t('ziadnyZvuk')}
                    </h3>
                    {layout === 'list' ? (
                      <p className="text-xs text-gray-600">
                        {selectedInSound === 'none' && selectedOutSound === 'none' ? t('selected') : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600 text-center">
                        {selectedInSound === 'none' && selectedOutSound === 'none' ? t('selected') : ''}
                      </p>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {!loading && audioFiles.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                <p>{t('emptyState')}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-black/10 text-center text-sm text-gray-600">
              <p>{t('zobrazitGaleriu')}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SoundThemeGallery;
