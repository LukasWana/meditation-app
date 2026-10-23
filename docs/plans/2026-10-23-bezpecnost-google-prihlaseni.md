# Bezpečnost Google přihlášení (app + web) — 2026-10-23

Zdroj nálezů: revize jen čtením (session PreludeCRM, 2026-10-23), paměť projektu
`revize-google-prihlaseni-2026-10-23.md`. Opravy ve dvou sessions meditation-app téhož dne
(první se přerušila těsně před commitem, druhá dokončila).

## Stav

| # | Nález | Stav | Commit (po přepisu historie) |
|---|---|---|---|
| 1 KRIT | `functions/downloadProxy.js` — onRequest bez auth, libovolná cesta v bucketu | ~~otevřeno~~ smazán z kódu i z Firebase (`functions:list` už ho nevypisuje, URL → 404) | `9bbbc2b` |
| 2 VYS | release podpis padal na commitnutý `android/debug.keystore` | ~~otevřeno~~ fallback zrušen (release bez `MEDITATION_*` properties selže), klíč smazán z gitu **i z historie** (filter-branch od `9d6e09b`, force-push) | `9bbbc2b` |
| 3 STŘ | uživatel si zapsal `subscription` do `users/{uid}` | ~~otevřeno~~ rules zakazují pole, klient bere tarif jen z claims; `hasFeature` dostávalo Promise (vždy false) — opraveno; nasazeno | `9bbbc2b` |
| 4 STŘ | App Check jen na webu, Android bez provideru | **otevřeno** — nic neděláno, enforcement v konzoli neověřen | — |
| 5 STŘ | CSP jen v hostingu, WebView bez CSP | ~~otevřeno~~ meta v `index.html`, zúžená hlavička `firebase.json`, strážní test hashe | `447c7d7` |
| 6 NÍZ | storage.rules `allow write` rušil limity `create` | ~~otevřeno~~ `allow update, delete`; `storage-test.rules` smazán; nasazeno | `15dcbba` |
| 6 NÍZ | `setAdminClaim.js` přepisoval claimy | ~~otevřeno~~ slučuje s existujícími | `15dcbba` |
| 6 NÍZ | redirect po zavření popupu, chybí `getRedirectResult`, offline access, závod v AuthContext, odhlášení nemaže data | ~~otevřeno~~ opraveno; Android odhlásí i GoogleAuth plugin | `ea1f17b` |
| 7 | mrtvý `AuthGate.jsx`, `security-headers.js`; 0 testů | ~~otevřeno~~ smazány; +19 testů (subscription 5, authService 11, CSP guard 3) | `9bbbc2b`, `ea1f17b`, `447c7d7` |

Ověřeno v session 2: eslint `src/` exit 0; vitest 26 souborů / 279 testů zelených (před CSP guard testem;
CSP guard 3/3 samostatně); `vite build` exit 0; hash inline skriptu v `dist/index.html` sedí s CSP.
Nasazeno 2026-10-23: `firestore.rules`, `storage.rules` (Deploy complete), `functions:delete downloadProxy`.

Pravidlo OR v Security Rules (proč `allow write` rušil limity): ✓1 — Firebase docs (dva texty téhož autora):
„If any matching rule grants access, the request is permitted" (firebase.google.com/docs/rules/rules-language),
„A write rule can be broken into create, update, and delete" (…/docs/storage/security/core-syntax), čteno 2026-10-23.

## Otevřené

1. **APK na zařízení** (UI se posuzuje v APK, ne v prohlížeči). Před sestavením `npx cap sync android`
   (jinak v `android/app/src/main/assets/capacitor.config.json` zůstane `forceCodeForRefreshToken`).
   Kontrola přes `chrome://inspect` → konzole WebView bez CSP chyb:
   start + pozadí podle režimu; Google přihlášení/odhlášení + profilová fotka; přepnutí účtu A→B (nabídne výběr
   účtu, profily A se nenahrají do B); audio online/offline (blob) + waveform; obrázky pozadí + vlastní ořez;
   grafy; offline režim a návrat RTDB; sdílení nastavení (Functions).
2. **Hosting nenasazen** — nová CSP hlavička ve `firebase.json` platí až po `vite build` + `firebase deploy --only hosting`.
   Po nasazení na webu ověřit App Check (žádné 403), popup přihlášení, service worker.
3. App Check pro Android (bod 4) + kontrola enforcementu a restrikcí API klíče v konzoli.
4. Release klíč: vlastní keystore mimo repo, `MEDITATION_*` do `~/.gradle/gradle.properties`, jeho SHA1 do
   Firebase / OAuth klienta. Uživatel rozhodl: výměna debug SHA v konzoli není nutná (APK jen na 2 vlastních zařízeních).
5. Drobnosti (nálezy agentů, neopraveno): závodní okno v `activityHistoryService.syncFromFirestore` při odhlášení;
   RTDB long-polling fallback není v CSP `script-src` (jen websocket); `public/show-db-data.html` (debug stránka jde
   na hosting), `public/offline.html`, `public/theme-init.js` vypadají mrtvě; zmínka o AuthGate v
   `docs/systems/IMPLEMENTATION_SUMMARY.md:45`.
6. Přepis historie: záloha `C:/work/archive/meditation-app-pred-prepisem-2026-10-23.bundle` **obsahuje klíč** —
   smazat, až bude jisté, že nic nechybí. Jiné klony repa (jiné PC/server) mají starou historii → `git fetch` +
   `git reset --hard origin/main` (nebo nový klon), jinak push klíč vrátí. Staré commity může GitHub ještě dočasně
   držet podle SHA (repo je soukromé).
7. Pracovní strom: necommitnuté změny uživatele `AGENTS.md`, smazání `CLAUDE.md` a `ijfw/` — nesahat, rozhodne uživatel.

## Předávka

```
Projekt meditation-app, bezpečnost Google přihlášení — plán docs/plans/2026-10-23-bezpecnost-google-prihlaseni.md.
Skill: superpowers:verification-before-completion (každý bod má ověřovací krok).

Hotovo a nasazeno (pravidla, smazaná funkce, historie bez klíče, push). Pokračuj sekcí „Otevřené":
1. Až uživatel otestuje APK (bod 1), zapiš výsledek; při CSP chybě v konzoli WebView doplň zdroj do
   index.html i firebase.json (strážní test src/tests/csp.guard.test.js hlídá hash inline skriptu).
2. Hosting nasazovat jen se souhlasem uživatele (bod 2).
3. App Check Android (bod 3) — nejdřív zjistit stav v konzoli, zdroje dle pravidla ověřování.
```
