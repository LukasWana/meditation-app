import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDown, ArrowUp, MousePointerClick, CheckCircle, Play, Pause, Clock } from 'lucide-react';
import { useLanguage } from '@contexts/LanguageContext';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import { useTheme, getCardClasses, getToggleButtonClasses, getOverlayColor } from '@hooks/useTheme';
import { sanitizeFileName } from '@utils/validation';
import Waveform from './Waveform';

// Memoizovaná komponenta pro file item - snižuje re-rendery
const SoundFileItem = React.memo(({ file, playingPreview, onPreview }) => {
  const handlePreviewClick = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onPreview(file);
  }, [file, onPreview]);

  const isPlaying = playingPreview === file.fileName;
  const sanitizedName = React.useMemo(() => sanitizeFileName(file.name), [file.name]);
  const sanitizedDescription = React.useMemo(() => file.description ? sanitizeFileName(file.description) : null, [file.description]);

  return (
    <motion.div
      className="bg-white/50 backdrop-blur rounded-lg border border-black/10 p-3 hover:bg-white/70 transition-colors flex flex-col"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Název a popisek */}
      <div className="mb-2">
        <div className="text-sm font-medium text-gray-800 mb-1 line-clamp-1">
          {sanitizedName}
        </div>
        {sanitizedDescription && (
          <div className="text-xs text-gray-600 line-clamp-2">
            {sanitizedDescription}
          </div>
        )}
      </div>

      {/* Waveforma a preview tlačítko */}
      <div className="w-full mb-2 flex items-center justify-between gap-2">
        {/* Waveforma - vyplní zbytek prostoru */}
        <div className="flex-1 min-w-0">
          <Waveform
            key={`${file.fileName}-${file.globalMax || 'no-globalMax'}`}
            audioUrl={file.downloadURL}
            waveformData={file.waveformData}
            globalMax={file.globalMax}
            width="100%"
            height={50}
            color="#6b7280"
          />
        </div>
        {/* Preview tlačítko - zarovnané doprava */}
        <button
          onClick={handlePreviewClick}
          className={`p-2 rounded-full transition-colors flex items-center justify-center flex-shrink-0 ${
            isPlaying
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
          }`}
          title={isPlaying ? 'Zastavit' : 'Přehrát'}
          type="button"
        >
          {isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} />
          )}
        </button>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison pro lepší memoizaci
  return (
    prevProps.file.id === nextProps.file.id &&
    prevProps.playingPreview === nextProps.playingPreview &&
    prevProps.file.fileName === nextProps.file.fileName &&
    prevProps.file.downloadURL === nextProps.file.downloadURL
  );
});

SoundFileItem.displayName = 'SoundFileItem';

