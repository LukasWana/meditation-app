import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, Play, Download, Upload } from 'lucide-react';
import { FramerSection, FramerPageTransition, BackButton, BackgroundShader } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import breathProfilesService from '@services/breathProfilesService';

const BreathProfilesScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  // Aktuální nastavení dýchání pro uložení
  breathInDuration,
  breathOutDuration,
  breathDuration,
  preparationTime,
  breathInSound,
  breathOutSound,
  breathClickSound,
  breathFinalSound,
  breathCountdownSound,
  breathSoundFadeEnabled,
  // Handlers pro načtení profilu
  onBreathRhythmChange,
  onBreathDurationChange,
  onPreparationTimeChange,
  onBreathSoundChange,
  onBreathSoundFadeChange
}) => {
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNameInput, setShowNameInput] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
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

  // Načtení profilu
  const handleLoadProfile = (profile) => {
    // Načíst všechna nastavení z profilu
    if (onBreathRhythmChange) {
      onBreathRhythmChange(profile.breathInDuration, profile.breathOutDuration);
    }
    if (onBreathDurationChange) {
      onBreathDurationChange(profile.breathDuration);
    }
    if (onPreparationTimeChange) {
      onPreparationTimeChange(profile.preparationTime);
    }
    if (onBreathSoundChange) {
      onBreathSoundChange('in', profile.breathInSound);
      onBreathSoundChange('out', profile.breathOutSound);
      onBreathSoundChange('click', profile.breathClickSound);
      onBreathSoundChange('final', profile.breathFinalSound);
      onBreathSoundChange('countdown', profile.breathCountdownSound);
    }
    if (onBreathSoundFadeChange) {
      onBreathSoundFadeChange(profile.breathSoundFadeEnabled);
    }

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

  // Export profilu do JSON
  const handleExportProfile = async (profile, e) => {
    e.stopPropagation();
    try {
      await breathProfilesService.downloadProfileAsJSON(profile);
      alert(t('profilExportovan') || 'Profil byl exportován');
    } catch (error) {
      console.error('Failed to export profile:', error);
      alert(t('chybaExportuProfilu') || 'Chyba při exportu profilu');
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

  return (
    <FramerPageTransition screenKey="breath-profiles">
      <BackgroundShader variant="dychani" intensity={0.3} enabled={true} />
      <div
        className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ position: 'relative', zIndex: 10 }}
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

        <div className="max-w-2xl w-full" style={{ marginTop: '5rem', paddingTop: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {/* Nadpis */}
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('profilyDychani') || 'Profily dýchání'}
              </h1>
            </div>
          </FramerSection>

          {/* Tlačítka pro uložení a import - hned pod nadpisem */}
          <FramerSection
            className="mb-6"
            animationType="fadeIn"
            delay={0.15}
          >
            <div className="flex flex-row gap-3">
              {/* Tlačítko pro uložení aktuálního nastavení */}
              {!showNameInput ? (
                <button
                  onClick={() => setShowNameInput(true)}
                  className="flex-1 p-4 bg-white/70 hover:bg-white text-gray-700 rounded-lg transition-colors flex items-center gap-3 border border-black/10"
                >
                  <Plus size={24} className="text-gray-700" />
                  <span className="text-xl font-light">
                    {t('ulozit') || 'Uložit'}
                  </span>
                </button>
              ) : (
                <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-black/10">
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder={t('nazevProfilu') || 'Název profilu'}
                    className="w-full px-4 py-2 text-lg border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 mb-3"
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
                      className="flex-1 px-4 py-2 bg-white/70 hover:bg-white text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-black/10"
                    >
                      {saving ? (t('ukladani') || 'Ukládání...') : (t('ulozit') || 'Uložit')}
                    </button>
                    <button
                      onClick={() => {
                        setShowNameInput(false);
                        setNewProfileName('');
                      }}
                      className="px-4 py-2 bg-white/70 hover:bg-white text-gray-700 rounded-lg border border-black/10"
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
                className="flex-1 py-3 bg-white/70 hover:bg-white text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-black/10"
              >
                <Upload size={20} className="text-gray-700" />
                {importing ? (t('nahravani') || 'Nahrávání...') : (t('nahrat') || 'Nahrát')}
              </button>
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
                    <div className="w-full p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-4">
                      <div
                        onClick={() => handleLoadProfile(profile)}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="text-xl font-medium mb-2">
                          {profile.name}
                        </div>
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
                          {(profile.breathInSound !== 'none' || profile.breathOutSound !== 'none') && (
                            <div className="text-xs text-gray-500">
                              {t('zvukyNastaveny') || 'Zvuky nastaveny'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
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


