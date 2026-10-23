import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { authService } from '@services/authService';
import userSettingsService from '@services/userSettingsService';
import subscriptionService from '@services/subscriptionService';
import activityHistoryService from '@services/activityHistoryService';

const AuthContext = createContext(null);

// Jak dlouho čekat na uložení dechových profilů do cloudu před odhlášením
const SIGN_OUT_SYNC_TIMEOUT_MS = 5000;

const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), ms);
  promise.then(
    (value) => { clearTimeout(timer); resolve(value); },
    (err) => { clearTimeout(timer); reject(err); }
  );
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    isLoading: true,
    isAdmin: false,
    tokenResult: null,
    error: null,
    userProfile: null,
    subscription: null
  });

  // Pořadové číslo změny auth stavu — asynchronní řetězec staršího uživatele
  // se po přepnutí účtu / odhlášení zastaví a nepřepíše stav nového.
  const authSeqRef = useRef(0);
  // Chyba z dokončení redirect přihlášení (web) — drží se, dokud se nikdo nepřihlásí
  const redirectErrorRef = useRef(null);

  // Načti user profile po přihlášení
  const loadUserProfile = useCallback(async (userId, tokenResult) => {
    if (!userId) {
      setState(prev => ({ ...prev, userProfile: null, subscription: null }));
      return;
    }

    try {
      // Načti profil
      const profile = await userSettingsService.getUserProfile(userId);

      // Načti subscription
      const subscription = await subscriptionService.getSubscription(userId, tokenResult);

      // Aktualizuj lastLogin
      await userSettingsService.updateLastLogin(userId);

      // Zapiš jen pokud je userId pořád přihlášený uživatel
      setState(prev => (prev.user?.uid === userId
        ? { ...prev, userProfile: profile, subscription }
        : prev));
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }, []);

  useEffect(() => {
    // subscribeToAuth je async — cleanup musí dostat funkci, ne Promise
    let unsubscribe = null;
    let cancelled = false;

    // Web: dokonči případné přihlášení přes signInWithRedirect (na nativní platformě no-op)
    authService.completeRedirectSignIn().catch((redirectError) => {
      console.error('Redirect sign-in failed:', redirectError);
      redirectErrorRef.current = redirectError;
      if (!cancelled) {
        setState(prev => (prev.user ? prev : { ...prev, error: redirectError }));
      }
    });

    const subscription = authService.subscribeToAuth(async ({ user, isAdmin, tokenResult, error }) => {
      const seq = ++authSeqRef.current;
      const isStale = () => cancelled || seq !== authSeqRef.current;

      if (user) {
        redirectErrorRef.current = null;
      }

      const newState = {
        user,
        isAdmin,
        tokenResult: tokenResult || null,
        isLoading: false,
        error: error || (user ? null : redirectErrorRef.current),
        userProfile: null,
        subscription: null
      };

      setState(newState);

      // Po přihlášení načti profil a synchronizuj nastavení
      if (user && !error) {
        await loadUserProfile(user.uid, tokenResult);
        if (isStale()) return;

        // Synchronizuj nastavení (cloud-first strategy)
        try {
          await userSettingsService.syncSettings(user.uid, 'cloud-first');
          if (isStale()) return;
          // Znovu načti profil po synchronizaci
          await loadUserProfile(user.uid, tokenResult);
        } catch (syncError) {
          console.error('Failed to sync settings:', syncError);
        }
        if (isStale()) return;

        // Synchronizace historie aktivity:
        // 1) stáhni z Firestore do localStorage
        // 2) přenes případné "anonymous" záznamy do userId
        // 3) pushni merged historii zpět do Firestore
        try {
          await activityHistoryService.syncFromFirestore(user.uid);
          if (isStale()) return;
          const migrated = activityHistoryService.migrateAnonymousHistoryToUser(user.uid);
          if (migrated) {
            await activityHistoryService.syncToFirestore(user.uid);
          }
        } catch (historyError) {
          console.error('Failed to sync activity history:', historyError);
        }
      }
    });

    subscription.then((fn) => {
      if (cancelled) {
        fn?.();
      } else {
        unsubscribe = fn;
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [loadUserProfile]);

  const signOut = useCallback(async () => {
    const uid = state.user?.uid;

    // Dechové profily se ukládají jen lokálně — před smazáním je zkus uložit do cloudu.
    // Když se to nepovede (offline, timeout), lokální profily zůstanou, aby se neztratily.
    let profilesSaved = !uid;
    if (uid) {
      try {
        profilesSaved = await withTimeout(
          userSettingsService.syncLocalToCloud(uid),
          SIGN_OUT_SYNC_TIMEOUT_MS
        );
      } catch (syncError) {
        console.warn('Sync before sign out failed, keeping local breath profiles:', syncError);
        profilesSaved = false;
      }
    }

    const result = await authService.signOutUser();

    try {
      authService.clearUserLocalData(window.localStorage, { includeBreathProfiles: profilesSaved === true });
    } catch (clearError) {
      console.error('Failed to clear user data from localStorage:', clearError);
    }

    return result;
  }, [state.user]);

  const saveUserSettings = useCallback(async (settings) => {
    if (!state.user) {
      throw new Error('User must be logged in to save settings');
    }

    try {
      await userSettingsService.saveUserProfile(state.user.uid, {
        ...state.userProfile,
        ...settings
      });
      await loadUserProfile(state.user.uid, state.tokenResult);
      return true;
    } catch (error) {
      console.error('Failed to save user settings:', error);
      throw error;
    }
  }, [state.user, state.userProfile, state.tokenResult, loadUserProfile]);

  const syncLocalToCloud = useCallback(async () => {
    if (!state.user) {
      throw new Error('User must be logged in to sync');
    }

    try {
      await userSettingsService.syncLocalToCloud(state.user.uid);
      await loadUserProfile(state.user.uid, state.tokenResult);
      return true;
    } catch (error) {
      console.error('Failed to sync local to cloud:', error);
      throw error;
    }
  }, [state.user, state.tokenResult, loadUserProfile]);

  const syncCloudToLocal = useCallback(async () => {
    if (!state.user) {
      throw new Error('User must be logged in to sync');
    }

    try {
      await userSettingsService.syncCloudToLocal(state.user.uid);
      await loadUserProfile(state.user.uid, state.tokenResult);
      return true;
    } catch (error) {
      console.error('Failed to sync cloud to local:', error);
      throw error;
    }
  }, [state.user, state.tokenResult, loadUserProfile]);

  const value = useMemo(() => ({
    ...state,
    signInWithGoogle: authService.signInWithGoogle,
    signOut,
    refreshClaims: async () => {
      if (!state.user) return null;
      const uid = state.user.uid;
      const tokenResult = await authService.fetchTokenResult(state.user);
      setState(prev => (prev.user?.uid === uid
        ? { ...prev, tokenResult, isAdmin: !!tokenResult?.claims?.admin }
        : prev));

      // Znovu načti subscription s novými claims
      const subscription = await subscriptionService.getSubscription(uid, tokenResult);
      setState(prev => (prev.user?.uid === uid ? { ...prev, subscription } : prev));

      return tokenResult;
    },
    saveUserSettings,
    syncLocalToCloud,
    syncCloudToLocal,
    loadUserProfile: () => loadUserProfile(state.user?.uid, state.tokenResult),
    hasPremiumFeature: (feature) => {
      if (!state.user) return false;
      return subscriptionService.hasFeature(state.user.uid, state.tokenResult, feature);
    }
  }), [state, signOut, saveUserSettings, syncLocalToCloud, syncCloudToLocal, loadUserProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
