import { auth } from '../config/secure-firebase';
import { database } from '../services/firebase';
import { ref, get, push, update, remove } from 'firebase/database';
import { realtimeMetadataService } from './realtimeMetadataService';
import log from './logger';

/**
 * Služba pro správu profilů dýchání
 * Ukládá profily do Firebase Realtime Database (pokud je uživatel přihlášen)
 * nebo do localStorage (pokud není přihlášen)
 */
class BreathProfilesService {
  constructor() {
    this.localStorageKey = 'meditation-app-breath-profiles';
  }

  /**
   * Získá aktuálního uživatele
   */
  getCurrentUser() {
    return auth?.currentUser;
  }

  /**
   * Načte kompletní metadata pro zvuk
   * @param {string} soundId - ID zvuku nebo 'none'
   * @returns {Promise<Object|null>} - Metadata zvuku nebo null
   */
  async getSoundMetadata(soundId) {
    if (!soundId || soundId === 'none') {
      return null;
    }

    try {
      const metadata = await realtimeMetadataService.getFileMetadata(soundId);
      if (metadata) {
        return {
          id: soundId,
          fileName: metadata.fileName || soundId,
          downloadURL: metadata.downloadURL || metadata.audioSrc || null,
          displayName: metadata.displayName || null,
          description: metadata.description || null,
          duration: metadata.duration || null,
          waveformData: metadata.waveformData || null,
          waveformMax: metadata.waveformMax || null
        };
      }
      return { id: soundId, fileName: soundId };
    } catch (error) {
      log.warn(`Failed to load metadata for sound ${soundId}:`, error);
      return { id: soundId, fileName: soundId };
    }
  }

