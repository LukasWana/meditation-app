

export const performanceConfig = {
  development: {
    // Development - méně agresivní monitoring
    chunkSize: 3, // Menší chunky pro lepší debugging
    imageChunkSize: 2,
    longTaskThreshold: 100, // ms
    performanceLogging: true,
    errorMonitoring: false, // Vypnuto v development
    yieldTimeout: 1 // ms
  },

  production: {
    // Production - optimalizované pro rychlost
    chunkSize: 8, // Větší chunky pro rychlost
    imageChunkSize: 5,
    longTaskThreshold: 150, // ms - vyšší threshold
    performanceLogging: false, // Vypnuto v production
    errorMonitoring: true,
    yieldTimeout: 0 // Minimální delay
  },

  testing: {
    // Testing - rychlé pro testy
    chunkSize: 20,
    imageChunkSize: 10,
    longTaskThreshold: 50,
    performanceLogging: false,
    errorMonitoring: false,
    yieldTimeout: 0
  }
};

export const getCurrentConfig = () => {
  const env = import.meta.env.MODE || 'development';

  // Pokud je explicitně nastaven debug flag, použij development config
  if (import.meta.env.VITE_DEBUG_PERFORMANCE === 'true') {
    return { ...performanceConfig.development, performanceLogging: true };
  }

  return performanceConfig[env] || performanceConfig.development;
};

export const getComponentConfig = (componentName) => {
  const baseConfig = getCurrentConfig();

  // Specifické nastavení pro různé komponenty
  const componentConfigs = {
    'AudioPlayer': {
      ...baseConfig,
      // Pro audio player není potřeba chunking
      chunkSize: Infinity,
      performanceLogging: true // Vždy loguj pro audio player
    }
  };

  return componentConfigs[componentName] || baseConfig;
};

export default getCurrentConfig;

