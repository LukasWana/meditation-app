# Plán oprav shader chyb - V3

## Analýza logu `localhost-1762425370845.log`

### Hlavní problémy:

1. **Undeclared variables** - stále se objevují nedeklarované proměnné:
   - `C.9 FFT Spiral.fs`: `dis`, `vol_min`, `vol_max`, `blur`, `width` (řádky 298, 305, 325, 326)
   - `F.3 Infernogram.fs`: `GAIN` (řádek 756)
   - Další shadery: `iters`, `minDst`, `flickerSpeed`, `flickerFreq` (řádky 1001-1010)

2. **Syntax chyby** - stále neopravené:
   - `M.1 Stripes.fs`: `vec4(0.5 + 0.5, float(channel) + .5))` (řádek 861) - regex nefunguje
   - `M.3 Raw MIDI.fs`: možná type mismatch (řádek 964)

3. **WebGL context management** - kritické problémy:
   - "Too many active WebGL contexts" (řádky 1039-1048)
   - "WebGL kontext byl ztracen" (řádky 1051-1202) - mnoho varování

---

## Fáze 1: Oprava undeclared variables

### 1.1 C.9 FFT Spiral.fs - `dis`, `vol_min`, `vol_max`, `blur`, `width`
**Problém:** Proměnné jsou zakomentované, ale používají se v kódu (řádky 298, 305, 325, 326)

**Řešení:**
- Zlepšit `addMissingCommonVariables` - musí detekovat použití i když jsou zakomentované
- Přidat deklarace na začátek `main()`

**Soubory:**
- `src/utils/shaderLoader.js` - `addMissingCommonVariables`

### 1.2 F.3 Infernogram.fs - `GAIN`
**Problém:** Chybí `GAIN` konstanta (řádek 756)

**Řešení:**
- Přidat `GAIN` do seznamu běžných konstant
- Přidat deklaraci `const float GAIN = 1.0;` pokud chybí

**Soubory:**
- `src/utils/shaderLoader.js` - `addMissingCommonVariables`

### 1.3 Další shadery - `iters`, `minDst`, `flickerSpeed`, `flickerFreq`
**Problém:** Nedeklarované proměnné v dalších shaderech (řádky 1001-1010)

**Řešení:**
- Rozšířit seznam běžných proměnných v `addMissingCommonVariables`
- Přidat: `iters`, `minDst`, `flickerSpeed`, `flickerFreq` s výchozími hodnotami

**Soubory:**
- `src/utils/shaderLoader.js` - `addMissingCommonVariables`
- `src/utils/shaderErrorRecovery.js` - `fixUndeclaredVariable`

---

## Fáze 2: Oprava syntax chyb

### 2.1 M.1 Stripes.fs - `vec4(0.5 + 0.5, float(channel) + .5))`
**Problém:** Regex nefunguje správně (řádek 861)

**Původní kód:**
```glsl
vec4 midiData = vec4(0.5 + 0.5, float(channel) + .5));
```

**Očekávaný výsledek:**
```glsl
vec4 midiData = vec4(0.5 + 0.5, float(channel) + 0.5, 0.5, 0.5);
```

**Řešení:**
- Zlepšit regex v `sanitizeSyntaxErrors` - oprava 9
- Musí zachytit `vec4(..., float(...) + .5))` formát

**Soubory:**
- `src/utils/shaderLoader.js` - `sanitizeSyntaxErrors`

### 2.2 M.3 Raw MIDI.fs - type mismatch
**Problém:** Možná type mismatch (řádek 964)

**Kód:**
```glsl
vec3 rgb = vec4(0.5, 0.5, 0.5, 0.5) + vec4(0.5, 0.5, 0.5, 0.5).rgb;
```

**Řešení:**
- Zkontrolovat, zda není problém s přiřazením `vec4` k `vec3`
- Možná přidat `.rgb` swizzle

**Soubory:**
- `src/utils/shaderLoader.js` - `sanitizeSyntaxErrors`
- `src/utils/glslFixes.js` - `fixDimensionMismatch`

---

## Fáze 3: WebGL context management - kritické opravy

### 3.1 "Too many active WebGL contexts"
**Problém:** Stále se objevuje varování (řádky 1039-1048)

**Řešení:**
- Zkontrolovat `contextManager.js` - možná je cleanup příliš pomalý
- Snížit `maxAge` ještě více (např. na 10 sekund)
- Zkontrolovat, zda se kontexty skutečně uvolňují
- Přidat agresivnější cleanup při dosažení limitu

**Soubory:**
- `src/utils/webgl/contextManager.js`

### 3.2 "WebGL kontext byl ztracen"
**Problém:** Mnoho varování o ztracených kontextech (řádky 1051-1202)

**Řešení:**
- Zlepšit detekci ztracených kontextů
- Přidat automatické obnovení kontextu
- Zastavit render loop, když je kontext ztracen
- Přidat lepší error handling

**Soubory:**
- `src/components/ShaderPreview.jsx` - render loop
- `src/utils/webgl/contextManager.js`

### 3.3 Zlepšení cleanup logiky
**Problém:** Kontexty se možná neuvolňují správně

**Řešení:**
- Zkontrolovat cleanup funkce v `ShaderPreview.jsx`
- Zajistit, že se cleanup volá vždy
- Přidat logging pro debugging

**Soubory:**
- `src/components/ShaderPreview.jsx`

---

## Fáze 4: Zlepšení detekce a opravy chyb

### 4.1 Lepší detekce zakomentovaných proměnných
**Problém:** `addMissingCommonVariables` nedetekuje zakomentované proměnné správně

**Řešení:**
- Zlepšit logiku detekce - hledat použití i v zakomentovaných řádcích
- Pokud je proměnná použita v kódu (i když je zakomentovaná), přidat ji

**Soubory:**
- `src/utils/shaderLoader.js` - `addMissingCommonVariables`

### 4.2 Lepší regex pro syntax opravy
**Problém:** Některé regex nefungují správně

**Řešení:**
- Zkontrolovat a vylepšit všechny regex v `sanitizeSyntaxErrors`
- Přidat více testovacích případů
- Zajistit, že regex neporušují správný kód

**Soubory:**
- `src/utils/shaderLoader.js` - `sanitizeSyntaxErrors`

---

## Fáze 5: Testování a validace

### 5.1 Testování oprav
- Otestovat všechny opravené shadery
- Zkontrolovat, zda se chyby neobjevují
- Zkontrolovat, zda se náhledy zobrazují správně

### 5.2 Monitoring WebGL kontextů
- Přidat logging pro monitoring kontextů
- Zkontrolovat, zda se kontexty uvolňují správně
- Zkontrolovat, zda se varování o "Too many contexts" neobjevují

---

## Priorita implementace

1. **VYSOKÁ:** Fáze 3 (WebGL context management) - kritické problémy
2. **VYSOKÁ:** Fáze 1 (Undeclared variables) - stále se objevují chyby
3. **STŘEDNÍ:** Fáze 2 (Syntax chyby) - některé stále neopravené
4. **NÍZKÁ:** Fáze 4 (Zlepšení detekce) - optimalizace

---

## Poznámky

- WebGL context management je kritický problém - může způsobit ztrátu náhledů
- Undeclared variables jsou stále problém - musíme zlepšit detekci
- Syntax chyby jsou méně kritické, ale stále je potřeba je opravit

