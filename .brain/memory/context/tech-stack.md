# Tech Stack

**Last updated:** 2025-10-29

## Core Framework

### React Ecosystem
- **React 18.2.0** - UI framework
- **React Router DOM 7.9.4** - Routing systém
- **react-firebase-hooks 5.1.1** - Firebase hooks pro React

### Build & Dev Tools
- **Vite 7.1.11** - Build tool a dev server (rychlejší než Webpack)
- **PostCSS + Autoprefixer** - CSS processing
- **vite-plugin-svgr** - SVG jako React komponenty

## UI & Styling

### CSS & Animace
- **Tailwind CSS 3.3.3** - Utility-first CSS framework
- **Framer Motion 12.23.24** - Pokročilé animace
  - Spring physics
  - Gesture support (swipe, tap, hover)
  - AnimatePresence pro page transitions
  - Stagger animace
- **Lucide React 0.263.1** - Moderní ikonová knihovna

### Fonts
- **Google Fonts** - IBM Plex Sans (dříve Playfair Display)

## Backend & Database

### Firebase 12.4.0
- **Authentication** - Email/password přihlašování
- **Firestore** - NoSQL databáze pro metadata
- **Realtime Database** - Real-time synchronizace
- **Storage** - MP3 soubory, audio content
- **Cloud Functions** - Node.js 18 runtime
  - `onFileUpload` - Auto sync při uploadu
  - `syncStorage` - Manuální sync
  - `saveScrapedMetadata` - Ukládání dat
  - `cleanupMetadata` - Cleanup orphaned dat
  - `getFileStats` - Statistiky
- **Hosting** - Produkční deployment

## Development & Testing

### Testing Stack
- **Vitest 1.0.4** - Testovací framework (rychlejší než Jest)
- **@testing-library/react 14.1.2** - React testing utilities
- **@vitest/ui** - UI pro testy
- **@vitest/coverage-v8** - Code coverage reporting
- **jsdom** - Browser environment pro testy

### Code Quality
- **ESLint** - Linting s security pluginem
- **eslint-plugin-security** - Security pattern detection
- **TypeScript ESLint** - Type checking (i když projekt je JS)
- **Husky 9.1.7** - Git hooks
  - Pre-commit: ESLint + security checks

### Coverage Targets
```javascript
thresholds: {
  branches: 70,
  functions: 70,
  lines: 70,
  statements: 70
}
```

## PWA Features

### Service Worker
- **Workbox** style cache strategies
- Network First pro API calls
- Stale While Revalidate pro assets
- Separátní cache pro static/dynamic/audio
- CORS handling pro Firebase Storage

### Manifest
- Standalone app mode
- Custom ikony a splash screens
- Shortcuts (Rychlá meditace, Dýchání)
- Portrait orientace preference

## Code Splitting & Optimization

### Manual Chunks (vite.config.js)
```javascript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-framer': ['framer-motion'],
  'vendor-firebase': ['firebase/app', 'firebase/auth', ...],
  'app-components': [/src\/components/],
  'app-services': [/src\/services/],
}
```

### Lazy Loading
- Lazy imported screens a komponenty
- Background data preloading během intro
- Code splitting per route

## Package Manager & Scripts

### NPM Scripts
```bash
npm run dev          # Vite dev server :3000
npm run build        # Production build
npm run preview      # Preview production
npm run test         # Vitest
npm run test:ui      # Vitest UI
npm run test:coverage # Coverage report
npm run lint         # ESLint
```

### Firebase Scripts
```bash
cd functions
npm run serve        # Emulators
npm run deploy       # Deploy functions
firebase deploy      # Deploy celé app
```

## Dependencies Overview

### Production Dependencies (16)
- Core: react, react-dom, react-router-dom
- Firebase: firebase, react-firebase-hooks
- UI: framer-motion, lucide-react
- Styling: tailwindcss

### Dev Dependencies (20)
- Build: vite, @vitejs/plugin-react
- Testing: vitest, @testing-library/react
- Linting: eslint, eslint-plugin-security
- Git: husky
- CSS: tailwindcss, postcss, autoprefixer

## Environment Variables

**.env (gitignored):**
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_RECAPTCHA_SITE_KEY=
```

## Path Aliases

```javascript
'@components': './src/components',
'@services': './src/services',
'@hooks': './src/hooks',
'@utils': './src/utils',
'@config': './src/config',
'@contexts': './src/contexts',
'@features': './src/features',
```

## Version Strategy

- **Semantic Versioning** pro dependencies
- **Locked versions** v package.json (žádné ^/~)
- **Regular updates** s testing

## Poznámky

- Projekt používá **JavaScript** (ne TypeScript), ale má TypeScript ESLint
- **Vite** místo Webpack pro rychlejší build
- **Vitest** místo Jest pro rychlejší testy
- **Firebase v12** - nejnovější major verze
- **React 18** - Concurrent rendering support