  /**
   * Uloží profil dýchání
   * @param {Object} profile - Profil dýchání
   * @param {string} profile.name - Název profilu
   * @param {number} profile.breathInDuration - Délka nádechu v sekundách
   * @param {number} profile.breathOutDuration - Délka výdechu v sekundách
   * @param {number} profile.breathDuration - Délka dýchání v minutách
   * @param {number} profile.preparationTime - Čas přípravy v sekundách
   * @param {string} profile.breathInSound - ID zvuku pro nádech
   * @param {string} profile.breathOutSound - ID zvuku pro výdech
   * @param {string} profile.breathClickSound - ID zvuku pro kliknutí
   * @param {string} profile.breathFinalSound - ID finálního zvuku
   * @param {string} profile.breathCountdownSound - ID zvuku pro odpočítávání
   * @param {boolean} profile.breathSoundFadeEnabled - Fade in/out zapnuto
   * @param {boolean} includeSoundMetadata - Zda zahrnout kompletní metadata zvuků
   * @param {string} profileId - ID profilu (pokud se má aktualizovat existující)
   * @returns {Promise<string>} - ID uloženého profilu
   */
  async saveProfile(profile, profileId = null, includeSoundMetadata = false) {
    try {
      const user = this.getCurrentUser();
      log.debug('💾 Saving profile:', { profileId, hasUser: !!user, profileName: profile.name });

      const profileData = {
        name: profile.name || 'Bez názvu',
        breathInDuration: profile.breathInDuration || 6,
        breathOutDuration: profile.breathOutDuration || 8,
        breathDuration: profile.breathDuration || 3,
        preparationTime: profile.preparationTime || 0,
        breathInSound: profile.breathInSound || 'none',
        breathOutSound: profile.breathOutSound || 'none',
        breathClickSound: profile.breathClickSound || 'none',
        breathFinalSound: profile.breathFinalSound || 'none',
        breathCountdownSound: profile.breathCountdownSound || 'none',
        breathSoundFadeEnabled: profile.breathSoundFadeEnabled !== undefined ? profile.breathSoundFadeEnabled : true,
        createdAt: profile.createdAt || new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

    // Pokud je požadováno, načti kompletní metadata zvuků
    if (includeSoundMetadata) {
      const [inSound, outSound, clickSound, finalSound, countdownSound] = await Promise.all([
        this.getSoundMetadata(profile.breathInSound),
        this.getSoundMetadata(profile.breathOutSound),
        this.getSoundMetadata(profile.breathClickSound),
        this.getSoundMetadata(profile.breathFinalSound),
        this.getSoundMetadata(profile.breathCountdownSound)
      ]);

      profileData.sounds = {
        breathIn: inSound,
        breathOut: outSound,
        click: clickSound,
        final: finalSound,
        countdown: countdownSound
      };
    }

      // Vždy uložit do localStorage jako záloha (uživatelská paměť)
      let savedProfileId = this.saveProfileToLocalStorage(profileData, profileId);
      log.debug('💾 Profile saved to localStorage (user memory):', savedProfileId);

      // Pokud je uživatel přihlášen, uložit také do Firebase
      if (user) {
        try {
          if (profileId) {
            // Aktualizace existujícího profilu
            const profileRef = ref(database, `users/${user.uid}/breathProfiles/${profileId}`);
            await update(profileRef, {
              ...profileData,
              lastUpdated: new Date().toISOString()
            });
            log.debug(`✅ Profile updated in Firebase: ${profileId}`);
          } else {
            // Vytvoření nového profilu
            const profilesRef = ref(database, `users/${user.uid}/breathProfiles`);
            const newRef = push(profilesRef, {
              ...profileData,
              createdAt: new Date().toISOString()
            });
            log.debug(`✅ Profile saved to Firebase: ${newRef.key}`);
            // Aktualizuj ID v localStorage, pokud bylo vytvořeno nové
            if (savedProfileId && savedProfileId.startsWith('local_')) {
              this.updateProfileIdInLocalStorage(savedProfileId, newRef.key);
              savedProfileId = newRef.key;
            }
          }
        } catch (error) {
          log.error('❌ Failed to save profile to Firebase:', error);
          console.error('Firebase save error details:', error);
          // Profil je už uložen v localStorage, takže pokračujeme
        }
      }

      return savedProfileId;
    } catch (error) {
      log.error('❌ Failed to save profile:', error);
      console.error('Save profile error:', error);
      throw error;
    }
  }

  /**
   * Uloží profil do localStorage
   */
  saveProfileToLocalStorage(profileData, profileId = null) {
    try {
      const profiles = this.getAllProfilesFromLocalStorage();
      log.debug(`💾 Saving to localStorage: ${profiles.length} existing profiles`);

      if (profileId) {
        // Aktualizace existujícího profilu
        const index = profiles.findIndex(p => p.id === profileId);
        if (index !== -1) {
          profiles[index] = { ...profileData, id: profileId };
          log.debug(`✅ Updated existing profile: ${profileId}`);
        } else {
          profiles.push({ ...profileData, id: profileId });
          log.debug(`✅ Added profile with existing ID: ${profileId}`);
        }
      } else {
        // Vytvoření nového profilu
        const newId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        profiles.push({ ...profileData, id: newId });
        profileId = newId;
        log.debug(`✅ Created new profile: ${profileId}`);
      }

      const jsonString = JSON.stringify(profiles);
      localStorage.setItem(this.localStorageKey, jsonString);
      log.debug(`✅ Profile saved to localStorage: ${profileId} (${jsonString.length} bytes)`);

      // Ověření, že se uložilo
      const verify = localStorage.getItem(this.localStorageKey);
      if (!verify) {
        throw new Error('Failed to verify localStorage save');
      }

      return profileId;
    } catch (error) {
      log.error('❌ Failed to save profile to localStorage:', error);
      console.error('localStorage save error details:', error);
      if (error.name === 'QuotaExceededError') {
        console.error('⚠️ localStorage quota exceeded!');
      }
      throw error;
    }
  }

  /**
   * Aktualizuje ID profilu v localStorage (např. když se vytvoří v Firebase)
   */
  updateProfileIdInLocalStorage(oldId, newId) {
    try {
      const profiles = this.getAllProfilesFromLocalStorage();
      const index = profiles.findIndex(p => p.id === oldId);
      if (index !== -1) {
        profiles[index].id = newId;
        const jsonString = JSON.stringify(profiles);
        localStorage.setItem(this.localStorageKey, jsonString);
        log.debug(`✅ Updated profile ID in localStorage: ${oldId} -> ${newId}`);
      }
    } catch (error) {
      log.warn('⚠️ Failed to update profile ID in localStorage:', error);
    }
  }

  /**
   * Načte všechny profily
   * Vždy preferuje localStorage (uživatelskou paměť) jako primární úložiště
   * @returns {Promise<Array>} - Pole profilů
   */
  async getAllProfiles() {
    try {
      // Vždy načíst z localStorage jako primární zdroj (uživatelská paměť)
      const localProfiles = this.getAllProfilesFromLocalStorage();
      log.debug(`📦 Loaded ${localProfiles.length} profiles from localStorage (user memory)`);

      // Pokud je uživatel přihlášen, zkus synchronizovat s Firebase (volitelné)
      const user = this.getCurrentUser();
      if (user && localProfiles.length === 0) {
        // Pokud není nic v localStorage, zkus načíst z Firebase
        try {
          const profilesRef = ref(database, `users/${user.uid}/breathProfiles`);
          const snapshot = await get(profilesRef);

          if (snapshot.exists()) {
            const data = snapshot.val();
            const firebaseProfiles = Object.keys(data).map(id => ({
              id,
              ...data[id]
            }));
            log.debug(`✅ Loaded ${firebaseProfiles.length} profiles from Firebase (fallback)`);

            // Uložit do localStorage pro budoucí použití
            for (const profile of firebaseProfiles) {
              try {
                this.saveProfileToLocalStorage(profile, profile.id);
              } catch (error) {
                log.warn(`Failed to save profile ${profile.id} to localStorage:`, error);
              }
            }

            return firebaseProfiles;
          }
        } catch (error) {
          log.error('❌ Failed to load profiles from Firebase:', error);
          // Pokračujeme s localStorage profily (které jsou prázdné)
        }
      }

      return localProfiles;
    } catch (error) {
      log.error('❌ Failed to load profiles:', error);
      console.error('Load profiles error:', error);
      return [];
    }
  }

  /**
   * Načte všechny profily z localStorage
   */
  getAllProfilesFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        const profiles = JSON.parse(stored);
        const result = Array.isArray(profiles) ? profiles : [];
        log.debug(`📦 Loaded ${result.length} profiles from localStorage`);
        return result;
      }
      log.debug('📭 No profiles found in localStorage');
      return [];
    } catch (error) {
      log.error('❌ Failed to load profiles from localStorage:', error);
      console.error('localStorage load error details:', error);
      return [];
    }
  }

  /**
   * Načte jeden profil podle ID
   * @param {string} profileId - ID profilu
   * @returns {Promise<Object|null>} - Profil nebo null
   */
  async getProfile(profileId) {
    const user = this.getCurrentUser();

    if (user) {
      // Načíst z Firebase - používejme Firebase SDK přímo bez sanitizace lomítek
      try {
        const profileRef = ref(database, `users/${user.uid}/breathProfiles/${profileId}`);
        const snapshot = await get(profileRef);
        if (snapshot.exists()) {
          return { id: profileId, ...snapshot.val() };
        }
        return null;
      } catch (error) {
        log.error('❌ Failed to load profile from Firebase:', error);
        // Fallback na localStorage
        return this.getProfileFromLocalStorage(profileId);
      }
    } else {
      // Načíst z localStorage
      return this.getProfileFromLocalStorage(profileId);
    }
  }

  /**
   * Načte jeden profil z localStorage
   */
  getProfileFromLocalStorage(profileId) {
    try {
      const profiles = this.getAllProfilesFromLocalStorage();
      return profiles.find(p => p.id === profileId) || null;
    } catch (error) {
      log.error('❌ Failed to load profile from localStorage:', error);
      return null;
    }
  }

  /**
   * Smaže profil
   * Vždy smaže z localStorage (uživatelské paměti) a pokud je uživatel přihlášen, také z Firebase
   * @param {string} profileId - ID profilu
   * @returns {Promise<boolean>} - Úspěch smazání
   */
  async deleteProfile(profileId) {
    // Vždy smazat z localStorage (uživatelská paměť)
    const localDeleted = this.deleteProfileFromLocalStorage(profileId);

    // Pokud je uživatel přihlášen, smazat také z Firebase
    const user = this.getCurrentUser();
    if (user) {
      try {
        const profileRef = ref(database, `users/${user.uid}/breathProfiles/${profileId}`);
        await remove(profileRef);
        log.debug(`✅ Profile deleted from Firebase: ${profileId}`);
      } catch (error) {
        log.error('❌ Failed to delete profile from Firebase:', error);
        // Pokračujeme, protože už je smazáno z localStorage
      }
    }

    return localDeleted;
  }

  /**
   * Smaže profil z localStorage
   */
  deleteProfileFromLocalStorage(profileId) {
    try {
      const profiles = this.getAllProfilesFromLocalStorage();
      const filtered = profiles.filter(p => p.id !== profileId);
      localStorage.setItem(this.localStorageKey, JSON.stringify(filtered));
      log.debug(`✅ Profile deleted from localStorage: ${profileId}`);
      return true;
    } catch (error) {
      log.error('❌ Failed to delete profile from localStorage:', error);
      return false;
    }
  }

  /**
   * Exportuje profil do JSON formátu (inspirováno .trng formátem)
   * @param {Object} profile - Profil dýchání
   * @returns {Promise<string>} - JSON string
   */
  async exportProfileToJSON(profile) {
    try {
      // Načti kompletní metadata zvuků
      const [inSound, outSound, clickSound, finalSound, countdownSound] = await Promise.all([
        this.getSoundMetadata(profile.breathInSound),
        this.getSoundMetadata(profile.breathOutSound),
        this.getSoundMetadata(profile.breathClickSound),
        this.getSoundMetadata(profile.breathFinalSound),
        this.getSoundMetadata(profile.breathCountdownSound)
      ]);

      // Vytvoř JSON strukturu podobnou .trng formátu
      const exportData = {
        ENTRY: 'BREATH_PROFILE',
        version: '1.0',
        name: profile.name || 'Bez názvu',
        translated_names: profile.translated_names || {},
        breath_type: 0, // 0 = statické, 1 = dynamické (pro budoucí použití)
        public_id: profile.id || null,
        duration: (profile.breathDuration || 3) * 60, // Délka v sekundách
        breathInDuration: profile.breathInDuration || 6,
        breathOutDuration: profile.breathOutDuration || 8,
        preparationTime: profile.preparationTime || 0,
        breathSoundFadeEnabled: profile.breathSoundFadeEnabled !== undefined ? profile.breathSoundFadeEnabled : true,
        sounds: {
          breathIn: {
            id: profile.breathInSound || 'none',
            metadata: inSound
          },
          breathOut: {
            id: profile.breathOutSound || 'none',
            metadata: outSound
          },
          click: {
            id: profile.breathClickSound || 'none',
            metadata: clickSound
          },
          final: {
            id: profile.breathFinalSound || 'none',
            metadata: finalSound
          },
          countdown: {
            id: profile.breathCountdownSound || 'none',
            metadata: countdownSound
          }
        },
        // Pro budoucí dynamické rytmy (inspirováno .trng)
        dynamic: {
          enabled: false,
          mValues: [],
          mKeys: []
        },
        createdAt: profile.createdAt || new Date().toISOString(),
        lastUpdated: profile.lastUpdated || new Date().toISOString()
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      log.error('❌ Failed to export profile to JSON:', error);
      throw error;
    }
  }

  /**
   * Importuje profil z JSON formátu
   * @param {string} jsonString - JSON string
   * @returns {Promise<Object>} - Importovaný profil
   */
  async importProfileFromJSON(jsonString) {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        throw new Error('Neplatný vstup. Očekává se JSON string.');
      }

      let data;
      try {
        data = JSON.parse(jsonString);
      } catch (parseError) {
        throw new Error('Neplatný JSON formát. Soubor není validní JSON.');
      }

      // Validace struktury
      if (!data.ENTRY || data.ENTRY !== 'BREATH_PROFILE') {
        throw new Error('Neplatný formát profilu. Očekává se BREATH_PROFILE. Soubor může být poškozený nebo ve starém formátu.');
      }

      // Validace verze (pro budoucí kompatibilitu)
      if (data.version && parseFloat(data.version) > 1.0) {
        log.warn(`⚠️ Profile version ${data.version} is newer than supported (1.0). Some features may not work.`);
      }

      // Konverze importovaných dat na interní formát s validací
      const profile = {
        name: (data.name && typeof data.name === 'string') ? data.name.trim() : 'Imported Profile',
        breathInDuration: (typeof data.breathInDuration === 'number' && data.breathInDuration > 0) ? data.breathInDuration : 6,
        breathOutDuration: (typeof data.breathOutDuration === 'number' && data.breathOutDuration > 0) ? data.breathOutDuration : 8,
        breathDuration: data.duration ? Math.floor(data.duration / 60) : ((typeof data.breathDuration === 'number' && data.breathDuration > 0) ? data.breathDuration : 3),
        preparationTime: (typeof data.preparationTime === 'number' && data.preparationTime >= 0) ? data.preparationTime : 0,
        breathSoundFadeEnabled: data.breathSoundFadeEnabled !== undefined ? Boolean(data.breathSoundFadeEnabled) : true,
        translated_names: (data.translated_names && typeof data.translated_names === 'object') ? data.translated_names : {},
        // Obnov zvuky z metadata pokud existují
        breathInSound: data.sounds?.breathIn?.id || data.sounds?.breathIn?.metadata?.id || 'none',
        breathOutSound: data.sounds?.breathOut?.id || data.sounds?.breathOut?.metadata?.id || 'none',
        breathClickSound: data.sounds?.click?.id || data.sounds?.click?.metadata?.id || 'none',
        breathFinalSound: data.sounds?.final?.id || data.sounds?.final?.metadata?.id || 'none',
        breathCountdownSound: data.sounds?.countdown?.id || data.sounds?.countdown?.metadata?.id || 'none',
        // Ulož kompletní metadata zvuků pro případ, že budou potřeba
        sounds: data.sounds || {}
      };

      // Validace, že alespoň základní hodnoty jsou platné
      if (!profile.name || profile.name.length === 0) {
        profile.name = 'Imported Profile';
      }

      log.debug('✅ Profile imported from JSON:', profile.name);
      return profile;
    } catch (error) {
      log.error('❌ Failed to import profile from JSON:', error);
      if (error.message) {
        throw error;
      }
      throw new Error('Chyba při importu profilu: ' + (error.message || 'Neznámá chyba'));
    }
  }

  /**
   * Stáhne profil jako JSON soubor
   * @param {Object} profile - Profil dýchání
   * @param {string} filename - Název souboru (volitelné)
   */
  async downloadProfileAsJSON(profile, filename = null) {
    try {
      const jsonString = await this.exportProfileToJSON(profile);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${profile.name.replace(/[^a-z0-9]/gi, '_')}.brprf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      log.debug(`✅ Profile downloaded as JSON: ${link.download}`);
    } catch (error) {
      log.error('❌ Failed to download profile as JSON:', error);
      throw error;
    }
  }

  /**
   * Načte profil z JSON souboru
   * @param {File} file - Soubor JSON
   * @returns {Promise<Object>} - Importovaný profil
   */
  async importProfileFromFile(file) {
    return new Promise((resolve, reject) => {
      // Validace souboru
      if (!file) {
        reject(new Error('Žádný soubor nebyl vybrán'));
        return;
      }

      // Kontrola typu souboru
      const validExtensions = ['.brprf', '.json'];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

      if (!hasValidExtension && !file.type.includes('json')) {
        log.warn('⚠️ File extension may not be valid, but attempting to read anyway');
      }

      // Kontrola velikosti souboru (max 1MB)
      if (file.size > 1024 * 1024) {
        reject(new Error('Soubor je příliš velký. Maximální velikost je 1MB.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          if (!e.target || !e.target.result) {
            throw new Error('Soubor je prázdný nebo poškozený');
          }
          const profile = await this.importProfileFromJSON(e.target.result);
          resolve(profile);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Chyba při čtení souboru. Zkuste znovu nebo zkontrolujte, zda je soubor nepoškozený.'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Exportuje všechny profily jako JSON soubor
   * @returns {Promise<string>} - JSON string s poli profilů
   */
  async exportAllProfilesToJSON() {
    try {
      const profiles = await this.getAllProfiles();

      if (profiles.length === 0) {
        throw new Error('Žádné profily k exportu');
      }

      // Exportuj každý profil s metadaty
      const exportData = {
        ENTRY: 'BREATH_PROFILES_COLLECTION',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        count: profiles.length,
        profiles: []
      };

      // Exportuj každý profil s kompletními metadaty zvuků
      for (const profile of profiles) {
        try {
          // Načti metadata zvuků pro tento profil
          const [inSound, outSound, clickSound, finalSound, countdownSound] = await Promise.all([
            this.getSoundMetadata(profile.breathInSound),
            this.getSoundMetadata(profile.breathOutSound),
            this.getSoundMetadata(profile.breathClickSound),
            this.getSoundMetadata(profile.breathFinalSound),
            this.getSoundMetadata(profile.breathCountdownSound)
          ]);

          // Vytvoř exportovaný profil s kompletními metadaty zvuků
          const profileData = {
            ENTRY: 'BREATH_PROFILE',
            version: '1.0',
            name: profile.name || 'Bez názvu',
            translated_names: profile.translated_names || {},
            breath_type: 0,
            public_id: profile.id || null,
            duration: (profile.breathDuration || 3) * 60,
            breathInDuration: profile.breathInDuration || 6,
            breathOutDuration: profile.breathOutDuration || 8,
            preparationTime: profile.preparationTime || 0,
            breathSoundFadeEnabled: profile.breathSoundFadeEnabled !== undefined ? profile.breathSoundFadeEnabled : true,
            sounds: {
              breathIn: {
                id: profile.breathInSound || 'none',
                metadata: inSound
              },
              breathOut: {
                id: profile.breathOutSound || 'none',
                metadata: outSound
              },
              click: {
                id: profile.breathClickSound || 'none',
                metadata: clickSound
              },
              final: {
                id: profile.breathFinalSound || 'none',
                metadata: finalSound
              },
              countdown: {
                id: profile.breathCountdownSound || 'none',
                metadata: countdownSound
              }
            },
            dynamic: {
              enabled: false,
              mValues: [],
              mKeys: []
            },
            createdAt: profile.createdAt || new Date().toISOString(),
            lastUpdated: profile.lastUpdated || new Date().toISOString()
          };
          exportData.profiles.push(profileData);
        } catch (error) {
          log.warn(`⚠️ Failed to export profile ${profile.id}:`, error);
          // Pokračujeme s ostatními profily
        }
      }

      if (exportData.profiles.length === 0) {
        throw new Error('Nepodařilo se exportovat žádné profily');
      }

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      log.error('❌ Failed to export all profiles:', error);
      throw error;
    }
  }

  /**
   * Stáhne všechny profily jako JSON soubor
   * @param {string} filename - Název souboru (volitelné)
   */
  async downloadAllProfilesAsJSON(filename = null) {
    try {
      log.debug('📤 Starting export of all profiles...');
      const jsonString = await this.exportAllProfilesToJSON();
      log.debug(`✅ Generated JSON string (${jsonString.length} bytes)`);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `breath_profiles_${new Date().toISOString().split('T')[0]}.brprfs`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      log.debug(`✅ All profiles downloaded as JSON: ${link.download}`);
    } catch (error) {
      log.error('❌ Failed to download all profiles as JSON:', error);
      console.error('Export error details:', error);
      throw error;
    }
  }
}

// Singleton instance
const breathProfilesService = new BreathProfilesService();

export default breathProfilesService;


