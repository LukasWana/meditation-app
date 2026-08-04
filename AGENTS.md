---
ijfw_version: 1.3.2
ijfw_schema: 1
type: software
primary_type: software
secondary_types: []
confidence: 0.905
detected_at: 2026-08-04T11:11:11.714Z
signals:
  - kind: manifest
    weight: 0.9
    manifests: [package.json, package.json, build.gradle, build.gradle, build.gradle]
  - kind: dir_design
    weight: 0.4
    name: assets
  - kind: dir_design
    weight: 0.4
    name: assets
  - kind: file_extension_ratio
    weight: 0.7
    domain: software
    ratio: 0.971
    count: 335
  - kind: filename_pattern
    weight: 0.2
    domain: content
    name: post-applypatch
  - kind: filename_pattern
    weight: 0.2
    domain: content
    name: post-checkout
  - kind: filename_pattern
    weight: 0.2
    domain: content
    name: post-commit
  - kind: filename_pattern
    weight: 0.2
    domain: content
    name: post-merge
  - kind: filename_pattern
    weight: 0.2
    domain: content
    name: post-rewrite
---
# AGENTS.md

This file follows the open AGENTS.md spec (https://agents.md/) and is the
canonical agent-instructions surface for this project. Platform-specific
files (CLAUDE.md, GEMINI.md, WAYLAND.md, codex/AGENTS.md, .cursorrules,
.windsurfrules, copilot-instructions.md) are thin adapters that point here.

Four IJFW-managed regions live in this file. Content outside the markers is
yours -- IJFW will never touch it.

<!-- IJFW-MEMORY-START -->
Project memory at .ijfw/memory/. Call `ijfw_memory_prelude` for full context.
<!-- IJFW-MEMORY-END -->

<!-- IJFW-ROUTING-START -->
<!-- IJFW-ROUTING-END -->

<!-- IJFW-AGENTS-START -->
No project agents yet. Run `ijfw team` to set them up.
<!-- IJFW-AGENTS-END -->

<!-- IJFW-BLACKBOARD-START -->
<!-- Reserved for Pillar B multi-CLI orchestration. Empty in alpha. -->
<!-- IJFW-BLACKBOARD-END -->

## Project: meditation-app

**Meditation App** is a guided meditation app for Android, built with:
- React 18 + JavaScript (JSX)
- Vite 7
- Tailwind CSS 3
- Capacitor 8 (Android target)
- Firebase 12 (Auth, Firestore, RTDB)
- framer-motion 12 (animations)
- zustand 5 (state)
- react-router-dom 7
- wavesurfer.js 7 (audio)
- recharts 3 (charts)
- lucide-react (icons)
- vite-plugin-pwa (PWA support)

### Architecture
- `src/App.jsx` — main app, routing
- `src/main.jsx` — entry point, deviceTier detection
- `src/contexts/` — ThemeContext, AuthContext, etc.
- `src/stores/` — zustand stores
- `src/features/` — feature modules
- `src/components/` — UI components
- `src/services/` — rtdbConnectionManager, realtimeMetadataService, etc.
- `src/hooks/` — useFinalSound, useCountdownSound, useBreathPhase, usePageVisible, etc.
- `src/utils/` — deviceTier, logger, etc.
- `src/config/` — performance, firebase config
- `src/locales/` — i18n
- `android/` — Capacitor Android project

### Key features
- Guided meditation with breathing animations
- Audio playback (wavesurfer.js)
- Firebase Auth (Google Sign-In via @codetrix-studio/capacitor-google-auth)
- Firestore + RTDB for session data
- Dark mode (#151515 + radii)
- Safe area insets handling
- Energy optimization (deviceTier, backdrop-filter degrade, RTDB offline mode)
- framer-motion page transitions
- PWA support
- Test suite: vitest (237 passed, 10 failed baseline)
- ESLint + Husky pre-commit

### Known issues (from handoff 2026-08-02)
- 94 files in working tree uncommitted (~2 months of work)
- 10 test failures pre-existing (baseline verified)
- 93 lint errors pre-existing
- performanceMonitor.js, errorMonitoring.js, dependencyInjection.js, useRealtimeMetadata.js deleted (dead code)
- src/config/performance.js orphaned after deletion