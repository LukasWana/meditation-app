import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@config/secure-firebase';
import log from './logger';

/**
 * Služba pro ukládání a načítání historie uživatelské aktivity
 */
class ActivityHistoryService {
  /**
   * Získá localStorage klíč pro historii uživatele
   */
  getLocalStorageKey(userId) {
    return `meditation-app-activity-history-${userId || 'anonymous'}`;
  }

  /**
   * Uloží aktivitu do localStorage i Firestore
   */
  async saveActivity(userId, activityData) {
    if (!userId) {
      log.warn('saveActivity: userId is required');
      return false;
    }

    const activityId = activityData.id || this.generateActivityId();
    const now = new Date();
    const timestamp = now.toISOString();
    const date = timestamp.split('T')[0]; // YYYY-MM-DD
    const time = timestamp.split('T')[1].split('.')[0]; // HH:MM:SS

    const activity = {
      id: activityId,
      section: activityData.section,
      date,
      time,
      timestamp,
      description: activityData.description || '',
      duration: activityData.duration || 0,
      extraTime: activityData.extraTime !== undefined ? activityData.extraTime : 0, // Čas navíc jako samostatná top-level proměnná
      metadata: activityData.metadata || {},
      createdAt: timestamp
    };

    try {
      // Ulož do localStorage
      this.saveToLocalStorage(userId, activity);

      // Ulož do Firestore (pokud je uživatel přihlášen)
      if (userId && userId !== 'anonymous') {
        await this.saveToFirestore(userId, activity);
      }

      log.debug('Activity saved:', { userId, section: activity.section, duration: activity.duration });
      return true;
    } catch (error) {
      log.error('Failed to save activity:', error);
      // I když Firestore selže, localStorage by měl fungovat
      return false;
    }
  }

  /**
   * Uloží aktivitu do localStorage
   */
  saveToLocalStorage(userId, activity) {
    try {
      const key = this.getLocalStorageKey(userId);
      const existing = this.getFromLocalStorage(userId);

      // Přidej novou aktivitu na začátek
      const updated = [activity, ...existing];

      // Limit na posledních 1000 záznamů
      const limited = updated.slice(0, 1000);

      localStorage.setItem(key, JSON.stringify(limited));
      log.debug('Activity saved to localStorage:', activity.id);
    } catch (error) {
      log.error('Failed to save to localStorage:', error);
      // localStorage může být plný, zkus vymazat staré záznamy
      try {
        const key = this.getLocalStorageKey(userId);
        const existing = this.getFromLocalStorage(userId);
        const recent = existing.slice(0, 500); // Zachovej jen 500 nejnovějších
        localStorage.setItem(key, JSON.stringify(recent));
        // Zkus znovu uložit
        const updated = [activity, ...recent];
        localStorage.setItem(key, JSON.stringify(updated.slice(0, 1000)));
      } catch (retryError) {
        log.error('Failed to save to localStorage after cleanup:', retryError);
      }
    }
  }

