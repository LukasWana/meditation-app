import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { authService } from '@services/authService';
import userSettingsService from '@services/userSettingsService';
import subscriptionService from '@services/subscriptionService';

const AuthContext = createContext(null);

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
    isAdmin: false,
    tokenResult: null,
    isLoading: true,
    error: null,
    userProfile: null,
    subscription: null
  });

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

      setState(prev => ({
        ...prev,
        userProfile: profile,
        subscription
      }));
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuth(async ({ user, isAdmin, tokenResult, error }) => {
      const newState = {
        user,
        isAdmin,
        tokenResult: tokenResult || null,
        isLoading: false,
        error: error || null
      };

      setState(newState);

      // Po přihlášení načti profil a synchronizuj nastavení
      if (user && !error) {
        await loadUserProfile(user.uid, tokenResult);

        // Synchronizuj nastavení (cloud-first strategy)
        try {
          await userSettingsService.syncSettings(user.uid, 'cloud-first');
          // Znovu načti profil po synchronizaci
          await loadUserProfile(user.uid, tokenResult);
        } catch (syncError) {
          console.error('Failed to sync settings:', syncError);
        }
      } else {
        // Při odhlášení vymaž profil
        setState(prev => ({ ...prev, userProfile: null, subscription: null }));
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loadUserProfile]);

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
    signOut: authService.signOutUser,
    refreshClaims: async () => {
      if (!state.user) return null;
      const tokenResult = await authService.fetchTokenResult(state.user);
      setState(prev => ({
        ...prev,
        tokenResult,
        isAdmin: !!tokenResult?.claims?.admin
      }));

      // Znovu načti subscription s novými claims
      if (state.user) {
        const subscription = await subscriptionService.getSubscription(state.user.uid, tokenResult);
        setState(prev => ({ ...prev, subscription }));
      }

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
  }), [state, saveUserSettings, syncLocalToCloud, syncCloudToLocal, loadUserProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

