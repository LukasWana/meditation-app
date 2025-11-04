import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, MousePointerClick, CheckCircle, Play, Pause, Clock } from 'lucide-react';
import { FramerPageTransition, BackButton } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import Waveform from '@components/Waveform';

const SoundThemeGalleryScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onSelectSound,
  selectedInSound,
  selectedOutSound,
  selectedClickSound,
  selectedFinalSound,
  selectedCountdownSound
}) => {
  // Fallback pro undefined hodnoty
  const safeSelectedInSound = selectedInSound || 'none';
  const safeSelectedOutSound = selectedOutSound || 'none';
  const safeSelectedClickSound = selectedClickSound || 'none';
  const safeSelectedFinalSound = selectedFinalSound || 'none';
  const safeSelectedCountdownSound = selectedCountdownSound || 'none';
  const { t } = useLanguage();

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

  // Funkce pro zjištění, zda je zvuk krátký (<= 1 sekunda)
  const isShortSound = (duration) => {
    const seconds = parseDurationToSeconds(duration);
    return seconds !== null && seconds <= 1;
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
    // Reset kategorie na 'background' při otevření stránky
    setSelectedCategory('background');
    setCurrentPage(0);
    loadMusicFiles();

    // Cleanup při zavření stránky
    return () => {
      // Zastav preview při zavření
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
        previewAudioRef.current = null;
      }
      setPlayingPreview(null);
    };
  }, []);

  const loadMusicFiles = async () => {
    try {
      setLoading(true);
      const allMetadata = await realtimeMetadataService.getAllMetadata();

      console.log('🔍 SoundThemeGalleryScreen: Načteno metadata:', Object.keys(allMetadata).length);

      // Filtruj pouze soubory z kategorie "dychanie" (OGG formát)
      const dychanieFiles = Object.values(allMetadata).filter(file => {
        const fileName = file.fileName || '';
        const isInDychanieFolder = fileName.startsWith('dychanie/');
        const isOggFile = fileName.endsWith('.ogg') || fileName.endsWith('.oga');
        const isMp3File = fileName.endsWith('.mp3'); // Fallback pro MP3

        return isInDychanieFolder && (isOggFile || isMp3File);
      });

      console.log('🫁 SoundThemeGalleryScreen: Filtrováno dychanie souborů:', dychanieFiles.length);

      // KROK 1: Mapuj na formát pro galerii a získej absolutní hodnoty
      const mappedFiles = dychanieFiles.map(file => {
        const fileNameOnly = file.fileNameOnly || file.fileName.split('/').pop();
        const name = file.displayName || file.fileNameOnly || fileNameOnly.replace(/\.(ogg|oga|mp3)$/i, '');

        // Získej waveform data (mohou být absolutní hodnoty 0-32768 nebo normalizované 0-1)
        const waveformData = file.waveformData || file.waveform || null;
        const waveformMax = file.waveformMax || null; // Metadata pro globální normalizaci

        // Generuj popisek, pokud není v metadatech
        const description = file.description || generateDescription(file.fileName, name);

        // Získej duration v sekundách (číslo) pro kontrolu krátkých zvuků
        const durationRaw = file.duration || file.durationFormatted || 'N/A';
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
          durationSeconds: durationSeconds,
          waveformData: waveformData,
          waveformMax: waveformMax
        };
      });

      // KROK 2: Vypočítej globální maximum ze všech souborů pro globální normalizaci
      let globalMax = 0;
      let hasAbsoluteValues = false;

      mappedFiles.forEach(file => {
        if (file.waveformData && Array.isArray(file.waveformData) && file.waveformData.length > 0) {
          const maxValue = Math.max(...file.waveformData);

          if (maxValue > 1) {
            hasAbsoluteValues = true;
            globalMax = Math.max(globalMax, maxValue);
          } else if (file.waveformMax && file.waveformMax > 1) {
            hasAbsoluteValues = true;
            globalMax = Math.max(globalMax, file.waveformMax);
          } else {
            globalMax = Math.max(globalMax, maxValue);
          }
        }
      });

      // KROK 3: Ulož globální maximum do každého souboru pro globální normalizaci
      mappedFiles.forEach(file => {
        file.globalMax = globalMax > 0 ? globalMax : 1;
      });

      console.log('🫁 SoundThemeGalleryScreen: Zmapováno souborů:', mappedFiles.length);
      setAudioFiles(mappedFiles);
      setLoading(false);
    } catch (error) {
      console.error('❌ Failed to load dychanie files:', error);
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

  const handleFileSelect = (type, fileName) => {
    console.log('🔊 SoundThemeGalleryScreen: handleFileSelect called', { type, fileName, onSelectSound: typeof onSelectSound });
    if (!onSelectSound) {
      console.error('❌ SoundThemeGalleryScreen: onSelectSound is not defined!');
      return;
    }
    try {
      onSelectSound(type, fileName);
      console.log('✅ SoundThemeGalleryScreen: onSelectSound called successfully', { type, fileName });
    } catch (error) {
      console.error('❌ SoundThemeGalleryScreen: Error calling onSelectSound:', error);
    }
  };

  return (
    <FramerPageTransition screenKey="sound-theme-gallery">
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('breath')} />

        <div className="max-w-md w-full mt-16 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-light">
              {t('galeriaZvukovychTemat')}
            </h2>
          </div>

          {/* Kategorie záložky */}
          {!loading && (
            <div className="mb-4 flex flex-wrap gap-2">
              {/* Ostatní kategorie - zobrazí se pouze pokud existují */}
              {categories.length > 0 && (
                <>
                  {/* Všechny */}
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                      selectedCategory === 'all'
                        ? 'bg-black text-white'
                        : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                    }`}
                    type="button"
                  >
                    <span className="hidden sm:inline">Vše</span>
                    <span className="sm:hidden">A</span>
                  </button>

                  {/* Background */}
                  {categories.includes('background') && (
                    <button
                      onClick={() => setSelectedCategory('background')}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                        selectedCategory === 'background'
                          ? 'bg-black text-white'
                          : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                      }`}
                      type="button"
                      title="Background"
                    >
                      <span className="hidden sm:inline">Background</span>
                      <span className="sm:hidden">BG</span>
                    </button>
                  )}

                  {/* Mnich */}
                  {categories.includes('mnich') && (
                    <button
                      onClick={() => setSelectedCategory('mnich')}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                        selectedCategory === 'mnich'
                          ? 'bg-black text-white'
                          : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                      }`}
                      type="button"
                      title="Mnich"
                    >
                      <span className="hidden sm:inline">Mnich</span>
                      <span className="sm:hidden">MN</span>
                    </button>
                  )}

                  {/* Krátké */}
                  {categories.includes('kratke') && (
                    <button
                      onClick={() => setSelectedCategory('kratke')}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                        selectedCategory === 'kratke'
                          ? 'bg-black text-white'
                          : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                      }`}
                      type="button"
                      title="Krátké zvuky"
                    >
                      <span className="hidden sm:inline">Krátké</span>
                      <span className="sm:hidden">OT/PT</span>
                    </button>
                  )}

                  {/* PT Voice */}
                  {categories.includes('pt_voice') && (
                    <button
                      onClick={() => setSelectedCategory('pt_voice')}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                        selectedCategory === 'pt_voice'
                          ? 'bg-black text-white'
                          : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                      }`}
                      type="button"
                      title="PT Voice"
                    >
                      <span className="hidden sm:inline">PT Voice</span>
                      <span className="sm:hidden">PTV</span>
                    </button>
                  )}
                </>
              )}

              {/* Silence - poslední záložka (vždy zobrazena) */}
              <button
                onClick={() => setSelectedCategory('silence')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                  selectedCategory === 'silence'
                    ? 'bg-black text-white'
                    : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                }`}
                type="button"
                title="Silence"
              >
                <span className="hidden sm:inline">Silence</span>
                <span className="sm:hidden">🔇</span>
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-center py-4 text-gray-600">
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
                className="bg-white/50 backdrop-blur rounded-lg border border-black/10 p-3 hover:bg-white/70 transition-colors flex flex-col"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-full mb-2 flex items-center justify-center mt-1">
                  <div className="w-full h-[50px] flex items-center justify-center bg-gray-100 rounded">
                    <span className="text-gray-400 text-sm">{t('ziadnyZvuk') || 'Žádný zvuk - všechny události'}</span>
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
                      handleFileSelect('countdown', 'none');
                    }}
                    className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                      safeSelectedInSound === 'none' && safeSelectedOutSound === 'none' && safeSelectedClickSound === 'none' && safeSelectedFinalSound === 'none' && safeSelectedCountdownSound === 'none'
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                    }`}
                    title={t('ziadnyZvuk') || 'Žádný zvuk pro všechny'}
                    type="button"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <div className="flex-1"></div>
                  <div className="flex-1"></div>
                  <div className="flex-1"></div>
                  <div className="flex-1"></div>
                </div>
              </motion.div>

              {/* Druhá položka: Jednotlivé události */}
              <motion.div
                className="bg-white/50 backdrop-blur rounded-lg border border-black/10 p-3 hover:bg-white/70 transition-colors flex flex-col"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-full mb-2 flex items-center justify-center mt-1">
                  <div className="w-full h-[50px] flex items-center justify-center bg-gray-100 rounded">
                    <span className="text-gray-400 text-sm">{t('zvolteProJednotliveUdalosti') || 'Žádný zvuk pro jednotlivé události'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {/* Tlačítko nádech - žádný zvuk */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔊 Clicked IN button for: none, Current selected:', safeSelectedInSound);
                      handleFileSelect('in', 'none');
                    }}
                    className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                      safeSelectedInSound === 'none'
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                    }`}
                    title={t('zvolteZvukNadech') || 'Nádech - žádný zvuk'}
                    type="button"
                  >
                    <ArrowDown size={16} />
                  </button>

                  {/* Tlačítko výdech - žádný zvuk */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔊 Clicked OUT button for: none, Current selected:', safeSelectedOutSound);
                      handleFileSelect('out', 'none');
                    }}
                    className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                      safeSelectedOutSound === 'none'
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                    }`}
                    title={t('zvolteZvukVydech') || 'Výdech - žádný zvuk'}
                    type="button"
                  >
                    <ArrowUp size={16} />
                  </button>

                  {/* Tlačítko kliknutí - žádný zvuk */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔊 Clicked CLICK button for: none, Current selected:', safeSelectedClickSound);
                      handleFileSelect('click', 'none');
                    }}
                    className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                      safeSelectedClickSound === 'none'
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                    }`}
                    title={t('zvolteZvukKliknuti') || 'Kliknutí - žádný zvuk'}
                    type="button"
                  >
                    <MousePointerClick size={16} />
                  </button>

                  {/* Tlačítko finální - žádný zvuk */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔊 Clicked FINAL button for: none, Current selected:', safeSelectedFinalSound);
                      handleFileSelect('final', 'none');
                    }}
                    className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                      safeSelectedFinalSound === 'none'
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                    }`}
                    title={t('zvolteZvukFinalni') || 'Finální - žádný zvuk'}
                    type="button"
                  >
                    <CheckCircle size={16} />
                  </button>

                  {/* Tlačítko odpočítávání - žádný zvuk */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔊 Clicked COUNTDOWN button for: none, Current selected:', safeSelectedCountdownSound);
                      handleFileSelect('countdown', 'none');
                    }}
                    className={`flex-1 p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                      safeSelectedCountdownSound === 'none'
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                    }`}
                    title={t('zvolteZvukOdpocitavani') || 'Odpočítávání - žádný zvuk'}
                    type="button"
                  >
                    <Clock size={16} />
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Grid seznam skladeb - dva sloupce */}
          {!loading && (
            <div className="grid grid-cols-2 gap-3 w-full">
              {currentPageFiles.map((file) => (
                <motion.div
                  key={file.id}
                  className="bg-white/50 backdrop-blur rounded-lg border border-black/10 p-3 hover:bg-white/70 transition-colors flex flex-col"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Název a popisek */}
                  <div className="mb-2">
                    <div className="text-sm font-medium text-gray-800 mb-1 line-clamp-1">
                      {file.name}
                    </div>
                    {file.description && (
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {file.description}
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePreview(file);
                      }}
                      className={`p-2 rounded-full transition-colors flex items-center justify-center flex-shrink-0 ${
                        playingPreview === file.fileName
                          ? 'bg-black text-white hover:bg-gray-800'
                          : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
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

                  {/* 4 ikonky pro přiřazení zvuku - pod waveformou */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {/* Zkontroluj, zda je zvuk krátký (<= 1s) */}
                    {isShortSound(file.duration) ? (
                      <>
                        {/* Pro krátké zvuky: countdown tlačítko místo nádech/výdech */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🔊 Clicked COUNTDOWN button for:', file.fileName, 'Current selected:', safeSelectedCountdownSound);
                            handleFileSelect('countdown', file.fileName);
                          }}
                          className={`flex-1 min-w-[60px] p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                            safeSelectedCountdownSound === file.fileName
                              ? 'bg-black text-white hover:bg-gray-800'
                              : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                          }`}
                          title={t('zvolteZvukOdpocitavani') || 'Odpočítávání'}
                          type="button"
                        >
                          <Clock size={16} />
                        </button>

                        {/* Nádech a výdech jsou zakázané pro krátké zvuky */}
                        <div className="flex-1 min-w-[60px] p-2 rounded flex items-center justify-center opacity-30 cursor-not-allowed">
                          <ArrowDown size={16} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-[60px] p-2 rounded flex items-center justify-center opacity-30 cursor-not-allowed">
                          <ArrowUp size={16} className="text-gray-400" />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Pro dlouhé zvuky: normální tlačítka nádech/výdech (countdown není dostupné) */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🔊 Clicked IN button for:', file.fileName, 'Current selected:', safeSelectedInSound);
                            handleFileSelect('in', file.fileName);
                          }}
                          className={`flex-1 min-w-[60px] p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                            safeSelectedInSound === file.fileName
                              ? 'bg-black text-white hover:bg-gray-800'
                              : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                          }`}
                          title={t('zvolteZvukNadech') || 'Nádech'}
                          type="button"
                        >
                          <ArrowDown size={16} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🔊 Clicked OUT button for:', file.fileName, 'Current selected:', safeSelectedOutSound);
                            handleFileSelect('out', file.fileName);
                          }}
                          className={`flex-1 min-w-[60px] p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                            safeSelectedOutSound === file.fileName
                              ? 'bg-black text-white hover:bg-gray-800'
                              : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                          }`}
                          title={t('zvolteZvukVydech') || 'Výdech'}
                          type="button"
                        >
                          <ArrowUp size={16} />
                        </button>

                        {/* Countdown není dostupné pro dlouhé zvuky - zobrazíme ho jako disabled */}
                        <div className="flex-1 min-w-[60px] p-2 rounded flex items-center justify-center opacity-30 cursor-not-allowed" title="Dostupné pouze pro krátké zvuky (≤1s)">
                          <Clock size={16} className="text-gray-400" />
                        </div>
                      </>
                    )}

                    {/* Tlačítko kliknutí - ikona myš (pro všechny zvuky) */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔊 Clicked CLICK button for:', file.fileName, 'Current selected:', safeSelectedClickSound);
                        handleFileSelect('click', file.fileName);
                      }}
                      className={`flex-1 min-w-[60px] p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                        safeSelectedClickSound === file.fileName
                          ? 'bg-black text-white hover:bg-gray-800'
                          : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                      }`}
                      title={t('zvolteZvukKliknuti') || 'Kliknutí'}
                      type="button"
                    >
                      <MousePointerClick size={16} />
                    </button>

                    {/* Tlačítko finální zvuk - ikona check (pro všechny zvuky) */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔊 Clicked FINAL button for:', file.fileName, 'Current selected:', safeSelectedFinalSound);
                        handleFileSelect('final', file.fileName);
                      }}
                      className={`flex-1 min-w-[60px] p-2 rounded transition-colors flex items-center justify-center cursor-pointer ${
                        safeSelectedFinalSound === file.fileName
                          ? 'bg-black text-white hover:bg-gray-800'
                          : 'bg-white/70 hover:bg-white text-gray-700 border border-black/10'
                      }`}
                      title={t('zvolteZvukFinalni') || 'Finální'}
                      type="button"
                    >
                      <CheckCircle size={16} />
                    </button>
                  </div>
                </motion.div>
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
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default SoundThemeGalleryScreen;