  /**
   * Uloží aktivitu do Firestore
   */
  async saveToFirestore(userId, activity) {
    try {
      const activityRef = doc(db, 'users', userId, 'activityHistory', activity.id);
      await setDoc(activityRef, {
        ...activity,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
      log.debug('Activity saved to Firestore:', activity.id);
    } catch (error) {
      log.error('Failed to save to Firestore:', error);
      throw error;
    }
  }

  /**
   * Načte historii z localStorage
   */
  getFromLocalStorage(userId) {
    try {
      const key = this.getLocalStorageKey(userId);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      log.error('Failed to get from localStorage:', error);
      return [];
    }
  }

  /**
   * Přenese lokální historii z "anonymous" do konkrétního userId
   * (typicky když se aktivita zaznamená před dokončením auth a pak uživatel přejde do přihlášeného stavu).
   */
  migrateAnonymousHistoryToUser(userId) {
    if (!userId || userId === 'anonymous') return false;

    try {
      const anonymousHistory = this.getFromLocalStorage('anonymous');
      if (!anonymousHistory || anonymousHistory.length === 0) return false;

      const userHistory = this.getFromLocalStorage(userId);
      const merged = this.mergeHistories(userHistory, anonymousHistory);

      const userKey = this.getLocalStorageKey(userId);
      localStorage.setItem(userKey, JSON.stringify(merged.slice(0, 1000)));

      // Vymaž anonymní historii po migraci, aby se nemíchala mezi účty
      const anonymousKey = this.getLocalStorageKey('anonymous');
      localStorage.removeItem(anonymousKey);

      log.success('Anonymous activity history migrated to user:', { userId, migrated: anonymousHistory.length });
      return true;
    } catch (error) {
      log.error('Failed to migrate anonymous history:', error);
      return false;
    }
  }

  /**
   * Načte historii s možností filtrování
   */
  async getActivityHistory(userId, section = null, limit = null) {
    if (!userId) {
      log.warn('getActivityHistory: userId is required');
      return [];
    }

    try {
      // Načti z obou zdrojů
      const [localHistory, firestoreHistory] = await Promise.all([
        Promise.resolve(this.getFromLocalStorage(userId)),
        userId !== 'anonymous' ? this.getFromFirestore(userId, section, limit) : Promise.resolve([])
      ]);

      // Slouč historie (odstraň duplicity podle ID)
      const merged = this.mergeHistories(localHistory, firestoreHistory);

      // Filtruj podle sekce
      let filtered = section ? merged.filter(a => a.section === section) : merged;

      // Seřaď podle data a času (nejnovější první)
      filtered.sort((a, b) => {
        const dateA = a.timestamp || `${a.date}T${a.time}`;
        const dateB = b.timestamp || `${b.date}T${b.time}`;
        return dateB.localeCompare(dateA);
      });

      // Aplikuj limit
      if (limit && limit > 0) {
        filtered = filtered.slice(0, limit);
      }

      return filtered;
    } catch (error) {
      log.error('Failed to get activity history:', error);
      // Fallback na localStorage
      const localHistory = this.getFromLocalStorage(userId);
      return section ? localHistory.filter(a => a.section === section) : localHistory;
    }
  }

  /**
   * Načte historii z Firestore
   */
  async getFromFirestore(userId, section = null, limit = null) {
    try {
      const historyRef = collection(db, 'users', userId, 'activityHistory');
      let q = query(historyRef, orderBy('timestamp', 'desc'));

      if (section) {
        q = query(historyRef, where('section', '==', section), orderBy('timestamp', 'desc'));
      }

      if (limit && limit > 0) {
        q = query(q, firestoreLimit(limit));
      }

      const snapshot = await getDocs(q);
      const activities = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Převeď Firestore timestamp na ISO string
        const timestamp = data.timestamp?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString() || data.timestamp || data.createdAt;
        const date = timestamp ? timestamp.split('T')[0] : data.date;
        const time = timestamp ? timestamp.split('T')[1]?.split('.')[0] : data.time;

        activities.push({
          id: docSnap.id,
          section: data.section,
          date: date || data.date,
          time: time || data.time,
          timestamp: timestamp || data.timestamp,
          description: data.description || '',
          duration: data.duration || 0,
          extraTime: data.extraTime || data.metadata?.extraTime || 0,
          metadata: data.metadata || {}
        });
      });

      return activities;
    } catch (error) {
      log.error('Failed to get from Firestore:', error);
      return [];
    }
  }

  /**
   * Sloučí historie z localStorage a Firestore (odstraní duplicity)
   */
  mergeHistories(localHistory, firestoreHistory) {
    const merged = new Map();

    // Přidej všechny z localStorage
    localHistory.forEach(activity => {
      merged.set(activity.id, activity);
    });

    // Přidej z Firestore (přepíše localStorage pokud je novější)
    firestoreHistory.forEach(activity => {
      const existing = merged.get(activity.id);
      if (!existing) {
        merged.set(activity.id, activity);
      } else {
        // Porovnej timestamps a použij novější
        const existingTime = existing.timestamp || `${existing.date}T${existing.time}`;
        const newTime = activity.timestamp || `${activity.date}T${activity.time}`;
        if (newTime > existingTime) {
          merged.set(activity.id, activity);
        }
      }
    });

    return Array.from(merged.values());
  }

