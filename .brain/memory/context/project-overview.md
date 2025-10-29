# Meditation App - Project Overview

**Last updated:** 2025-10-29

## Co je to za projekt?

**Meditation App** je moderní PWA (Progressive Web Application) pro meditace a relaxaci s pokročilým audio systémem.

## Základní info

- **Typ:** React PWA aplikace
- **Velikost:** ~18,219 řádků kódu
- **Backend:** Firebase (Storage, Firestore, Realtime DB, Cloud Functions)
- **Stav:** Produkčně připravená aplikace

## Hlavní features

### 4 hlavní sekce (HomeScreen)
1. **Meditácia** - Timer s kruhovým indikátorem (5, 10, 15, 20 min)
2. **Dýchanie** - Vedené dýchací cvičení s animacemi
3. **Bez slov** - Relaxační hudba (album view)
4. **Mluvené slovo** - Mluvené meditace s inteligentním filtrováním

### Inteligentní audio systém
- **Filtrování podle pohlaví** (M/F/obecné) a **jazyka** (SK/CZ)
- **Parser názvů** souborů: `hlas4kód-téma.mp3`
- **Voice switcher** - přepínání mezi mužskými/ženskými hlasy
- **5úrovňový metadata fallback**: Memory → localStorage → Firestore → Realtime DB → MP3 extraction

### Firebase integrace
- **Storage:** Audio soubory (MP3)
- **Firestore:** Metadata persistence
- **Realtime Database:** Live synchronizace
- **Cloud Functions:** Auto-sync při uploadu, cleanup, statistiky
- **Authentication:** Email/password s validací

### PWA features
- **Service Worker** - Offline podpora
- **Manifest** - Standalone app mode, shortcuts
- **Cache strategie** - Separátní cache pro static/dynamic/audio

### Admin panel
- Upload audio souborů
- Správa metadat
- Cache management
- Security dashboard (development mode)
- Monitoring metriky

## Tech stack core

- **React 18.2.0** + React Router DOM 7.9.4
- **Vite 7.1.11** - Build tool
- **Framer Motion 12.23.24** - Pokročilé animace (spring physics)
- **Tailwind CSS 3.3.3** - Styling
- **Firebase 12.4.0** - Backend as a Service

## Architektura

```
src/
├── features/        # Feature-based moduly (52 souborů)
├── components/      # Shared UI komponenty (26)
├── hooks/           # Custom React hooks (20)
├── services/        # Business logika (25 služeb)
├── utils/           # Utility funkce
├── contexts/        # React contexts
└── config/          # Firebase a perf konfigurace
```

## Silné stránky

✅ **Výjimečná dokumentace** - 40 MD souborů pokrývá každou feature
✅ **Clean architektura** - Feature-based, oddělené vrstvy
✅ **Security** - Kompletní audit, input validation, encrypted localStorage
✅ **Performance** - LRU cache, code splitting, lazy loading, Service Worker
✅ **UX** - Framer Motion animace, touch optimization, offline podpora

## Co chybí

❌ **Centralizovaný task tracking** - Žádný TODO systém
❌ **CI/CD pipeline** - Žádné GitHub Actions
⚠️ **Test coverage** - Pouze 5 test souborů (target: 70% coverage)
⚠️ **E2E testy** - Chybí

## Klíčové metriky

- **Kód:** 18,219 řádků
- **Features:** 14 screens implementováno
- **Dokumentace:** 40 MD souborů (potřeba konsolidace)
- **Testy:** 5 souborů (potřeba rozšíření)
- **Git branch:** main (clean state)

## Související kontext

- [Tech Stack](tech-stack.md) - Detailní tech stack
- [Architecture](architecture.md) - Architektura a design patterns
- [Firebase Integration](firebase-integration.md) - Firebase setup a služby
- [Audio System](audio-system.md) - Audio systém a metadata
