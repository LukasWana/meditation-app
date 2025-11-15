import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Ověř, že DOM je připravený
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Ověř, že React a ReactDOM jsou správně načtené
if (!React || typeof React.useState !== 'function') {
  console.error('❌ React is not loaded correctly or hooks are not available');
  throw new Error('React is not properly initialized');
}

// Ověř, že ReactDOM je správně načtený
if (!ReactDOM || !ReactDOM.createRoot) {
  console.error('❌ ReactDOM is not loaded correctly');
  throw new Error('ReactDOM is not properly initialized');
}

// Funkce pro ověření, že React dispatcher je připravený
function isReactDispatcherReady() {
  try {
    // Zkontroluj, že React má základní funkce
    if (!React || typeof React.useState !== 'function') {
      return false;
    }

    // Zkus zavolat React internální funkci pro ověření dispatcher
    // Pokud React dispatcher není null, je připravený
    try {
      const ReactInternal = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
      if (ReactInternal && ReactInternal.ReactCurrentDispatcher) {
        const dispatcher = ReactInternal.ReactCurrentDispatcher.current;
        if (dispatcher !== null && typeof dispatcher === 'object') {
          // Dispatcher je připravený, pokud má základní metody
          return typeof dispatcher.useState === 'function' ||
                 typeof dispatcher.useMemo === 'function' ||
                 dispatcher === ReactInternal.ReactCurrentDispatcher.default;
        }
      }
    } catch (internalError) {
      // Ignoruj chyby při přístupu k interním API - není to kritické
      console.debug('React internal check failed (expected in some cases):', internalError);
    }

    // Fallback: pokud React má všechny potřebné hooks, je pravděpodobně připravený
    return typeof React.useState === 'function' &&
           typeof React.useEffect === 'function' &&
           typeof React.useMemo === 'function' &&
           typeof React.useCallback === 'function';
  } catch (error) {
    console.debug('React dispatcher check error:', error);
    return false;
  }
}

// Vytvoř root instance
const root = ReactDOM.createRoot(rootElement);

// Funkce pro bezpečné renderování aplikace
async function renderApp() {
  // Načti App dynamicky, aby měl Vite čas dokončit pre-bundling
  const { default: App } = await import('./App.jsx');
  const { default: ErrorBoundary } = await import('./components/ErrorBoundary.jsx');

  try {
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('❌ Error rendering app:', error);
    // Zkus znovu po krátké době
    setTimeout(() => {
      try {
        root.render(
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        );
      } catch (retryError) {
        console.error('❌ Error on retry:', retryError);
        rootElement.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f4ddc4; padding: 20px; text-align: center;">
            <div>
              <h1 style="color: #d32f2f; margin-bottom: 16px;">Chyba při načítání aplikace</h1>
              <p style="color: #666; margin-bottom: 24px;">Zkuste obnovit stránku (F5 nebo Ctrl+R)</p>
              <button onclick="window.location.reload()" style="padding: 12px 24px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
                Obnovit stránku
              </button>
            </div>
          </div>
        `;
      }
    }, 500);
  }
}

// Počkej na dokončení Vite pre-bundling a připravenost React dispatcheru
async function waitForReactReady() {
  // Zkus okamžitě zkontrolovat - pokud je připravený, nečekej
  if (isReactDispatcherReady()) {
    console.log('✅ React dispatcher is ready immediately');
    return true;
  }

  // Pokud není připravený, počkej krátce a zkus znovu
  const maxAttempts = 20; // Maximálně 2 sekundy (100ms * 20)
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Počkej 100ms před dalším pokusem
    await new Promise(resolve => setTimeout(resolve, 100));

    // Zkontroluj, jestli je React dispatcher připravený
    if (isReactDispatcherReady()) {
      console.log(`✅ React dispatcher is ready after ${attempts + 1} attempts`);
      // Počkej ještě jeden tick pro jistotu
      await new Promise(resolve => setTimeout(resolve, 50));
      return true;
    }

    attempts++;
  }

  // Pokud po 2 sekundách není připravený, zkus renderovat i tak
  // Většinou je React připravený i když kontrola selže
  console.warn('⚠️ React dispatcher check timed out, attempting render anyway (this is usually fine)');
  return false;
}

// Inicializace aplikace
(async () => {
  try {
    // Počkej na připravenost React dispatcheru
    await waitForReactReady();

    // Renderuj aplikaci
    await renderApp();
  } catch (error) {
    console.error('❌ Fatal error during app initialization:', error);
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f4ddc4; padding: 20px; text-align: center;">
        <div>
          <h1 style="color: #d32f2f; margin-bottom: 16px;">Kritická chyba</h1>
          <p style="color: #666; margin-bottom: 24px;">${error.message}</p>
          <button onclick="window.location.reload()" style="padding: 12px 24px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
            Obnovit stránku
          </button>
        </div>
      </div>
    `;
  }
})();
