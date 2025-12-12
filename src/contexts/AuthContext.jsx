import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@services/authService';

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
    error: null
  });

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuth(({ user, isAdmin, tokenResult, error }) => {
      setState({
        user,
        isAdmin,
        tokenResult: tokenResult || null,
        isLoading: false,
        error: error || null
      });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

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
      return tokenResult;
    }
  }), [state]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

