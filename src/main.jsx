import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initConsoleWrapper } from './services/logger'
import './index.css'

// Inicializuj console wrapper PŘED renderováním aplikace
// Tím se zachytí všechna console.log() volání a budou filtrována podle log levelu
initConsoleWrapper();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
