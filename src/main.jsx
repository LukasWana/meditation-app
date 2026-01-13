import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initConsoleWrapper } from './services/logger'
import '@fontsource/petrona/400.css'
import '@fontsource/petrona/700.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/montserrat/300.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/quicksand/300.css'
import '@fontsource/quicksand/400.css'
import '@fontsource/quicksand/500.css'
import '@fontsource/quicksand/600.css'
import '@fontsource/quicksand/700.css'
import './index.css'

// Inicializuj console wrapper PŘED renderováním aplikace
// Tím se zachytí všechna console.log() volání a budou filtrována podle log levelu
initConsoleWrapper();

// Načti helper pro aktualizaci Firebase překladů pouze v developmentu (dostupný v konzoli)
if (import.meta.env.MODE === 'development') {
  import('./utils/updateFirebaseTranslationsHelper.js').catch(() => {
    // Ignoruj chyby při načítání (není kritické)
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
