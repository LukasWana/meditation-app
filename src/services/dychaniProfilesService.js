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
class DychaniProfilesService {
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

      if (user) {
        // Uložit do Firebase - používejme Firebase SDK přímo bez sanitizace lomítek
        try {
          if (profileId) {
            // Aktualizace existujícího profilu
            const profileRef = ref(database, `users/${user.uid}/breathProfiles/${profileId}`);
            await update(profileRef, {
              ...profileData,
              lastUpdated: new Date().toISOString()
            });
            log.debug(`✅ Profile updated in Firebase: ${profileId}`);
            return profileId;
          } else {
            // Vytvoření nového profilu
            const profilesRef = ref(database, `users/${user.uid}/breathProfiles`);
            const newRef = push(profilesRef, {
              ...profileData,
              createdAt: new Date().toISOString()
            });
            log.debug(`✅ Profile saved to Firebase: ${newRef.key}`);
            return newRef.key;
          }
        } catch (error) {
          log.error('❌ Failed to save profile to Firebase:', error);
          console.error('Firebase save error details:', error);
          // Fallback na localStorage
          return this.saveProfileToLocalStorage(profileData, profileId);
        }
      } else {
        // Uložit do localStorage
        log.debug('💾 No user, saving to localStorage');
        return this.saveProfileToLocalStorage(profileData, profileId);
      }
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
   * Načte všechny profily
   * @returns {Promise<Array>} - Pole profilů
   */
  async getAllProfiles() {
    try {
      const user = this.getCurrentUser();
      log.debug('📥 Loading profiles:', { hasUser: !!user });

      if (user) {
        // Načíst z Firebase - používejme Firebase SDK přímo bez sanitizace lomítek
        try {
          const profilesRef = ref(database, `users/${user.uid}/breathProfiles`);
          const snapshot = await get(profilesRef);

          if (snapshot.exists()) {
            // Převede objekt na pole
            const data = snapshot.val();
            const profiles = Object.keys(data).map(id => ({
              id,
              ...data[id]
            }));
            log.debug(`✅ Loaded ${profiles.length} profiles from Firebase`);
            return profiles;
          }

          // Pokud nejsou data v Firebase, zkus načíst z localStorage (migrace)
          const localProfiles = this.getAllProfilesFromLocalStorage();
          if (localProfiles.length > 0) {
            log.debug(`ℹ️ Migrating ${localProfiles.length} profiles from localStorage to Firebase`);
            // Migrace profilů do Firebase
            for (const profile of localProfiles) {
              try {
                await this.saveProfile(profile, profile.id);
              } catch (error) {
                log.warn(`Failed to migrate profile ${profile.id}:`, error);
              }
            }
            // Vymaž localStorage po migraci
            localStorage.removeItem(this.localStorageKey);
            // Načti znovu z Firebase
            const snapshotAfterMigration = await get(profilesRef);
            if (snapshotAfterMigration.exists()) {
              const dataAfterMigration = snapshotAfterMigration.val();
              return Object.keys(dataAfterMigration).map(id => ({
                id,
                ...dataAfterMigration[id]
              }));
            }
          }

          log.debug('📭 No profiles found in Firebase');
          return [];
        } catch (error) {
          log.error('❌ Failed to load profiles from Firebase:', error);
          console.error('Firebase load error details:', error);
          // Fallback na localStorage
          const localProfiles = this.getAllProfilesFromLocalStorage();
          log.debug(`📦 Fallback: Loaded ${localProfiles.length} profiles from localStorage`);
          return localProfiles;
        }
      } else {
        // Načíst z localStorage
        const localProfiles = this.getAllProfilesFromLocalStorage();
        log.debug(`📦 Loaded ${localProfiles.length} profiles from localStorage`);
        return localProfiles;
      }
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
   * @param {string} profileId - ID profilu
   * @returns {Promise<boolean>} - Úspěch smazání
   */
  async deleteProfile(profileId) {
    const user = this.getCurrentUser();

    if (user) {
      // Smazat z Firebase - používejme Firebase SDK přímo bez sanitizace lomítek
      try {
        const profileRef = ref(database, `users/${user.uid}/breathProfiles/${profileId}`);
        await remove(profileRef);
        log.debug(`✅ Profile deleted from Firebase: ${profileId}`);
        return true;
      } catch (error) {
        log.error('❌ Failed to delete profile from Firebase:', error);
        // Fallback na localStorage
        return this.deleteProfileFromLocalStorage(profileId);
      }
    } else {
      // Smazat z localStorage
      return this.deleteProfileFromLocalStorage(profileId);
    }
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
      const data = JSON.parse(jsonString);

      // Validace struktury
      if (!data.ENTRY || data.ENTRY !== 'BREATH_PROFILE') {
        throw new Error('Neplatný formát profilu. Očekává se BREATH_PROFILE.');
      }

      // Konverze importovaných dat na interní formát
      const profile = {
        name: data.name || 'Imported Profile',
        breathInDuration: data.breathInDuration || 6,
        breathOutDuration: data.breathOutDuration || 8,
        breathDuration: data.duration ? Math.floor(data.duration / 60) : (data.breathDuration || 3),
        preparationTime: data.preparationTime || 0,
        breathSoundFadeEnabled: data.breathSoundFadeEnabled !== undefined ? data.breathSoundFadeEnabled : true,
        translated_names: data.translated_names || {},
        // Obnov zvuky z metadata pokud existují
        breathInSound: data.sounds?.breathIn?.id || data.sounds?.breathIn?.metadata?.id || 'none',
        breathOutSound: data.sounds?.breathOut?.id || data.sounds?.breathOut?.metadata?.id || 'none',
        breathClickSound: data.sounds?.click?.id || data.sounds?.click?.metadata?.id || 'none',
        breathFinalSound: data.sounds?.final?.id || data.sounds?.final?.metadata?.id || 'none',
        breathCountdownSound: data.sounds?.countdown?.id || data.sounds?.countdown?.metadata?.id || 'none',
        // Ulož kompletní metadata zvuků pro případ, že budou potřeba
        sounds: data.sounds || {}
      };

      log.debug('✅ Profile imported from JSON:', profile.name);
      return profile;
    } catch (error) {
      log.error('❌ Failed to import profile from JSON:', error);
      throw error;
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
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const profile = await this.importProfileFromJSON(e.target.result);
          resolve(profile);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Chyba při čtení souboru'));
      reader.readAsText(file);
    });
  }
}

// Singleton instance
const dychaniProfilesService = new DychaniProfilesService();

export default dychaniProfilesService;