const SoundThemeGallery = ({ isOpen, onClose, onSelectSound, selectedInSound, selectedOutSound, selectedClickSound, selectedFinalSound, selectedCountdownSound }) => {
  // Fallback pro undefined hodnoty
  const safeSelectedInSound = selectedInSound || 'none';
  const safeSelectedOutSound = selectedOutSound || 'none';
  const safeSelectedClickSound = selectedClickSound || 'none';
  const safeSelectedFinalSound = selectedFinalSound || 'none';
  const safeSelectedCountdownSound = selectedCountdownSound || 'none';
  const { t } = useLanguage();
  const theme = useTheme();
  const cardClasses = getCardClasses('default');

  // Helper komponenta pro toggle buttony
  const ToggleButton = ({ isActive, onClick, children, className = '', ...props }) => {
    const toggleClasses = getToggleButtonClasses(isActive);
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${toggleClasses.className} ${className}`}
        style={toggleClasses.style}
        onMouseEnter={toggleClasses.hoverStyle && !isActive ? (e) => {
          if (e.currentTarget) {
            Object.assign(e.currentTarget.style, toggleClasses.hoverStyle);
          }
        } : undefined}
        onMouseLeave={toggleClasses.hoverStyle && !isActive ? (e) => {
          if (e.currentTarget) {
            Object.assign(e.currentTarget.style, toggleClasses.style);
          }
        } : undefined}
        {...props}
      >
        {children}
      </button>
    );
  };

  // Funkce pro parsování délky zvuku v sekundách
  const parseDurationToSeconds = (duration) => {
    if (!duration || duration === 'N/A') return null;
    if (typeof duration === 'number') return duration;
    if (typeof duration === 'string') {
      // Zkus parsovat jako "mm:ss" nebo "mm:ss:ms"
      const parts = duration.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        if (!isNaN(minutes) && !isNaN(seconds)) {
          return minutes * 60 + seconds;
        }
      } else if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2], 10);
        if (!isNaN(hours) && !isNaN(minutes) && !isNaN(seconds)) {
          return hours * 3600 + minutes * 60 + seconds;
        }
      }
      // Zkus parsovat jako číslo
      const num = parseFloat(duration);
      if (!isNaN(num)) return num;
    }
    return null;
  };


  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingPreview, setPlayingPreview] = useState(null); // Aktuálně přehrávaný soubor
  const previewAudioRef = useRef(null); // Audio element pro preview
  const [selectedCategory, setSelectedCategory] = useState('background'); // Vybraná kategorie (výchozí: background)
  const [currentPage, setCurrentPage] = useState(0); // Aktuální stránka pro paginaci
  const filesPerPage = 12; // Počet souborů na stránku

  // Funkce pro určení kategorie souboru podle názvu
  const getFileCategory = (fileName) => {
    const fileNameOnly = fileName.split('/').pop().toLowerCase();

    // Zkontroluj prefix v názvu souboru
    // POZOR: pt_voice musí být před pt, protože pt_voice začíná také "pt"
    if (fileNameOnly.startsWith('bg')) {
      return 'background';
    } else if (fileNameOnly.startsWith('mn')) {
      return 'mnich';
    } else if (fileNameOnly.includes('pt_voice') || fileNameOnly.startsWith('pt_voice')) {
      return 'pt_voice';
    } else if (fileNameOnly.startsWith('ot') || fileNameOnly.startsWith('pt')) {
      return 'kratke';
    }
    return 'other';
  };

  // Funkce pro automatické generování popisku podle názvu souboru
  const generateDescription = (fileName, displayName) => {
    const fileNameLower = fileName.toLowerCase();
    const nameLower = (displayName || '').toLowerCase();

    // Slovník klíčových slov a jejich popisů
    const keywordMap = {
      'prana': 'Pranayama dechové cvičení',
      'pranayama': 'Pranayama dechové cvičení',
      'breath': 'Dechové cvičení',
      'dychani': 'Dechové cvičení',
      'dychanie': 'Dechové cvičení',
      'dych': 'Dech',
      'inhale': 'Nádech',
      'exhale': 'Výdech',
      'nadech': 'Nádech',
      'vydech': 'Výdech',
      'ocean': 'Oceánský dech',
      'wave': 'Vlnění',
      'water': 'Voda',
      'fire': 'Oheň',
      'wind': 'Vítr',
      'forest': 'Les',
      'nature': 'Příroda',
      'meditation': 'Meditace',
      'mindful': 'Mindfulness',
      'calm': 'Klid',
      'peace': 'Mír',
      'zen': 'Zen',
      'bell': 'Zvon',
      'gong': 'Gong',
      'singing': 'Zpěv',
      'bowl': 'Mísa',
      'tibetan': 'Tibetská',
      'chakra': 'Čakra',
      'mantra': 'Mantra',
      'om': 'Óm',
      'hum': 'Hmm',
      'background': 'Pozadí',
      'ambient': 'Ambientní',
      'soft': 'Jemné',
      'gentle': 'Jemné',
      'deep': 'Hluboké',
      'slow': 'Pomalé',
      'fast': 'Rychlé',
      'long': 'Dlouhé',
      'short': 'Krátké'
    };

    // Zkontroluj klíčová slova v názvu
    for (const [keyword, description] of Object.entries(keywordMap)) {
      if (fileNameLower.includes(keyword) || nameLower.includes(keyword)) {
        // Pokud je to kombinace více klíčových slov, zkus vytvořit složitější popisek
        if (fileNameLower.includes('prana') || fileNameLower.includes('pranayama')) {
          if (fileNameLower.includes('breath') || fileNameLower.includes('dych')) {
            return 'Pranayama dechové cvičení - harmonické dýchání';
          }
        }
        if (fileNameLower.includes('ocean')) {
          if (fileNameLower.includes('breath') || fileNameLower.includes('dych')) {
            return 'Oceánský dech - uklidňující dechové cvičení';
          }
        }
        return description;
      }
    }

    // Pokud nic neodpovídá, zkus vytvořit popisek z displayName
    if (displayName) {
      const cleanName = displayName
        .split(/[-_\s]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return `${cleanName} - dechové cvičení`;
    }

    // Fallback
    return 'Dechové cvičení';
  };

  // Získání unikátních kategorií z načtených souborů
  const categories = React.useMemo(() => {
    const cats = new Set();
    audioFiles.forEach(file => {
      const category = getFileCategory(file.fileName);
      if (category !== 'other') {
        cats.add(category);
      }
    });
    return Array.from(cats);
  }, [audioFiles]);

  // Filtrování souborů podle vybrané kategorie
  const filteredFiles = React.useMemo(() => {
    // Pro kategorii "silence" vrátíme prázdné pole (zobrazí se pouze tlačítko "Žádný zvuk")
    if (selectedCategory === 'silence') {
      return [];
    }

    let files;
    if (selectedCategory === 'all') {
      files = audioFiles;
    } else {
      files = audioFiles.filter(file => getFileCategory(file.fileName) === selectedCategory);
    }
    return files;
  }, [audioFiles, selectedCategory]);

  // Paginace - rozděl soubory na stránky
  const paginatedFiles = React.useMemo(() => {
    const pages = [];
    for (let i = 0; i < filteredFiles.length; i += filesPerPage) {
      pages.push(filteredFiles.slice(i, i + filesPerPage));
    }
    return pages;
  }, [filteredFiles, filesPerPage]);

  // Aktuální stránka souborů
  const currentPageFiles = React.useMemo(() => {
    return paginatedFiles[currentPage] || [];
  }, [paginatedFiles, currentPage]);

  // Reset stránky při změně kategorie
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCategory]);


  useEffect(() => {
    if (isOpen) {
      // Reset kategorie na 'background' při otevření galerie
      setSelectedCategory('background');
      setCurrentPage(0);
      loadMusicFiles();
    }

    // Cleanup při zavření galerie
    return () => {
      // Zastav preview při zavření
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
        previewAudioRef.current = null;
      }
      setPlayingPreview(null);
    };
  }, [isOpen]);

  const loadMusicFiles = async () => {
    try {
      setLoading(true);

      // POČKEJ na inicializaci realtimeMetadataService před použitím
      try {
        const initialized = await realtimeMetadataService.waitForInitialization(10000);
        if (!initialized) {
          console.warn('⚠️ RealtimeMetadataService initialization timeout');
        }
      } catch (err) {
        console.debug('RealtimeMetadataService wait error:', err);
      }

      const allMetadata = await realtimeMetadataService.getAllMetadata();

      // Filtruj pouze soubory z kategorie "dychani" (OGG formát)
      const dychaniFiles = Object.values(allMetadata).filter(file => {
        const fileName = (file.fileName || '').toLowerCase();
        const isInDychaniFolder = fileName.startsWith('dychani/') || fileName.startsWith('dychanie/');
        const isOggFile = fileName.endsWith('.ogg') || fileName.endsWith('.oga');
        const isMp3File = fileName.endsWith('.mp3'); // Fallback pro MP3

        const matches = isInDychaniFolder && (isOggFile || isMp3File);
        return matches;
      });

      // KROK 1: Mapuj na formát pro galerii a získej absolutní hodnoty
      const mappedFiles = dychaniFiles.map(file => {
        const fileNameOnly = file.fileNameOnly || file.fileName.split('/').pop();
        const name = file.displayName || file.fileNameOnly || fileNameOnly.replace(/\.(ogg|oga|mp3)$/i, '');

        // Získej waveform data (mohou být absolutní hodnoty 0-32768 nebo normalizované 0-1)
        const waveformData = file.waveformData || file.waveform || null;
        const waveformMax = file.waveformMax || null; // Metadata pro globální normalizaci

        // Generuj popisek, pokud není v metadatech
        const description = file.description || generateDescription(file.fileName, name);

        // Získej duration v sekundách (číslo) pro kontrolu krátkých zvuků
        // Zkus nejdřív duration jako číslo (sekundy), pak durationFormatted jako string, pak fallback
        const durationRaw = file.duration || file.durationFormatted || 'N/A';
        // Pokud je duration číslo, použij ho přímo, jinak parsuj
        const durationSeconds = typeof file.duration === 'number' ? file.duration : parseDurationToSeconds(durationRaw);

        return {
          id: file.fileName,
          fileName: file.fileName,
          fileNameOnly: fileNameOnly,
          name: name,
          description: description,
          downloadURL: file.downloadURL || file.audioSrc,
          coverImage: file.coverImage || file.albumCover || null,
          duration: durationRaw,
          durationSeconds: durationSeconds, // Duration v sekundách pro kontrolu
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

      if (hasAbsoluteValues) {
        mappedFiles.forEach(file => {
          if (file.waveformData && Array.isArray(file.waveformData) && file.waveformData.length > 0) {
            const maxValue = Math.max(...file.waveformData);
            // const minValue = Math.min(...file.waveformData); // Nevyužíváno - logy deaktivovány
            // const avgValue = file.waveformData.reduce((a, b) => a + b, 0) / file.waveformData.length; // Nevyužíváno - logy deaktivovány

            if (maxValue > 1) {
              // Absolutní hodnoty - ZACHOVÁME je tak jak jsou!
              // Normalizace bude provedena v drawWaveformFromData podle vlastního maxima
            }
          }
        });
      }

      setAudioFiles(mappedFiles);
      setLoading(false);
    } catch (error) {
      console.error('❌ Failed to load dychani files:', error);
      setLoading(false);
    }
  };

  const handlePreview = async (file) => {
    if (!file.downloadURL) {
      console.warn('⚠️ Není dostupná download URL pro preview');
      return;
    }

    // Pokud už se přehrává tento soubor, zastav ho
    if (playingPreview === file.fileName && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
      setPlayingPreview(null);
      return;
    }

    // Zastav aktuálně přehrávaný soubor
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }

    // Vytvoř nový audio element a přehraj
    const audio = new Audio(file.downloadURL);
    audio.volume = 0.7; // Nastav hlasitost na 70%

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
    }
  };


  if (!isOpen) return null;

  const handleFileSelect = (type, fileName) => {
    if (!onSelectSound) {
      console.error('❌ SoundThemeGallery: onSelectSound is not defined!');
      return;
    }
    try {
      onSelectSound(type, fileName);
    } catch (error) {
      console.error('❌ SoundThemeGallery: Error calling onSelectSound:', error);
    }
  };



  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center backdrop-blur-sm"
          style={{
            zIndex: theme.zIndex.modal,
            backgroundColor: getOverlayColor('black', 50)
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto p-4 relative m-4 border"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.overlay.black10,
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2
                style={{
                  fontSize: theme.typography.fontSize['2xl'],
                  fontWeight: theme.typography.fontWeight.light
                }}
              >
                {t('vyberteZvuky')}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full transition-colors"
                style={{
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = getOverlayColor('black', 10);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={theme.sizes.icon.md} />
              </button>
            </div>

            {/* Kategorie záložky */}
            {!loading && (
              <div className="mb-4 flex flex-wrap gap-2">
                {/* Ostatní kategorie - zobrazí se pouze pokud existují */}
                {categories.length > 0 && (
                  <>
                    {/* Všechny */}
                    <ToggleButton
                      isActive={selectedCategory === 'all'}
                      onClick={() => setSelectedCategory('all')}
                    >
                      <span className="hidden sm:inline">Vše</span>
                      <span className="sm:hidden">A</span>
                    </ToggleButton>

                {/* Background */}
                {categories.includes('background') && (
                  <ToggleButton
                    isActive={selectedCategory === 'background'}
                    onClick={() => setSelectedCategory('background')}
                    title="Background"
                  >
                    <span className="hidden sm:inline">Background</span>
                    <span className="sm:hidden">BG</span>
                  </ToggleButton>
                )}

                {/* Mnich */}
                {categories.includes('mnich') && (
                  <ToggleButton
                    isActive={selectedCategory === 'mnich'}
                    onClick={() => setSelectedCategory('mnich')}
                    title="Mnich"
                  >
                    <span className="hidden sm:inline">Mnich</span>
                    <span className="sm:hidden">MN</span>
                  </ToggleButton>
                )}

                {/* Krátké */}
                {categories.includes('kratke') && (
                  <ToggleButton
                    isActive={selectedCategory === 'kratke'}
                    onClick={() => setSelectedCategory('kratke')}
                    title="Krátké zvuky"
                  >
                    <span className="hidden sm:inline">Krátké</span>
                    <span className="sm:hidden">OT/PT</span>
                  </ToggleButton>
                )}

                {/* PT Voice */}
                {categories.includes('pt_voice') && (
                  <ToggleButton
                    isActive={selectedCategory === 'pt_voice'}
                    onClick={() => setSelectedCategory('pt_voice')}
                    title="PT Voice"
                  >
                    <span className="hidden sm:inline">PT Voice</span>
                    <span className="sm:hidden">PTV</span>
                  </ToggleButton>
                )}
                  </>
                )}

                {/* Silence - poslední záložka (vždy zobrazena) */}
                <ToggleButton
                  isActive={selectedCategory === 'silence'}
                  onClick={() => setSelectedCategory('silence')}
                  title="Silence"
                >
                  <span className="hidden sm:inline">Silence</span>
                  <span className="sm:hidden">🔇</span>
                </ToggleButton>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div
                className="text-center py-4"
                style={{ color: theme.colors.gray[600] }}
              >
                <p>{t('loading')}...</p>
              </div>
            )}

            {/* Paginace - zobraz pouze pokud je více než filesPerPage souborů a není vybraná kategorie "silence" */}
            {!loading && selectedCategory !== 'silence' && paginatedFiles.length > 1 && (
              <div className="mb-4 flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                    currentPage === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                  }`}
                  type="button"
                >
                  ←
                </button>
                <span className="text-sm text-gray-700">
                  {currentPage + 1} / {paginatedFiles.length}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(paginatedFiles.length - 1, prev + 1))}
                  disabled={currentPage === paginatedFiles.length - 1}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                    currentPage === paginatedFiles.length - 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                  }`}
                  type="button"
                >
                  →
                </button>
              </div>
            )}

            {/* Tlačítko "Žádný zvuk" - zobrazí se jako první při výběru kategorie "silence" */}
            {!loading && selectedCategory === 'silence' && (
              <div className="mb-4 space-y-3">
                {/* První položka: Všechny události najednou */}
                <motion.div
                  className={`${cardClasses} p-3 flex flex-col`}
                  style={{
                    backgroundColor: theme.colors.overlay.white50,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.overlay.white70;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.overlay.white50;
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full mb-2 flex items-center justify-center mt-1">
                    <div
                      className="w-full flex items-center justify-center rounded"
                      style={{
                        height: '50px',
                        backgroundColor: theme.colors.gray[100],
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: theme.colors.gray[400] }}
                      >
                        {t('ziadnyZvuk') || 'Žádný zvuk - všechny události'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <ToggleButton
                      isActive={safeSelectedInSound === 'none' && safeSelectedOutSound === 'none' && safeSelectedClickSound === 'none' && safeSelectedFinalSound === 'none' && safeSelectedCountdownSound === 'none'}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFileSelect('in', 'none');
                        handleFileSelect('out', 'none');
                        handleFileSelect('click', 'none');
                        handleFileSelect('final', 'none');
                        handleFileSelect('countdown', 'none');
                      }}
                      className="flex-1 p-2 rounded flex items-center justify-center cursor-pointer"
                      title={t('ziadnyZvuk') || 'Žádný zvuk pro všechny'}
                    >
                      <X size={theme.sizes.icon.sm} />
                    </ToggleButton>
                    <div className="flex-1"></div>
                    <div className="flex-1"></div>
                    <div className="flex-1"></div>
                    <div className="flex-1"></div>
                  </div>
                </motion.div>

                {/* Druhá položka: Jednotlivé události */}
                <motion.div
                  className={`${cardClasses} p-3 flex flex-col`}
                  style={{
                    backgroundColor: theme.colors.overlay.white50,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.overlay.white70;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.overlay.white50;
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full mb-2 flex items-center justify-center mt-1">
                    <div
                      className="w-full flex items-center justify-center rounded"
                      style={{
                        height: '50px',
                        backgroundColor: theme.colors.gray[100],
                      }}
                    >
                      <span
                        className="text-sm"
                        style={{ color: theme.colors.gray[400] }}
                      >
                        {t('zvolteProJednotliveUdalosti') || 'Žádný zvuk pro jednotlivé události'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {/* Tlačítko nádech - žádný zvuk */}
                    <ToggleButton
                      isActive={safeSelectedInSound === 'none'}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFileSelect('in', 'none');
                      }}
                      className="flex-1 p-2 rounded flex items-center justify-center cursor-pointer"
                      title={t('zvolteZvukNadech') || 'Nádech - žádný zvuk'}
                    >
                      <ArrowDown size={theme.sizes.icon.sm} />
                    </ToggleButton>

                    {/* Tlačítko výdech - žádný zvuk */}
                    <ToggleButton
                      isActive={safeSelectedOutSound === 'none'}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFileSelect('out', 'none');
                      }}
                      className="flex-1 p-2 rounded flex items-center justify-center cursor-pointer"
                      title={t('zvolteZvukVydech') || 'Výdech - žádný zvuk'}
                    >
                      <ArrowUp size={theme.sizes.icon.sm} />
                    </ToggleButton>

                    {/* Tlačítko kliknutí - žádný zvuk */}
                    <ToggleButton
                      isActive={safeSelectedClickSound === 'none'}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFileSelect('click', 'none');
                      }}
                      className="flex-1 p-2 rounded flex items-center justify-center cursor-pointer"
                      title={t('zvolteZvukKliknuti') || 'Kliknutí - žádný zvuk'}
                    >
                      <MousePointerClick size={theme.sizes.icon.sm} />
                    </ToggleButton>

                    {/* Tlačítko finální - žádný zvuk */}
                    <ToggleButton
                      isActive={safeSelectedFinalSound === 'none'}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFileSelect('final', 'none');
                      }}
                      className="flex-1 p-2 rounded flex items-center justify-center cursor-pointer"
                      title={t('zvolteZvukFinalni') || 'Finální - žádný zvuk'}
                    >
                      <CheckCircle size={theme.sizes.icon.sm} />
                    </ToggleButton>

                    {/* Tlačítko odpočítávání - žádný zvuk */}
                    <ToggleButton
                      isActive={safeSelectedCountdownSound === 'none'}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFileSelect('countdown', 'none');
                      }}
                      className="flex-1 p-2 rounded flex items-center justify-center cursor-pointer"
                      title={t('zvolteZvukOdpocitavani') || 'Odpočítávání - žádný zvuk'}
                    >
                      <Clock size={theme.sizes.icon.sm} />
                    </ToggleButton>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Grid seznam skladeb - dva sloupce */}
            {!loading && (
              <div className="grid grid-cols-2 gap-3 w-full">
                {currentPageFiles.map((file) => (
                  <SoundFileItem
                    key={file.id}
                    file={file}
                    playingPreview={playingPreview}
                    onPreview={handlePreview}
                  />
                ))}
              </div>
            )}

            {!loading && audioFiles.length === 0 && (
              <div className="text-center py-4 text-gray-600">
                <p>{t('emptyState')}</p>
              </div>
            )}

            {!loading && audioFiles.length > 0 && filteredFiles.length === 0 && (
              <div className="text-center py-4 text-gray-600">
                <p>V této kategorii nejsou žádné soubory</p>
              </div>
            )}

            {!loading && currentPageFiles.length === 0 && filteredFiles.length > 0 && (
              <div className="text-center py-4 text-gray-600">
                <p>Žádné soubory na této stránce</p>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SoundThemeGallery;
