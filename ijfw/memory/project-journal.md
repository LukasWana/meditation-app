<!-- ijfw-schema: v1 -->

<!-- ijfw schema:1 -->
# IJFW Project Journal
- [2026-08-02T06:12:48Z] session-end: #1
- [2026-08-02T06:25:28Z] session-end: #2
- [2026-08-02T06:32:01Z] session-end: #3
- [2026-08-02T10:25:40Z] session-end: #4
- [2026-08-02T20:35:22Z] session-end: #5
- [2026-08-04T11:38:15.082Z] **decision** [plan-sutra, audit, meditation-app, android, capacitor, firebase, bezpecnost, p0]: PLAN SUTRA 1/3 - master + P0 bezpecnost (audit 2026-08-04)
- [2026-08-04T11:38:51.393Z] **decision** [plan-sutra, audit, meditation-app, android, capacitor, audio, service-worker, testy, p1]: PLAN SUTRA 2/3 - P1 funkcni diry (background audio, SW, testy)
- [2026-08-04T11:39:27.475Z] **decision** [plan-sutra, audit, meditation-app, architektura, mrtvy-kod, firebase, repo-hygiena, p2]: PLAN SUTRA 3/3 - P2 architektura, mrtvy kod, repo hygiena
- [2026-08-04T12:28:16.404Z] **decision** [plan-sutra, implementace, p0, p1, bezpecnost, android, capacitor, firebase, audio, testy, lint]: SUTRA 01-03 implementovano - P0 bezpecnost + P1 funkcni diry
- [2026-08-04T13:18:41.911Z] **decision** [plan-sutra, p0-1, users-json, meditation-app, bezpecnost, rozhodnuti-uzivatele, heslo]: PLAN SUTRA P0-1 uzavren - heslo se NEMENI, rozhodnuti uzivatele
- [2026-08-04T13:19:11.578Z] **pattern** [husky, git-hooks, pre-commit, npm-audit, errexit, meditation-app]: Husky 9 spousti hooky pres sh -e, "neblokujici" kontroly blokuji
- [2026-08-04T14:18:09.491Z] **decision** [plan-sutra, p0-1, users-json, filter-repo, meditation-app, hotovo, git-historie]: PLAN SUTRA P0-1 DOKONCEN - historie prepsana, users.json pryc
- [2026-08-04T14:36:21.596Z] **handoff** [plan-sutra, meditation-app, handoff, android, capacitor, firebase, p2]: meditation-app: audit SUTRA, P0-1 uzavren, P0+P1 hotove, P2 otevrene
- [2026-08-04T14:37:17.709Z] **decision** [plan-sutra, p0-1, meditation-app, oprava-pameti, zastaraly-zaznam, users-json, heslo]: OPRAVA zastaraleho zaznamu druheho agenta o users.json a hesle
- [2026-08-04T14:42:55.321Z] **preference** [apk, build, android, deployment]: APK vzdy exportuj do rootu projektu
- [2026-08-04T14:46:21.156Z] **pattern** [apk, build, android, capacitor, signing, proguard, export]: Navod: Export signed APK pro meditation-app
- [2026-08-04T15:05:55.613Z] **decision** [plan-globredesign, globredesign, meditation-app, design-system, tailwind, typografie, framer-motion, refaktor]: PLAN GLOBREDESIGN - globalni designovy system, plan refaktoru
- [2026-08-04T16:35:04.965Z] **decision** [design-system, refactor, globredesign, design-tokens, heading-primitive, guard-test, tailwind, framer-motion]: GLOBREDESIGN: Global design system refactor (9 tasks, 9 commits)
- [2026-08-04T16:35:13.235Z] **pattern** [firebase, apk, android, gradle, capacitor, build, security]: Firebase config + APK build workflow (Gradle 8.14.3, copy APKs to root)
- [2026-08-04T16:35:18.344Z] **preference** [apk, security, credentials, preferences]: APKs to root, never show credentials in chat
- [2026-08-04T16:57:48.470Z] **decision** [ijfw, mcp-server, bugfix, async, better-sqlite3, handleRecall, searchMemory]: Fix: IJFW MCP handleRecall async bug + better-sqlite3 install
- [2026-08-04T20:37:46.456Z] **decision** [globredesign, design-system, heading, typografie, sjednoceni, meditation-app, fix, pattern-dychani]: Sjednoceni nadpisu na referencni pattern dychani
- [2026-08-04T20:37:52.690Z] **handoff**: SESSION 2026-08-04, projekt meditation-app. | | == CO SE STALO == | Uzivatel se ptal na stav planu GLOBREDESIGN (sjednoceni design CSS). Plan byl implementovan (9 tasku, 9 commitu), ale vizualne se ne
- [2026-08-04T20:37:52.693Z] prior-handoff-archived: SESSION 2026-08-04, projekt C:\work\projects\meditation-app (React 18 + Vite 7 + Capacitor 8 + Firebase, Android). Uzivatel komunikuje CESKY. |  | == CO SE STALO == | Proveden hloubkovy audit cele aplikace -&gt; 20 nalezu, ulozeny jako PLAN SUTRA 1/3 (P0 bezpecnost), 2/3 (P1 funkcni diry), 3/3 (P2 architektura). Na plnenim paralelne pracoval druhy agent. |  | == HOTOVO == | P0-1 users.json (moje prace, uzavreno): | - Odstranen z indexu + .gitignore r.231, soubor zustava na disku. | - Cela git hi
- [2026-08-04T20:37:56.009Z] **pattern** [pattern, heading, design-system, meditation-app, framer-section, typografie]: Referencni nadpis pattern pro meditation-app obrazovky
- [2026-08-04T20:52:36.055Z] **decision** [csp, firebase-hosting, app-check, recaptcha, inline-script, security, meditation-app, fix]: CSP fix - inline script hash, gtag/recaptcha domains, App Check reCAPTCHA key
- [2026-08-04T20:52:38.890Z] **pattern** [csp, firebase, security, app-check, recaptcha, meditation-app]: CSP konfigurace meditation-app - script-src, inline hash, App Check
- [2026-08-04T20:52:41.132Z] **handoff**: SESSION 2026-08-04 (pokracovani). | | == CO SE STALO == | Po nasazeni sjednoceni nadpisu (commit ff327ac) na Firebase Hosting se objevily 3 CSP chyby: | 1. Inline script (theme-init) blokovan CSP | 2.
- [2026-08-04T20:52:41.134Z] prior-handoff-archived: SESSION 2026-08-04, projekt meditation-app. | | == CO SE STALO == | Uzivatel se ptal na stav planu GLOBREDESIGN (sjednoceni design CSS). Plan byl implementovan (9 tasku, 9 commitu), ale vizualne se nepovedlo - obrazovky mely ruzne nadpisy. | | ANALYZA: Pomoci explore agenta jsem zjistil ze referencni pattern (z BreathProfilesScreen / "dychani") je: FramerSection(text-center mb-6, fadeIn, 0.1) &gt; div[height:3.5rem, flex-col, justify-start, items-center, mb:0.5rem] &gt; Heading level={1} bez cla
- [2026-08-05T06:14:02.202Z] **pattern** [meditation-app, android, capacitor, safe-area, css, design-system, apk, dvh, react-strictmode]: Safe-area inset: obsah obrazovky musí kopírovat pozici BackButtonu
