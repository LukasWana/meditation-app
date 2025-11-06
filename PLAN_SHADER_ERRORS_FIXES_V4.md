# Plán oprav shader chyb - V4

## Analýza logu `localhost-1762428130855.log`

### Hlavní problémy:

1. **C.9 FFT Spiral.fs** - `undeclared_variable`:
   - Proměnné `dis`, `vol_min`, `vol_max`, `blur`, `width` jsou zakomentované (řádky 260-270)
   - Ale používají se v kódu (řádky 293, 294, 300, 320, 321)
   - **Problém:** Detekce blokových komentářů není správná - pokud je `/*` a `*/` na stejném řádku, nebo pokud je více blokových komentářů, logika selže

2. **F.3 Infernogram.fs** - `undeclared_variable`:
   - `GAIN` není deklarováno (řádek 751)
   - **Problém:** `GAIN` se přidává jen pokud `PI` existuje nebo se přidává. Ale pokud `PI` neexistuje, `GAIN` se nepřidá

3. **S.1 Synthwave.fs** - `undeclared_variable`:
   - Proměnné `iters` a `minDst` jsou deklarovány v `main()` (řádky 1049-1050)
   - Ale používají se v `getGridColor()` před deklarací (řádky 1019, 1021, 1027, 1040)
   - **Problém:** Scope problém - proměnné deklarované v `main()` nejsou dostupné v jiných funkcích

4. **M.1 Stripes.fs** - `type_mismatch`:
   - Na řádku 856: `vec4(0.5 + 0.5, float(channel)  + 0.5, 0.5, 0.5);` - to vypadá opraveně
   - Možná je problém s `octaveValue = mod(int(currentNote) / 12.0, 1.0);` - `int(currentNote) / 12.0` je `float`, ale `mod` očekává `float, float`, což je OK
   - Možná je problém jinde

5. **D.3 VHS Glitch.fs** - `missing_token`:
   - Na řádku 608-612: `bleed += vec4(0.5, 0.5, 0.5, 0.5).r;` opakováno 4x - to vypadá divně, možná chybí nějaký výraz

6. **WebGL context management**:
   - Stále se objevuje "Too many active WebGL contexts" (řádky 1127-1137)
   - Mnoho varování "WebGL kontext byl ztracen" (řádky 1139-1290)
   - Cleanup funguje (řádky 1291-1301), ale možná je příliš pomalý

---

## Fáze 1: Oprava detekce zakomentovaných proměnných

### 1.1 C.9 FFT Spiral.fs - `dis`, `vol_min`, `vol_max`, `blur`, `width`
**Problém:** Detekce blokových komentářů není správná - pokud je `/*` a `*/` na stejném řádku, nebo pokud je více blokových komentářů, logika selže

**Řešení:**
- Zlepšit detekci blokových komentářů - musí správně zpracovat:
  - `/* ... */` na stejném řádku
  - `/* ... */` přes více řádků
  - Více blokových komentářů
  - Kombinace `//` a `/* */` komentářů
- Pokud je proměnná zakomentovaná, ale používá se v nezakomentovaném kódu, přidat ji

**Soubory:**
- `src/utils/shaderLoader.js` - `addMissingCommonVariables`

### 1.2 F.3 Infernogram.fs - `GAIN`
**Problém:** `GAIN` se přidává jen pokud `PI` existuje nebo se přidává. Ale pokud `PI` neexistuje, `GAIN` se nepřidá

**Řešení:**
- Přidat logiku, která přidá `GAIN` i když `PI` neexistuje
- Přidat `GAIN` po `precision` nebo na začátek shaderu

**Soubory:**
- `src/utils/shaderLoader.js` - `addMissingCommonVariables`

---

## Fáze 2: Oprava scope problémů

### 2.1 S.1 Synthwave.fs - `iters`, `minDst`
**Problém:** Proměnné `iters` a `minDst` jsou deklarovány v `main()`, ale používají se v `getGridColor()` před deklarací

**Řešení:**
- Přidat `iters` a `minDst` jako globální proměnné (před `main()`)
- Nebo přidat je jako parametry funkce `getGridColor()`
- Lepší řešení: Přidat je jako globální proměnné, protože se používají v více funkcích

**Soubory:**
- `src/utils/shaderLoader.js` - `addMissingCommonVariables`

---

## Fáze 3: Oprava syntax chyb

### 3.1 M.1 Stripes.fs - `type_mismatch`
**Problém:** Možná je problém s `octaveValue = mod(int(currentNote) / 12.0, 1.0);`

**Řešení:**
- Zkontrolovat, zda není problém s type mismatch
- Možná přidat explicitní přetypování

**Soubory:**
- `src/utils/shaderLoader.js` - `sanitizeSyntaxErrors`

### 3.2 D.3 VHS Glitch.fs - `missing_token`
**Problém:** Na řádku 608-612: `bleed += vec4(0.5, 0.5, 0.5, 0.5).r;` opakováno 4x

**Řešení:**
- Zkontrolovat, zda není problém s chybějícím výrazem
- Možná přidat opravu pro tento pattern

**Soubory:**
- `src/utils/shaderLoader.js` - `sanitizeSyntaxErrors`

---

## Fáze 4: Zlepšení WebGL context management

### 4.1 "Too many active WebGL contexts"
**Problém:** Stále se objevuje varování (řádky 1127-1137)

**Řešení:**
- Zkontrolovat, zda se kontexty skutečně uvolňují
- Možná snížit limit `maxContexts` ještě více
- Možná přidat ještě agresivnější cleanup

**Soubory:**
- `src/utils/webgl/contextManager.js`

### 4.2 "WebGL kontext byl ztracen"
**Problém:** Mnoho varování o ztracených kontextech (řádky 1139-1290)

**Řešení:**
- Zlepšit detekci ztracených kontextů
- Zastavit render loop dříve, když je kontext ztracen
- Přidat lepší error handling

**Soubory:**
- `src/components/ShaderPreview.jsx`

---

## Priorita implementace

1. **VYSOKÁ:** Fáze 1 (Oprava detekce zakomentovaných proměnných) - kritické problémy
2. **VYSOKÁ:** Fáze 2 (Oprava scope problémů) - kritické problémy
3. **STŘEDNÍ:** Fáze 3 (Oprava syntax chyb) - některé stále neopravené
4. **NÍZKÁ:** Fáze 4 (Zlepšení WebGL context management) - optimalizace

---

## Poznámky

- Detekce zakomentovaných proměnných je kritický problém - musí správně zpracovat všechny případy
- Scope problémy jsou kritické - proměnné musí být dostupné tam, kde se používají
- WebGL context management je stále problém - možná je potřeba ještě agresivnější cleanup

