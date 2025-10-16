import { useState, useCallback } from 'react';

export const useNavigation = (initialScreen = 'intro') => {
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [screenHistory, setScreenHistory] = useState([initialScreen]);

  // Navigace na novou stránku
  const navigateToScreen = useCallback((screenKey, options = {}) => {
    const { replace = false, addToHistory = true } = options;

    if (replace) {
      setCurrentScreen(screenKey);
    } else {
      setCurrentScreen(screenKey);
      if (addToHistory) {
        setScreenHistory(prev => [...prev, screenKey]);
      }
    }
  }, []);

  // Navigace zpět
  const navigateBack = useCallback(() => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory];
      newHistory.pop(); // Odstranit aktuální stránku
      const previousScreen = newHistory[newHistory.length - 1];
      setCurrentScreen(previousScreen);
      setScreenHistory(newHistory);
    }
  }, [screenHistory]);

  // Reset navigace
  const resetNavigation = useCallback((screenKey = 'intro') => {
    setCurrentScreen(screenKey);
    setScreenHistory([screenKey]);
  }, []);

  // Získání historie
  const getNavigationHistory = useCallback(() => {
    return [...screenHistory];
  }, [screenHistory]);

  // Kontrola, zda je možné jít zpět
  const canGoBack = screenHistory.length > 1;

  return {
    currentScreen,
    screenHistory,
    navigateToScreen,
    navigateBack,
    resetNavigation,
    getNavigationHistory,
    canGoBack
  };
};
