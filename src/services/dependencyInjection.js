/**
 * Jednoduchý Dependency Injection Container
 * Umožňuje registrovat a získávat služby s lazy loading
 */

class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Registruje službu do containeru
   * @param {string} name - Název služby
   * @param {Function|Object} factory - Factory funkce nebo instance
   * @param {boolean} singleton - Zda má být služba singleton
   */
  register(name, factory, singleton = true) {
    this.services.set(name, {
      factory: typeof factory === 'function' ? factory : () => factory,
      singleton
    });
  }

  /**
   * Získá službu z containeru
   * @param {string} name - Název služby
   * @returns {*} Instance služby
   */
  get(name) {
    const service = this.services.get(name);

    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }

    // Pokud je singleton a už existuje, vrať existující instanci
    if (service.singleton && this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Vytvoř novou instanci
    const instance = service.factory();

    // Pokud je singleton, ulož ji
    if (service.singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Zkontroluje, zda je služba registrovaná
   * @param {string} name - Název služby
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Zruší registraci služby
   * @param {string} name - Název služby
   */
  unregister(name) {
    this.services.delete(name);
    this.singletons.delete(name);
  }

  /**
   * Vyčistí všechny služby
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Získá seznam všech registrovaných služeb
   * @returns {Array<string>}
   */
  getRegisteredServices() {
    return Array.from(this.services.keys());
  }
}

// Vytvoř globální instanci
const container = new DIContainer();

// Registruj základní služby
container.register('logger', () => {
  const { default: logger } = require('./logger');
  return logger;
});

container.register('cacheService', () => {
  const { default: cacheService } = require('./cacheServiceRefactored');
  return cacheService;
});

container.register('performanceMonitor', () => {
  const { performanceMonitor } = require('./performanceMonitor');
  return performanceMonitor;
});

// Hook pro použití DI v React komponentách
export const useService = (serviceName) => {
  try {
    return container.get(serviceName);
  } catch (error) {
    console.error(`Failed to get service '${serviceName}':`, error);
    return null;
  }
};

// HOC pro injektování služeb do komponent
export const withServices = (serviceNames) => (WrappedComponent) => {
  return (props) => {
    const services = {};

    serviceNames.forEach(serviceName => {
      try {
        services[serviceName] = container.get(serviceName);
      } catch (error) {
        console.error(`Failed to inject service '${serviceName}':`, error);
        services[serviceName] = null;
      }
    });

    return <WrappedComponent {...props} {...services} />;
  };
};

export default container;
