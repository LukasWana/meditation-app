import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDown, ArrowUp, MousePointerClick, CheckCircle } from 'lucide-react';
import { useLanguage } from '@contexts/LanguageContext';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import Waveform from './Waveform';

const SoundThemeGallery = ({ isOpen, onClose, onSelectSound, selectedInSound, selectedOutSound, selectedClickSound, selectedFinalSound }) => {
  // Fallback pro undefined hodnoty
  const safeSelectedInSound = selectedInSound || 'none';
  const safeSelectedOutSound = selectedOutSound || 'none';
  const safeSelectedClickSound = selectedClickSound || 'none';
  const safeSelectedFinalSound = selectedFinalSound || 'none';
  const { t } = useLanguage();

  // Debug logging pro kontrolu props
  useEffect(() => {
    console.log('🔍 SoundThemeGallery props changed:', {
      selectedInSound,
      selectedOutSound,
      selectedClickSound,
      selectedFinalSound,
      safeSelectedClickSound,
      safeSelectedFinalSound,
      isOpen
    });
  }, [isOpen, selectedInSound, selectedOutSound, selectedClickSound, selectedFinalSound]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (isOpen) {
      loadMusicFiles();
    }

    // Cleanup při zavření galerie
    return () => {
      // Cleanup (žádný preview audio)
    };
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

      // KROK 1: Mapuj na formát pro galerii a získej absolutní hodnoty
      const mappedFiles = dychanieFiles.map(file => {
        const fileNameOnly = file.fileNameOnly || file.fileName.split('/').pop();
        const name = file.displayName || file.fileNameOnly || fileNameOnly.replace(/\.(ogg|oga|mp3)$/i, '');

        // Získej waveform data (mohou být absolutní hodnoty 0-32768 nebo normalizované 0-1)
        const waveformData = file.waveformData || file.waveform || null;
        const waveformMax = file.waveformMax || null; // Metadata pro globální normalizaci

        // ✅ DEBUG: Ověř, zda má každý soubor unikátní data
        if (waveformData && Array.isArray(waveformData) && waveformData.length > 0) {
          const first5 = waveformData.slice(0, 5);
          const last5 = waveformData.slice(-5);
          const maxVal = Math.max(...waveformData);
          const minVal = Math.min(...waveformData);
          const avgVal = waveformData.reduce((a, b) => a + b, 0) / waveformData.length;

          console.log(`🔍 ${file.fileName}:`, {
            samples: waveformData.length,
            first5: first5.map(v => v.toFixed(2)),
            last5: last5.map(v => v.toFixed(2)),
            min: minVal.toFixed(2),
            max: maxVal.toFixed(2),
            avg: avgVal.toFixed(2),
            isAbsolute: maxVal > 1,
            // Zkontroluj, zda jsou data stejná jako u předchozího souboru
            firstValue: waveformData[0]?.toFixed(4),
            lastValue: waveformData[waveformData.length - 1]?.toFixed(4)
          });
        } else {
          console.warn(`⚠️ ${file.fileName}: NEMÁ waveformData!`);
        }

        return {
          id: file.fileName,
          fileName: file.fileName,
          fileNameOnly: fileNameOnly,
          name: name,
          downloadURL: file.downloadURL || file.audioSrc,
          coverImage: file.coverImage || file.albumCover || null,
          duration: file.duration || file.durationFormatted || 'N/A',
          waveformData: waveformData, // Absolutní hodnoty (0-32768) nebo normalizované (0-1)
          waveformMax: waveformMax     // Metadata pro globální normalizaci
        };
      });

      // KROK 2: Vypočítej globální maximum ze všech souborů pro globální normalizaci
      // ✅ KRITICKÉ: Globální normalizace zajistí, že soubory s různými průměry vypadají odlišně
      // I když mají podobný max (0.81-0.82), různé průměry (0.51, 0.46, 0.40) se projeví
      let globalMax = 0;
      let hasAbsoluteValues = false;

      mappedFiles.forEach(file => {
        if (file.waveformData && Array.isArray(file.waveformData) && file.waveformData.length > 0) {
          const maxValue = Math.max(...file.waveformData);

          // Zkontroluj, zda jsou to absolutní hodnoty (větší než 1)
          if (maxValue > 1) {
            hasAbsoluteValues = true;
            globalMax = Math.max(globalMax, maxValue);
          } else if (file.waveformMax && file.waveformMax > 1) {
            hasAbsoluteValues = true;
            globalMax = Math.max(globalMax, file.waveformMax);
          } else {
            // Pro normalizovaná data (0-1) také najdeme globální maximum
            globalMax = Math.max(globalMax, maxValue);
          }
        }
      });

      // KROK 3: Ulož globální maximum do každého souboru pro globální normalizaci
      // ✅ KRITICKÉ: Použijeme globální normalizaci místo lokální!
      // Všechny soubory budou normalizovány podle stejného globálního maxima
      // To zachová skutečné rozdíly mezi soubory s různými průměry
      mappedFiles.forEach(file => {
        file.globalMax = globalMax > 0 ? globalMax : 1; // Ulož globální maximum do každého souboru
      });

      // ✅ DEBUG: Zobraz globální maximum a hodnoty pro každý soubor
      console.log(`🌊 Globální maximum pro normalizaci: ${globalMax.toFixed(4)}`);
      mappedFiles.slice(0, 3).forEach(file => {
        if (file.waveformData && Array.isArray(file.waveformData) && file.waveformData.length > 0) {
          const maxValue = Math.max(...file.waveformData);
          const avgValue = file.waveformData.reduce((a, b) => a + b, 0) / file.waveformData.length;
          const first5 = file.waveformData.slice(0, 5);
          console.log(`📊 ${file.fileName}: max=${maxValue.toFixed(4)}, avg=${avgValue.toFixed(4)}, globalMax=${file.globalMax?.toFixed(4)}, first5=${first5.map(v => v.toFixed(2)).join(',')}`);
        }
      });

      if (hasAbsoluteValues) {
        console.log(`🌊 Nalezeno absolutních hodnot - globální maximum: ${globalMax.toFixed(2)}`);
        console.log(`🌊 Použijeme globální normalizaci pro zachování rozdílů mezi soubory`);

        mappedFiles.forEach(file => {
          if (file.waveformData && Array.isArray(file.waveformData) && file.waveformData.length > 0) {
            const maxValue = Math.max(...file.waveformData);
            const minValue = Math.min(...file.waveformData);
            const avgValue = file.waveformData.reduce((a, b) => a + b, 0) / file.waveformData.length;

            if (maxValue > 1) {
              // Absolutní hodnoty - ZACHOVÁME je tak jak jsou!
              // Normalizace bude provedena v drawWaveformFromData podle vlastního maxima
              console.log(`✅ Zachováno ${file.fileName}: min=${minValue.toFixed(2)}, max=${maxValue.toFixed(2)}, avg=${avgValue.toFixed(2)} (absolutní hodnoty)`);
            } else {
              // Stará normalizovaná data (0-1) - potřebují být znovu vygenerována
              console.warn(`⚠️ ${file.fileName} má stará normalizovaná data (0-1) - potřebuje být znovu vygenerován s absolutními hodnotami`);
            }
          }
        });
      } else {
        console.warn('⚠️ Nenašli jsme absolutní hodnoty - možná jsou všechna data stále normalizovaná na 0-1');
        console.warn('⚠️ Pro správné zobrazení je potřeba znovu vygenerovat waveformy pomocí "🚀 Automatická synchronizace všech souborů"');
      }

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
    console.log('🔊 SoundThemeGallery: handleFileSelect called', { type, fileName, onSelectSound: typeof onSelectSound });
    if (!onSelectSound) {
      console.error('❌ SoundThemeGallery: onSelectSound is not defined!');
      return;
    }
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

            {/* Grid seznam skladeb - dva sloupce */}
            {!loading && (
              <div className="grid grid-cols-2 gap-3 w-full">
                {audioFiles.map((file) => (
                  <motion.div
                    key={file.id}
                    className="bg-white/50 backdrop-blur rounded-lg border border-black/10 p-3 hover:bg-white/70 transition-colors flex flex-col"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Waveforma */}
                    <div className="w-full mb-2 flex items-center justify-center">
                      {/* ✅ DEBUG: Zobraz globalMax před předáním */}
                      {console.log(`🔍 SoundThemeGallery rendering ${file.fileName}:`, {
                        hasWaveformData: !!file.waveformData,
                        waveformDataLength: file.waveformData?.length || 0,
                        globalMax: file.globalMax?.toFixed(4) || 'NULL',
                        first5: file.waveformData?.slice(0, 5).map(v => v.toFixed(2)) || []
                      })}
                      <Waveform
                        key={`${file.fileName}-${file.globalMax || 'no-globalMax'}`} // ✅ KEY: Force re-render when globalMax changes
                        audioUrl={file.downloadURL}
                        waveformData={file.waveformData}
                        globalMax={file.globalMax} // ✅ Přidej globální maximum pro globální normalizaci
                        width={150}
                        height={50}
                        color="#6b7280"
                      />
                    </div>

                    {/* 4 ikonky pro přiřazení zvuku - pod waveformou */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {/* Tlačítko nádech - ikona šipka dolů */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFileSelect('in', file.fileName);
                        }}
                        className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                          safeSelectedInSound === file.fileName
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/70 hover:bg-white text-gray-700'
                        }`}
                        title={t('zvolteZvukNadech') || 'Nádech'}
                        type="button"
                      >
                        <ArrowDown size={16} />
                      </button>

                      {/* Tlačítko výdech - ikona šipka nahoru */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFileSelect('out', file.fileName);
                        }}
                        className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                          safeSelectedOutSound === file.fileName
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/70 hover:bg-white text-gray-700'
                        }`}
                        title={t('zvolteZvukVydech') || 'Výdech'}
                        type="button"
                      >
                        <ArrowUp size={16} />
                      </button>

                      {/* Tlačítko kliknutí - ikona myš */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFileSelect('click', file.fileName);
                        }}
                        className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                          safeSelectedClickSound === file.fileName
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/70 hover:bg-white text-gray-700'
                        }`}
                        title={t('zvolteZvukKliknuti') || 'Kliknutí'}
                        type="button"
                      >
                        <MousePointerClick size={16} />
                      </button>

                      {/* Tlačítko finální zvuk - ikona check */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleFileSelect('final', file.fileName);
                        }}
                        className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                          safeSelectedFinalSound === file.fileName
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/70 hover:bg-white text-gray-700'
                        }`}
                        title={t('zvolteZvukFinalni') || 'Finální'}
                        type="button"
                      >
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Žádný zvuk */}
                <motion.div
                  className="relative bg-white/50 backdrop-blur rounded-lg border border-black/10 p-3 hover:bg-white/70 transition-colors flex flex-col col-span-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleFileSelect('in', 'none');
                    handleFileSelect('out', 'none');
                    handleFileSelect('click', 'none');
                    handleFileSelect('final', 'none');
                  }}
                >
                  <div className="w-full mb-2 flex items-center justify-center mt-1">
                    <div className="w-[150px] h-[50px] flex items-center justify-center bg-gray-100 rounded">
                      <span className="text-gray-400 text-sm">{t('ziadnyZvuk')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFileSelect('in', 'none');
                        handleFileSelect('out', 'none');
                        handleFileSelect('click', 'none');
                        handleFileSelect('final', 'none');
                      }}
                      className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                        safeSelectedInSound === 'none' && safeSelectedOutSound === 'none' && safeSelectedClickSound === 'none' && safeSelectedFinalSound === 'none'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/70 hover:bg-white text-gray-700'
                      }`}
                      title={t('ziadnyZvuk') || 'Žádný zvuk'}
                      type="button"
                    >
                      <X size={16} />
                    </button>
                    <div className="flex-1"></div>
                    <div className="flex-1"></div>
                    <div className="flex-1"></div>
                  </div>
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