  /**
   * Vymaže historii (volitelně podle sekce)
   */
  async clearActivityHistory(userId, section = null) {
    if (!userId) {
      log.warn('clearActivityHistory: userId is required');
      return false;
    }

    try {
      // Vymaž z localStorage
      if (section) {
        const existing = this.getFromLocalStorage(userId);
        const filtered = existing.filter(a => a.section !== section);
        const key = this.getLocalStorageKey(userId);
        localStorage.setItem(key, JSON.stringify(filtered));
      } else {
        const key = this.getLocalStorageKey(userId);
        localStorage.removeItem(key);
      }

      // Vymaž z Firestore
      if (userId !== 'anonymous') {
        await this.clearFromFirestore(userId, section);
      }

      log.debug('Activity history cleared:', { userId, section });
      return true;
    } catch (error) {
      log.error('Failed to clear activity history:', error);
      return false;
    }
  }

  /**
   * Vymaže historii z Firestore
   */
  async clearFromFirestore(userId, section = null) {
    try {
      const historyRef = collection(db, 'users', userId, 'activityHistory');
      let q = query(historyRef);

      if (section) {
        q = query(historyRef, where('section', '==', section));
      }

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      let batchCount = 0;

      snapshot.forEach((docSnap) => {
        if (batchCount < 500) { // Firestore limit je 500 operací na batch
          batch.delete(docSnap.ref);
          batchCount++;
        }
      });

      if (batchCount > 0) {
        await batch.commit();
      }

      // Pokud je více než 500 záznamů, rekurzivně vymaž zbytek
      if (snapshot.size >= 500) {
        await this.clearFromFirestore(userId, section);
      }

      log.debug('Activity history cleared from Firestore:', { userId, section });
    } catch (error) {
      log.error('Failed to clear from Firestore:', error);
      throw error;
    }
  }

  /**
   * Synchronizuje localStorage → Firestore
   */
  async syncToFirestore(userId) {
    if (!userId || userId === 'anonymous') {
      log.warn('syncToFirestore: userId is required and must not be anonymous');
      return false;
    }

    try {
      const localHistory = this.getFromLocalStorage(userId);
      if (localHistory.length === 0) {
        log.debug('No local history to sync');
        return true;
      }

      // Batch write pro lepší výkon
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const activity of localHistory) {
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }

        const activityRef = doc(db, 'users', userId, 'activityHistory', activity.id);
        batch.set(activityRef, {
          ...activity,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });
        batchCount++;
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      log.success('Local history synced to Firestore:', userId);
      return true;
    } catch (error) {
      log.error('Failed to sync to Firestore:', error);
      return false;
    }
  }

  /**
   * Synchronizuje Firestore → localStorage
   */
  async syncFromFirestore(userId) {
    if (!userId || userId === 'anonymous') {
      log.warn('syncFromFirestore: userId is required and must not be anonymous');
      return false;
    }

    try {
      const firestoreHistory = await this.getFromFirestore(userId);
      if (firestoreHistory.length === 0) {
        log.debug('No Firestore history to sync');
        return true;
      }

      // Slouč s existující localStorage historií
      const localHistory = this.getFromLocalStorage(userId);
      const merged = this.mergeHistories(localHistory, firestoreHistory);

      // Ulož zpět do localStorage
      const key = this.getLocalStorageKey(userId);
      const limited = merged.slice(0, 1000);
      localStorage.setItem(key, JSON.stringify(limited));

      log.success('Firestore history synced to localStorage:', userId);
      return true;
    } catch (error) {
      log.error('Failed to sync from Firestore:', error);
      return false;
    }
  }

  /**
   * Vygeneruje unikátní ID pro aktivitu
   */
  generateActivityId() {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

const activityHistoryService = new ActivityHistoryService();
export default activityHistoryService;

