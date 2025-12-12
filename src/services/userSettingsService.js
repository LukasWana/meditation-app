import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@config/secure-firebase';
import log from './logger';

/**
 * Služba pro ukládání a načítání uživatelských nastavení z Firestore
 */
class UserSettingsService {
  /**
   * Získá uživatelský profil z Firestore
   */
  async getUserProfile(userId) {
    if (!userId) {
      log.warn('getUserProfile: userId is required');
      return null;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        log.debug('User profile loaded:', userId);
        return data;
      } else {
        log.debug('User profile not found, will create on first save:', userId);
        return null;
      }
    } catch (error) {
      log.error('Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * Uloží nebo aktualizuje uživatelský profil v Firestore
   */
  async saveUserProfile(userId, profileData) {
    if (!userId) {
      log.warn('saveUserProfile: userId is required');
      return false;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const existingDoc = await getDoc(userRef);

      const updateData = {
        ...profileData,
        userId,
        updatedAt: serverTimestamp()
      };

      if (existingDoc.exists()) {
        await updateDoc(userRef, updateData);
        log.debug('User profile updated:', userId);
      } else {
        await setDoc(userRef, {
          ...updateData,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
        log.debug('User profile created:', userId);
      }

      return true;
    } catch (error) {
      log.error('Failed to save user profile:', error);
      throw error;
    }
  }

  /**
   * Aktualizuje poslední přihlášení
   */
  async updateLastLogin(userId) {
    if (!userId) return false;

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      log.error('Failed to update last login:', error);
      return false;
    }
  }

  /**
   * Uloží preferencí uživatele
   */
  async savePreferences(userId, preferences) {
    if (!userId) return false;

    try {
      const userRef = doc(db, 'users', userId);
      const existingDoc = await getDoc(userRef);

      const updateData = {
        preferences,
        updatedAt: serverTimestamp()
      };

      if (existingDoc.exists()) {
        await updateDoc(userRef, updateData);
      } else {
        await setDoc(userRef, {
          userId,
          preferences,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      }

      log.debug('Preferences saved:', userId);
      return true;
    } catch (error) {
      log.error('Failed to save preferences:', error);
      throw error;
    }
  }

  /**
   * Uloží oblíbené položky
   */
  async saveFavorites(userId, favorites) {
    if (!userId) return false;

    try {
      const userRef = doc(db, 'users', userId);
      const existingDoc = await getDoc(userRef);

      const updateData = {
        favorites,
        updatedAt: serverTimestamp()
      };

      if (existingDoc.exists()) {
        await updateDoc(userRef, updateData);
      } else {
        await setDoc(userRef, {
          userId,
          favorites,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      }

      log.debug('Favorites saved:', userId);
      return true;
    } catch (error) {
      log.error('Failed to save favorites:', error);
      throw error;
    }
  }

  /**
   * Uloží profily dýchání
   */
  async saveBreathProfiles(userId, breathProfiles) {
    if (!userId) return false;

    try {
      const userRef = doc(db, 'users', userId);
      const existingDoc = await getDoc(userRef);

      const updateData = {
        breathProfiles,
        updatedAt: serverTimestamp()
      };

      if (existingDoc.exists()) {
        await updateDoc(userRef, updateData);
      } else {
        await setDoc(userRef, {
          userId,
          breathProfiles,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });
      }

      log.debug('Breath profiles saved:', userId);
      return true;
    } catch (error) {
      log.error('Failed to save breath profiles:', error);
      throw error;
    }
  }

  /**
   * Získá všechna lokální nastavení z localStorage
   */
  getLocalSettings() {
    try {
      const settings = {
        preferences: {
          language: localStorage.getItem('meditation-app-language') || null,
          gender: localStorage.getItem('meditation-app-gender') || null,
          voicePreference: localStorage.getItem('meditation-app-voice') || null,
          theme: localStorage.getItem('meditation-app-theme') || null,
          customBackground: (() => {
            try {
              const bg = localStorage.getItem('meditation-app-custom-background');
              return bg ? JSON.parse(bg) : null;
            } catch {
              return null;
            }
          })()
        },
        breathProfiles: (() => {
          try {
            const profiles = localStorage.getItem('meditation-app-breath-profiles');
            return profiles ? JSON.parse(profiles) : [];
          } catch {
            return [];
          }
        })()
      };

      // Odstraň null hodnoty
      Object.keys(settings.preferences).forEach(key => {
        if (settings.preferences[key] === null) {
          delete settings.preferences[key];
        }
      });

      return settings;
    } catch (error) {
      log.error('Failed to get local settings:', error);
      return null;
    }
  }

  /**
   * Uloží nastavení do localStorage
   */
  saveLocalSettings(settings) {
    try {
      if (settings.preferences) {
        const { preferences } = settings;
        if (preferences.language) {
          localStorage.setItem('meditation-app-language', preferences.language);
        }
        if (preferences.gender) {
          localStorage.setItem('meditation-app-gender', preferences.gender);
        }
        if (preferences.voicePreference) {
          localStorage.setItem('meditation-app-voice', preferences.voicePreference);
        }
        if (preferences.theme) {
          localStorage.setItem('meditation-app-theme', preferences.theme);
        }
        if (preferences.customBackground) {
          localStorage.setItem('meditation-app-custom-background', JSON.stringify(preferences.customBackground));
        }
      }

      if (settings.breathProfiles && Array.isArray(settings.breathProfiles)) {
        localStorage.setItem('meditation-app-breath-profiles', JSON.stringify(settings.breathProfiles));
      }

      log.debug('Local settings saved');
      return true;
    } catch (error) {
      log.error('Failed to save local settings:', error);
      return false;
    }
  }

  /**
   * Synchronizuje lokální nastavení do cloudu
   */
  async syncLocalToCloud(userId) {
    if (!userId) return false;

    try {
      const localSettings = this.getLocalSettings();
      if (!localSettings) {
        log.warn('No local settings to sync');
        return false;
      }

      // Sloučit s existujícím profilem (cloud má prioritu, ale lokální doplní chybějící)
      const existingProfile = await this.getUserProfile(userId);

      const profileData = {
        preferences: {
          ...(existingProfile?.preferences || {}),
          ...localSettings.preferences
        },
        breathProfiles: localSettings.breathProfiles.length > 0
          ? localSettings.breathProfiles
          : (existingProfile?.breathProfiles || [])
      };

      await this.saveUserProfile(userId, profileData);
      log.success('Local settings synced to cloud:', userId);
      return true;
    } catch (error) {
      log.error('Failed to sync local to cloud:', error);
      return false;
    }
  }

  /**
   * Synchronizuje cloud nastavení do lokálního úložiště
   */
  async syncCloudToLocal(userId) {
    if (!userId) return false;

    try {
      const cloudProfile = await this.getUserProfile(userId);
      if (!cloudProfile) {
        log.debug('No cloud profile to sync');
        return false;
      }

      // Cloud má prioritu - přepíše lokální nastavení
      const settingsToSave = {
        preferences: cloudProfile.preferences || {},
        breathProfiles: cloudProfile.breathProfiles || []
      };

      this.saveLocalSettings(settingsToSave);
      log.success('Cloud settings synced to local:', userId);
      return true;
    } catch (error) {
      log.error('Failed to sync cloud to local:', error);
      return false;
    }
  }

  /**
   * Kompletní synchronizace (cloud má prioritu, ale lokální doplní chybějící hodnoty)
   */
  async syncSettings(userId, strategy = 'cloud-first') {
    if (!userId) return false;

    try {
      if (strategy === 'cloud-first') {
        // 1. Načti z cloudu
        const cloudProfile = await this.getUserProfile(userId);

        // 2. Načti lokální
        const localSettings = this.getLocalSettings();

        if (cloudProfile) {
          // Cloud existuje - použij cloud jako základ, doplň chybějící z lokálního
          const merged = {
            preferences: {
              ...localSettings?.preferences,
              ...cloudProfile.preferences
            },
            breathProfiles: cloudProfile.breathProfiles?.length > 0
              ? cloudProfile.breathProfiles
              : (localSettings?.breathProfiles || [])
          };

          // Ulož merged do cloudu i lokálně
          await this.saveUserProfile(userId, merged);
          this.saveLocalSettings(merged);
        } else if (localSettings) {
          // Cloud neexistuje, ale máme lokální - nahraj do cloudu
          await this.saveUserProfile(userId, localSettings);
        }
      } else {
        // local-first - nahraj lokální do cloudu
        await this.syncLocalToCloud(userId);
      }

      log.success('Settings synchronized:', userId);
      return true;
    } catch (error) {
      log.error('Failed to sync settings:', error);
      return false;
    }
  }
}

const userSettingsService = new UserSettingsService();
export default userSettingsService;


