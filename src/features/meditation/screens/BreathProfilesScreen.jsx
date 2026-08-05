import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, Play, Download, Upload, Edit2 } from 'lucide-react';
import FramerSection from '@components/FramerSection';
import FramerPageTransition from '@components/FramerPageTransition';
import BackButton from '@components/BackButton';
import { Heading } from '@components/ui/Heading';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
import breathProfilesService from '@services/breathProfilesService';
import { useBreathStore } from '@stores/breathStore';

const BreathProfilesScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  const { t } = useLanguage();
  const { getScreenBackgroundColor, getCurrentThemeColors, colorMode } = useTheme();
  const themeColors = getCurrentThemeColors?.() || {};
  const {
    breathInDuration, breathOutDuration, breathDuration,
    preparationTime, breathInSound, breathOutSound,
    breathClickSound, breathFinalSound, breathCountdownSound,
    breathSoundFadeEnabled,
    setBreathRhythm, setBreathDuration, setPreparationTime,
    setBreathSound, setBreathSoundFadeEnabled,
  } = useBreathStore();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNameInput, setShowNameInput] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [soundMetadataCache, setSoundMetadataCache] = useState({});
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editingProfileName, setEditingProfileName] = useState('');
  const fileInputRef = useRef(null);

  // Načtení profilů při načtení stránky
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading profiles...');
      const loadedProfiles = await breathProfilesService.getAllProfiles();
      console.log('✅ Loaded profiles:', loadedProfiles);
      setProfiles(loadedProfiles);

      if (loadedProfiles.length === 0) {
        console.log('📭 No profiles found');
      }
    } catch (error) {
      console.error('❌ Failed to load profiles:', error);
      alert(t('chybaNacteniProfilu') || 'Chyba při načítání profilů: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Načti metadata zvuků po načtení profilů
  useEffect(() => {
    if (profiles.length > 0) {
      loadSoundMetadataForProfiles(profiles);
    }
  }, [profiles.length]);

  // Načte metadata zvuků pro profily
  const loadSoundMetadataForProfiles = async (profilesToLoad) => {
    const metadataCache = {};
    const soundIds = new Set();

    // Shromážděte všechna unikátní ID zvuků
    profilesToLoad.forEach(profile => {
      if (profile.breathInSound && profile.breathInSound !== 'none') soundIds.add(profile.breathInSound);
      if (profile.breathOutSound && profile.breathOutSound !== 'none') soundIds.add(profile.breathOutSound);
      if (profile.breathClickSound && profile.breathClickSound !== 'none') soundIds.add(profile.breathClickSound);
      if (profile.breathFinalSound && profile.breathFinalSound !== 'none') soundIds.add(profile.breathFinalSound);
      if (profile.breathCountdownSound && profile.breathCountdownSound !== 'none') soundIds.add(profile.breathCountdownSound);
    });

    // Načti metadata pro všechny zvuky
    const metadataPromises = Array.from(soundIds).map(async (soundId) => {
      try {
        const metadata = await breathProfilesService.getSoundMetadata(soundId);
        return { soundId, metadata };
      } catch (error) {
        console.warn(`Failed to load metadata for sound ${soundId}:`, error);
        return { soundId, metadata: null };
      }
    });

    const results = await Promise.all(metadataPromises);
    results.forEach(({ soundId, metadata }) => {
      if (metadata) {
        metadataCache[soundId] = metadata;
      }
    });

    setSoundMetadataCache(metadataCache);
  };

  // Získá název zvuku z cache
  const getSoundName = (soundId) => {
    if (!soundId || soundId === 'none') return null;
    const metadata = soundMetadataCache[soundId];
    if (metadata) {
      return metadata.displayName || metadata.fileName?.split('/').pop()?.replace(/\.(ogg|oga|mp3)$/i, '') || soundId;
    }
    return soundId;
  };

  // Uložení aktuálního nastavení jako nový profil
  const handleSaveCurrentProfile = async () => {
    if (!newProfileName.trim()) {
      alert(t('zadejteNazevProfilu') || 'Zadejte název profilu');
      return;
    }

    try {
      setSaving(true);
      console.log('💾 Saving profile:', newProfileName.trim());
      const profile = {
        name: newProfileName.trim(),
        breathInDuration,
        breathOutDuration,
        breathDuration,
        preparationTime,
        breathInSound: breathInSound || 'none',
        breathOutSound: breathOutSound || 'none',
        breathClickSound: breathClickSound || 'none',
        breathFinalSound: breathFinalSound || 'none',
        breathCountdownSound: breathCountdownSound || 'none',
        breathSoundFadeEnabled: breathSoundFadeEnabled !== undefined ? breathSoundFadeEnabled : true
      };

      console.log('📋 Profile data:', profile);
      const profileId = await breathProfilesService.saveProfile(profile);
      console.log('✅ Profile saved with ID:', profileId);
      setNewProfileName('');
      setShowNameInput(false);
      await loadProfiles();
      alert(t('profilUlozen') || 'Profil byl úspěšně uložen');
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      alert(t('chybaUlozeniProfilu') || 'Chyba při ukládání profilu: ' + (error.message || error));
    } finally {
      setSaving(false);
    }
  };

  // Načtení profilu — zapíšeme přímo do store
  const handleLoadProfile = (profile) => {
    setBreathRhythm(profile.breathInDuration, profile.breathOutDuration);
    setBreathDuration(profile.breathDuration);
    setPreparationTime(profile.preparationTime);
    setBreathSound('breathInSound', profile.breathInSound);
    setBreathSound('breathOutSound', profile.breathOutSound);
    setBreathSound('breathClickSound', profile.breathClickSound);
    setBreathSound('breathFinalSound', profile.breathFinalSound);
    setBreathSound('breathCountdownSound', profile.breathCountdownSound);
    setBreathSoundFadeEnabled(profile.breathSoundFadeEnabled);

    // Vrátit se zpět na stránku dýchání
    onNavigateToScreen('breath');
  };

  // Smazání profilu
  const handleDeleteProfile = async (profileId, e) => {
    e.stopPropagation(); // Zabraň spuštění načtení profilu při kliknutí na smazat
    if (window.confirm(t('opravduSmazatProfil') || 'Opravdu chcete smazat tento profil?')) {
      try {
        await breathProfilesService.deleteProfile(profileId);
        await loadProfiles();
      } catch (error) {
        console.error('Failed to delete profile:', error);
        alert(t('chybaMazaniProfilu') || 'Chyba při mazání profilu');
      }
    }
  };

  // Zahájení editace názvu profilu
  const handleStartEditProfile = (profile, e) => {
    e.stopPropagation();
    setEditingProfileId(profile.id);
    setEditingProfileName(profile.name);
  };

  // Zrušení editace názvu profilu
  const handleCancelEditProfile = () => {
    setEditingProfileId(null);
    setEditingProfileName('');
  };

  // Uložení nového názvu profilu
  const handleSaveProfileName = async (profileId) => {
    if (!editingProfileName.trim()) {
      alert(t('zadejteNazevProfilu') || 'Zadejte název profilu');
      return;
    }

    try {
      setSaving(true);
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) {
        throw new Error('Profil nenalezen');
      }

      // Aktualizuj název profilu
      const updatedProfile = {
        ...profile,
        name: editingProfileName.trim()
      };

      await breathProfilesService.saveProfile(updatedProfile, profileId);
      setEditingProfileId(null);
      setEditingProfileName('');
      await loadProfiles();
      alert(t('profilUlozen') || 'Profil byl úspěšně uložen');
    } catch (error) {
      console.error('Failed to save profile name:', error);
      alert(t('chybaUlozeniProfilu') || 'Chyba při ukládání profilu: ' + (error.message || error));
    } finally {
      setSaving(false);
    }
  };

  // Export profilu do JSON
  const handleExportProfile = async (profile, e) => {
    e.stopPropagation();
    try {
      await breathProfilesService.downloadProfileAsJSON(profile);
      alert(t('profilExportovan') || 'Profil byl exportován');
    } catch (error) {
      console.error('Failed to export profile:', error);
      alert(t('chybaExportuProfilu') || 'Chyba při exportu profilu: ' + (error.message || error));
    }
  };

  // Export všech profilů do JSON
  const handleExportAllProfiles = async () => {
    try {
      console.log('🔄 Starting export of all profiles...');
      console.log('Service methods:', Object.keys(breathProfilesService));

      // Ověření, že funkce existuje
      if (typeof breathProfilesService.downloadAllProfilesAsJSON !== 'function') {
        throw new Error('Funkce downloadAllProfilesAsJSON není dostupná. Zkuste obnovit stránku.');
      }

      await breathProfilesService.downloadAllProfilesAsJSON();
      alert(t('profilExportovan') || 'Všechny profily byly exportovány');
    } catch (error) {
      console.error('Failed to export all profiles:', error);
      alert(t('chybaExportuProfilu') || 'Chyba při exportu profilů: ' + (error.message || error));
    }
  };

  // Import profilu ze souboru
  const handleImportProfile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const importedProfile = await breathProfilesService.importProfileFromFile(file);

      // Zeptej se uživatele, zda chce uložit importovaný profil
      const saveProfile = window.confirm(
        (t('ulozitImportovanyProfil') || 'Uložit importovaný profil: ') + importedProfile.name + '?'
      );

      if (saveProfile) {
        await breathProfilesService.saveProfile(importedProfile);
        await loadProfiles();
        alert(t('profilImportovanAUlozen') || 'Profil byl importován a uložen');
      } else {
        // Pokud nechce uložit, načti ho do aplikace
        handleLoadProfile(importedProfile);
        alert(t('profilImportovanANacten') || 'Profil byl importován a načten');
      }
    } catch (error) {
      console.error('Failed to import profile:', error);
      alert(t('chybaImportuProfilu') || 'Chyba při importu profilu: ' + error.message);
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Otevření dialogu pro výběr souboru
  const handleOpenImportDialog = () => {
    fileInputRef.current?.click();
  };

  // Formátování času
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Formátování času přípravy
  const formatPreparationTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const backgroundColor = getScreenBackgroundColor();

  return (
    <FramerPageTransition screenKey="breath-profiles">
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden overflow-y-auto relative"
        style={{ backgroundColor }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <BackButton onClick={() => onNavigateToScreen('breath')} />

        {/* Skrytý input pro import souboru */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".brprf,.json"
          onChange={handleImportProfile}
          style={{ display: 'none' }}
        />

        <div className="max-w-2xl w-full screen-content-top" style={{ paddingTop: 0, paddingBottom: '2rem', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {/* Nadpis */}
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <Heading level={1}>
                {t('profilyDychani') || 'Profily dýchání'}
              </Heading>
            </div>
          </FramerSection>

          {/* Tlačítka pro uložení a import - hned pod nadpisem */}
          <FramerSection
            className="mb-6"
            animationType="fadeIn"
            delay={0.15}
          >
            <div className="flex flex-col gap-3">
              {/* První řada: Uložit a Import */}
              <div className="flex flex-row gap-3">
                {/* Tlačítko pro uložení aktuálního nastavení */}
                {!showNameInput ? (
                  <button
                    onClick={() => setShowNameInput(true)}
                    className="glass-button flex-1 px-4 py-3 flex items-center gap-3 text-left"
                    style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                  >
                    <Plus size={24} />
                    <span className="text-xl font-light">
                      {t('ulozit') || 'Uložit'}
                    </span>
                  </button>
                ) : (
                  <div className="flex-1 glass-panel p-4" style={{ borderRadius: '16px' }}>
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder={t('nazevProfilu') || 'Název profilu'}
                      className="glass-input w-full px-4 py-2 text-lg mb-3"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveCurrentProfile();
                        } else if (e.key === 'Escape') {
                          setShowNameInput(false);
                          setNewProfileName('');
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveCurrentProfile}
                        disabled={saving || !newProfileName.trim()}
                        className="glass-button flex-1 px-4 py-2 disabled:opacity-50"
                        style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                      >
                        {saving ? (t('ukladani') || 'Ukládání...') : (t('ulozit') || 'Uložit')}
                      </button>
                      <button
                        onClick={() => {
                          setShowNameInput(false);
                          setNewProfileName('');
                        }}
                        className="glass-button px-4 py-2"
                        style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                      >
                        {t('zrusit') || 'Zrušit'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tlačítko pro import profilu */}
                <button
                  onClick={handleOpenImportDialog}
                  disabled={importing}
                  className="glass-button flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                >
                  <Upload size={20} />
                  {importing ? (t('nahravani') || 'Nahrávání...') : (t('nahrat') || 'Nahrát')}
                </button>
              </div>

              {/* Druhá řada: Export všech profilů (pokud jsou nějaké profily) */}
              {profiles.length > 0 && (
                <button
                  onClick={handleExportAllProfiles}
                  className="glass-button w-full py-3 flex items-center justify-center gap-2"
                  style={{ color: themeColors?.text || (colorMode === 'dark' ? 'white' : 'black') }}
                >
                  <Download size={20} />
                  <span className="text-lg font-light">
                    {t('exportovatVsechnyProfily') || 'Exportovat všechny profily'}
                  </span>
                </button>
              )}
            </div>
          </FramerSection>

          {/* Seznam profilů */}
          <FramerSection
            className="mb-6"
            animationType="fadeIn"
            delay={0.2}
          >
            {loading ? (
              <div className="text-center py-8 text-gray-600">
                {t('nacteni') || 'Načítání...'}
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                {t('zadneProfily') || 'Žádné uložené profily'}
              </div>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile, index) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <div className="glass-panel w-full p-4 flex items-center justify-between gap-4 cv-auto-card">
                      <div
                        onClick={() => editingProfileId !== profile.id && handleLoadProfile(profile)}
                        className="flex-1 cursor-pointer"
                      >
                        {editingProfileId === profile.id ? (
                          <div className="mb-2">
                            <input
                              type="text"
                              value={editingProfileName}
                              onChange={(e) => setEditingProfileName(e.target.value)}
                              className="glass-input w-full px-3 py-2 text-xl font-medium mb-2"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveProfileName(profile.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEditProfile();
                                }
                              }}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveProfileName(profile.id);
                                }}
                                disabled={saving || !editingProfileName.trim()}
                                className="glass-button px-3 py-1 text-sm disabled:opacity-50"
                              >
                                {saving ? (t('ukladani') || 'Ukládání...') : (t('ulozit') || 'Uložit')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelEditProfile();
                                }}
                                className="glass-button px-3 py-1 text-sm"
                              >
                                {t('zrusit') || 'Zrušit'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xl font-medium mb-2">
                            {profile.name}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            {t('rytmus') || 'Rytmus'}: {profile.breathInDuration} : {profile.breathOutDuration}
                          </div>
                          <div>
                            {t('dlzka') || 'Délka'}: {formatTime(profile.breathDuration * 60)}
                          </div>
                          {profile.preparationTime > 0 && (
                            <div>
                              {t('priprava') || 'Příprava'}: {formatPreparationTime(profile.preparationTime)}
                            </div>
                          )}
                          {/* Zobrazení přiřazených zvuků */}
                          <div className="mt-2 pt-2 border-t border-black/20 dark:border-white/20">
                            <div className="text-xs font-medium text-gray-700 mb-1">
                              {t('zvuky') || 'Zvuky'}:
                            </div>
                            <div className="text-xs text-gray-600 space-y-0.5">
                              {profile.breathInSound && profile.breathInSound !== 'none' && (
                                <div>
                                  <span className="font-medium">{t('nadech') || 'Nádech'}:</span> {getSoundName(profile.breathInSound) || profile.breathInSound}
                                </div>
                              )}
                              {profile.breathOutSound && profile.breathOutSound !== 'none' && (
                                <div>
                                  <span className="font-medium">{t('vydech') || 'Výdech'}:</span> {getSoundName(profile.breathOutSound) || profile.breathOutSound}
                                </div>
                              )}
                              {profile.breathClickSound && profile.breathClickSound !== 'none' && (
                                <div>
                                  <span className="font-medium">{t('click') || 'Klik'}:</span> {getSoundName(profile.breathClickSound) || profile.breathClickSound}
                                </div>
                              )}
                              {profile.breathFinalSound && profile.breathFinalSound !== 'none' && (
                                <div>
                                  <span className="font-medium">{t('final') || 'Finální'}:</span> {getSoundName(profile.breathFinalSound) || profile.breathFinalSound}
                                </div>
                              )}
                              {profile.breathCountdownSound && profile.breathCountdownSound !== 'none' && (
                                <div>
                                  <span className="font-medium">{t('countdown') || 'Odpočítávání'}:</span> {getSoundName(profile.breathCountdownSound) || profile.breathCountdownSound}
                                </div>
                              )}
                              {(!profile.breathInSound || profile.breathInSound === 'none') &&
                                (!profile.breathOutSound || profile.breathOutSound === 'none') &&
                                (!profile.breathClickSound || profile.breathClickSound === 'none') &&
                                (!profile.breathFinalSound || profile.breathFinalSound === 'none') &&
                                (!profile.breathCountdownSound || profile.breathCountdownSound === 'none') && (
                                  <div className="text-gray-400 italic">
                                    {t('ziadnyZvuk') || 'Žádný zvuk'}
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {editingProfileId !== profile.id && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditProfile(profile, e);
                              }}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                              title={t('editovatNazev') || 'Editovat název'}
                            >
                              <Edit2 size={20} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportProfile(profile, e);
                              }}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                              title={t('exportovatProfil') || 'Exportovat profil'}
                            >
                              <Download size={20} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProfile(profile.id, e);
                              }}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title={t('smazat') || 'Smazat'}
                            >
                              <Trash2 size={20} />
                            </button>
                          </>
                        )}
                        <Play size={20} className="text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </FramerSection>
        </div>
      </div>
    </FramerPageTransition>
  );
};

export default BreathProfilesScreen;


