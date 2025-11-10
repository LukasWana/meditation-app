# Plán oprav chyb shaderů - V5

## Analýza problémů z logu

### 1. Shader compilation errors

#### A. C.9 FFT Spiral.fs - Undeclared variables
**Problém:**
- `dis`, `vol_min`, `vol_max` jsou zakomentované, ale používají se v kódu
- Řádky 56, 57, 63, 83 používají tyto proměnné

**Řešení:**
- Přidat automatickou detekci zakomentovaných proměnných, které se používají
- Deklarovat je jako `float` s výchozími hodnotami z ISF inputs

#### B. D.2 Glitch Shifter.fs - Dimension mismatch
**Problém:**
- Type mismatch při operacích s `vec2` a `vec4`
- Pravděpodobně problém s `mod()` nebo aritmetickými operacemi

**Řešení:**
- Přidat regex pro opravu `mod(vec2(...), 1.0)` na `mod(vec2(...), vec2(1.0))`
- Opravit aritmetické operace mezi `vec2` a skaláry

#### C. D.3 VHS Glitch.fs - Missing token
**Problém:**
- Chybějící token v řádku 609: `bleed += vec4(0.5, 0.5, 0.5, 0.5).r * 4.0;`
- Pravděpodobně problém s předchozí opravou (Oprava 18)

**Řešení:**
- Zkontrolovat a opravit regex pro Opravu 18
- Zajistit, že se oprava aplikuje správně

#### D. S.1 Synthwave.fs - Type mismatch v loopu
**Problém:**
- `for(int i = 0; i < iters; i++)` kde `iters` je `float`, ale loop očekává `int`
- Řádek 769: `for(int i = 0; i < iters; i++)`

**Řešení:**
- Přidat regex pro opravu `for(int i = 0; i < floatVar; i++)` na `for(int i = 0; i < int(floatVar); i++)`
- Nebo změnit `iters` na `int` při deklaraci

### 2. WebGL context management

#### A. Too many active WebGL contexts
**Problém:**
- 12 varování "Too many active WebGL contexts"
- Kontexty se vytvářejí rychleji, než se uvolňují

**Řešení:**
- Snížit `maxContexts` z 8 na 6
- Zrychlit cleanup interval z 3s na 2s
- Přidat okamžité uvolnění kontextů při ztrátě (context lost event)

#### B. WebGL kontext byl ztracen
**Problém:**
- Mnoho varování "WebGL kontext byl ztracen - na začátku renderování"
- Render loop pokračuje i po ztrátě kontextu

**Řešení:**
- Přidat event listenery pro `webglcontextlost` a `webglcontextrestored`
- Zastavit render loop okamžitě při ztrátě kontextu
- Přidat retry mechanismus pro obnovení kontextu

## Implementační plán

### Fáze 1: Oprava undeclared variables (C.9 FFT Spiral.fs)

1. **Rozšířit `addMissingCommonVariables` v `shaderLoader.js`:**
   - Přidat detekci zakomentovaných proměnných, které se používají
   - Deklarovat `dis`, `vol_min`, `vol_max` jako `float` s výchozími hodnotami
   - Zkontrolovat ISF inputs pro výchozí hodnoty

2. **Přidat novou funkci `detectCommentedVariables`:**
   - Najít zakomentované deklarace proměnných
   - Zkontrolovat, zda se proměnné používají v kódu
   - Vrátit seznam proměnných k deklaraci

### Fáze 2: Oprava dimension mismatch (D.2 Glitch Shifter.fs)

1. **Rozšířit `sanitizeSyntaxErrors` v `shaderLoader.js`:**
   - Přidat Opravu 19: `mod(vec2(...), 1.0)` -> `mod(vec2(...), vec2(1.0))`
   - Přidat Opravu 20: `vec2(...) + float` -> `vec2(...) + vec2(float)`
   - Přidat Opravu 21: `vec2(...) * float` -> `vec2(...) * vec2(float)`

### Fáze 3: Oprava missing token (D.3 VHS Glitch.fs)

1. **Opravit Opravu 18 v `sanitizeSyntaxErrors`:**
   - Zkontrolovat, zda regex správně zachytává opakované řádky
   - Přidat alternativní regex pro různé formáty
   - Otestovat na konkrétním shaderu

### Fáze 4: Oprava type mismatch v loopu (S.1 Synthwave.fs)

1. **Přidat Opravu 22 v `sanitizeSyntaxErrors`:**
   - Regex: `for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\w+)\s*;\s*\1\s*\+\+\s*\)`
   - Nahradit: `for(int $1 = $2; $1 < int($3); $1++)`
   - Nebo změnit deklaraci `iters` na `int` v `addMissingCommonVariables`

### Fáze 5: Vylepšení WebGL context management

1. **Snížit limit kontextů:**
   - Změnit `maxContexts` z 8 na 6 v `contextManager.js`
   - Zrychlit cleanup interval z 3s na 2s

2. **Přidat event listenery:**
   - V `getWebGLContext` přidat listenery pro `webglcontextlost` a `webglcontextrestored`
   - Zastavit render loop při ztrátě kontextu
   - Přidat retry mechanismus

3. **Vylepšit cleanup logiku:**
   - Přidat okamžité uvolnění kontextů při ztrátě
   - Zlepšit detekci neaktivních kontextů

## Priorita implementace

1. **Vysoká priorita:**
   - Fáze 1: Oprava undeclared variables (C.9 FFT Spiral.fs)
   - Fáze 4: Oprava type mismatch v loopu (S.1 Synthwave.fs)
   - Fáze 5: Vylepšení WebGL context management

2. **Střední priorita:**
   - Fáze 2: Oprava dimension mismatch (D.2 Glitch Shifter.fs)
   - Fáze 3: Oprava missing token (D.3 VHS Glitch.fs)

## Testování

Po každé fázi:
1. Otestovat konkrétní shader, který měl chybu
2. Zkontrolovat, zda se chyba neobjevuje v konzoli
3. Ověřit, zda se shader správně kompiluje a renderuje

## Očekávané výsledky

- Všechny 4 shadery se budou kompilovat bez chyb
- Snížení počtu varování "Too many active WebGL contexts" na minimum
- Eliminace varování "WebGL kontext byl ztracen"
- Stabilní renderování všech shaderů

