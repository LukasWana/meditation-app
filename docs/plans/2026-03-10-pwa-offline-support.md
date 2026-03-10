# PWA and Offline Support Implementation Plan

> **For Gemini:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable full PWA support with reliable offline caching for core assets and meditation audio files.

**Architecture:** Implement `vite-plugin-pwa` using the `generateSW` strategy with custom Workbox `runtimeCaching` rules. Port the existing audio caching logic (CORS-enabled fetch) to Workbox.

**Tech Stack:** React, Vite, Workbox (via vite-plugin-pwa)

---

### Task 1: Environment Setup

**Files:**
- Modify: `package.json`
- Modify: `vite.config.mjs`

**Step 1: Install vite-plugin-pwa**
Run: `npm install -D vite-plugin-pwa`

**Step 2: Initialize plugin in vite.config.mjs**
Add `VitePWA` to the plugins array.

---

### Task 2: Manifest & Identity Configuration

**Files:**
- Modify: `vite.config.mjs`
- Delete: `public/manifest.json` (integrated into config)

**Step 1: Define manifest in VitePWA options**
Use values from the current `public/manifest.json`.

---

### Task 3: Caching Strategy (Workbox)

**Files:**
- Modify: `vite.config.mjs`

**Step 1: Configure Precaching**
Add `globPatterns: ['**/*.{js,css,html,ico,png,svg}']` to `workbox` settings.

**Step 2: Add Runtime Caching for Fonts**
Add rule for `fonts.googleapis.com` and `fonts.gstatic.com` (CacheFirst).

**Step 3: Add Runtime Caching for Audio**
Add rule for `firebasestorage.googleapis.com` and `\.mp3$` (CacheFirst).
Ensure `handler: 'CacheFirst'` and `options.cacheName: 'meditation-audio'`.
Crucial: Set `options.matchOptions.ignoreSearch: true` and `options.cacheableResponse.statuses: [0, 200]`.

---

### Task 4: Integration in App

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/services/serviceWorker.js`

**Step 1: Update service registration**
Use `RegisterSW` component or `useRegisterSW` hook from `virtual:pwa-register/react`.

**Step 2: Remove manual sw.js from public**
Delete: `public/sw.js` to avoid conflict with generated worker.

---

### Task 5: Verification

**Step 1: Production Build**
Run: `npm run build`
Verify: `dist/registerSW.js` and `dist/sw.js` are generated.

**Step 2: Audit with Browser**
Run: `npx vite preview`
Action: Open application, check Application tab for Service Worker and Manifest.
Action: Go offline and check if assets and at least one previously played audio file still work.
