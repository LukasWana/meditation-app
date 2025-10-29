# Todo Later

## Ready

Items připravené stát se tasky (kompletní info: Why + Context + Scope).

- [ ] **CI/CD Pipeline**
  - **Why:** Automatizovat testy a deployment, zvýšit kvalitu
  - **Context:** Momentálně manuální testing a deployment. Husky hooks existují ale CI chybí.
  - **Scope/What's missing:** GitHub Actions pro auto testy, linting, build, a deployment do Firebase. Potřeba definovat workflow.
  - **Priority:** High
  - **Added:** 2025-10-29
  - **Promoted to Ready:** 2025-10-29

- [ ] **Fix Husky Pre-commit Hook**
  - **Why:** Pre-commit hook selhává s "not found" error, blokuje commity
  - **Context:** .husky/pre-commit má technický problém (`: not found` na řádku 3). Momentálně je nutné používat `git commit --no-verify`. Hook má správnou logiku (kontrola .env souborů, API keys) ale špatný shebang nebo path problém.
  - **Scope/What's missing:** Opravit shebang line nebo path issues, zajistit správné executable permissions. Testovat hook opravený na .env files a API key detekci.
  - **Priority:** High
  - **Added:** 2025-10-30
  - **Promoted to Ready:** 2025-10-30

- [ ] **Rozšířit Test Coverage**
  - **Why:** Target je 70% coverage, momentálně ~20-25%
  - **Context:** Všechny existující testy nyní procházejí (91/91 passed, 100% pass rate). Existují testy pro: useTimer hook, cache/logger services, validation/error-handler utils. Logger nyní má history tracking.
  - **Scope/What's missing:** Testy pro audio hooks (useAudioFilter, useVoiceSwitcher, useMetadataLoader), unifiedMetadataService (5-level fallback), komponenty (AudioPlayer, Controls, CircularProgress), Firebase integration, E2E testy pro kritické flows
  - **Priority:** High
  - **Added:** 2025-10-29
  - **Updated:** 2025-10-30 (existing tests fixed, ready for expansion)
  - **Promoted to Ready:** 2025-10-29

## Someday/Maybe

Nápady a úkoly pro budoucnost (vyžadují upřesnění).

- [ ] **Konsolidace Dokumentace**
  - **Why:** 40 MD souborů je těžké spravovat, možná duplicita
  - **Context:** Výborná dokumentace ale roztříštěná (AUDIO_*.md, FIREBASE_*.md, SECURITY_*.md, atd.)
  - **Scope/What's missing:** Sloučit tematicky příbuzné dokumenty, vytvořit master index, přesunout historické bugy do .brain/learned/
  - **Priority:** Medium
  - **Added:** 2025-10-29

- [ ] **TypeScript Migrace**
  - **Why:** Type safety, lepší DX, catch errors v compile time
  - **Context:** Projekt je v JavaScript, má TypeScript ESLint ale nepouživá TS
  - **Scope/What's missing:** Postupná migrace .js → .ts, začít od utils/services, pak hooks, nakonec komponenty
  - **Priority:** Medium
  - **Added:** 2025-10-29

- [ ] **E2E Testing Setup**
  - **Why:** Unit testy nestačí, potřeba testovat real user flows
  - **Context:** Vitest setup existuje pro unit testy
  - **Scope/What's missing:** Playwright nebo Cypress setup, testy pro: audio playback flow, meditation timer flow, admin upload flow
  - **Priority:** Medium
  - **Added:** 2025-10-29

- [ ] **Accessibility Audit**
  - **Why:** Přístupnost pro uživatele se screen readery a keyboard navigation
  - **Context:** UI komponenty nemají ARIA labels, keyboard navigation není testovaná
  - **Scope/What's missing:** ARIA labels, keyboard navigation, focus management, skip links, alt texts
  - **Priority:** Low
  - **Added:** 2025-10-29

- [ ] **Internationalization (i18n)**
  - **Why:** Rozšířit na více jazyků (momentálně SK/CZ hardcoded)
  - **Context:** LanguageContext existuje ale texty jsou hardcoded v komponentách
  - **Scope/What's missing:** i18next nebo react-intl, translation soubory, dynamic language switching
  - **Priority:** Low
  - **Added:** 2025-10-29

- [ ] **Multi-region Firebase**
  - **Why:** Lepší latence pro uživatele mimo region
  - **Context:** Momentálně single-region Firebase
  - **Scope/What's missing:** Firestore multi-region setup, CDN pro audio files, edge caching strategy
  - **Priority:** Low (pouze pokud máme global users)
  - **Added:** 2025-10-29

## Completed/Declined

Archivované items (dokončené nebo odmítnuté).

_(zatím prázdné)_
