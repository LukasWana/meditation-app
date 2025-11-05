import { auth } from '../config/secure-firebase';
import { database } from '../services/firebase';
import { ref, get, push, update, remove } from 'firebase/database';
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
   * @param {string} profileId - ID profilu (pokud se má aktualizovat existující)
   * @returns {Promise<string>} - ID uloženého profilu
   */
  async saveProfile(profile, profileId = null) {
    const user = this.getCurrentUser();
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
        // Fallback na localStorage
        return this.saveProfileToLocalStorage(profileData, profileId);
      }
    } else {
      // Uložit do localStorage
      return this.saveProfileToLocalStorage(profileData, profileId);
    }
  }

  /**
   * Uloží profil do localStorage
   */
  saveProfileToLocalStorage(profileData, profileId = null) {
    try {
      const profiles = this.getAllProfilesFromLocalStorage();

      if (profileId) {
        // Aktualizace existujícího profilu
        const index = profiles.findIndex(p => p.id === profileId);
        if (index !== -1) {
          profiles[index] = { ...profileData, id: profileId };
        } else {
          profiles.push({ ...profileData, id: profileId });
        }
      } else {
        // Vytvoření nového profilu
        const newId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        profiles.push({ ...profileData, id: newId });
        profileId = newId;
      }

      localStorage.setItem(this.localStorageKey, JSON.stringify(profiles));
      log.debug(`✅ Profile saved to localStorage: ${profileId}`);
      return profileId;
    } catch (error) {
      log.error('❌ Failed to save profile to localStorage:', error);
      throw error;
    }
  }

  /**
   * Načte všechny profily
   * @returns {Promise<Array>} - Pole profilů
   */
  async getAllProfiles() {
    const user = this.getCurrentUser();

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

        return [];
      } catch (error) {
        log.error('❌ Failed to load profiles from Firebase:', error);
        // Fallback na localStorage
        return this.getAllProfilesFromLocalStorage();
      }
    } else {
      // Načíst z localStorage
      return this.getAllProfilesFromLocalStorage();
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
        return Array.isArray(profiles) ? profiles : [];
      }
      return [];
    } catch (error) {
      log.error('❌ Failed to load profiles from localStorage:', error);
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
}

// Singleton instance
const breathProfilesService = new BreathProfilesService();

export default breathProfilesService;


