# Plán oprav shader preview - V8

## Analýza problémů z logu

### Hlavní problémy:

1. **"redefinition" chyby** - všechny shadery selhávají kvůli duplikaci `#version` nebo `precision`
   - C.9 FFT Spiral.fs: `redefinition` (15 chyb)
   - D.2 Glitch Shifter.fs: `redefinition` (7 chyb)
   - D.3 VHS Glitch.fs: `redefinition` (3 chyby)
   - **Problém:** `addISFHeader` přidává `#version 300 es` i když už je v kódu

2. **"Too many active WebGL contexts"** - 11x varování
   - Kontexty se vytvářejí rychleji, než se uvolňují
   - Limit 2 kontextů je stále překračován

3. **"WebGL kontext byl ztracen"** - kontexty se ztrácejí hned po vytvoření
   - Render loop se spouští, ale kontext je ztracen
   - Náhledy se na chvíli ukážou, ale pak zmizí

4. **Všechny shadery selhávají** - všechny používají fallback shader
   - Kvůli "redefinition" chybám se shadery nekompilují
   - Fallback shader se používá, ale renderování selhává kvůli ztraceným kontextům

---

## Fáze 1: Opravit "redefinition" chyby (KRITICKÁ PRIORITA)

### 1.1: Zkontrolovat, zda už není `#version` v kódu
- **Problém:** `addISFHeader` přidává `#version 300 es` i když už je v kódu
- **Řešení:** Před přidáním `#version` zkontrolovat, zda už není v kódu
- **Soubor:** `src/utils/shaderLoader.js` - `addISFHeader`

### 1.2: Zkontrolovat, zda už není `precision` v kódu
- **Problém:** `addISFHeader` přidává `precision mediump float;` i když už je v kódu
- **Řešení:** Před přidáním `precision` zkontrolovat, zda už není v kódu
- **Soubor:** `src/utils/shaderLoader.js` - `addISFHeader`

### 1.3: Odstranit existující `#version` a `precision` před přidáním nových
- **Problém:** Pokud už jsou v kódu, musíme je odstranit před přidáním nových
- **Řešení:** Odstranit existující `#version` a `precision` řádky před přidáním nových
- **Soubor:** `src/utils/shaderLoader.js` - `addISFHeader`

---

## Fáze 2: Vylepšit WebGL context management (VYSOKÁ PRIORITA)

### 2.1: Zkontrolovat, zda kontext není ztracen před renderováním
- **Problém:** Render loop se spouští, ale kontext je ztracen
- **Řešení:** Před spuštěním render loop zkontrolovat, zda kontext není ztracen
- **Soubor:** `src/components/ShaderPreview.jsx` - render loop

### 2.2: Zastavit render loop okamžitě po ztrátě kontextu
- **Problém:** Render loop pokračuje i po ztrátě kontextu
- **Řešení:** Zastavit render loop okamžitě po ztrátě kontextu
- **Soubor:** `src/components/ShaderPreview.jsx` - render loop

### 2.3: Zlepšit cleanup kontextů
- **Problém:** Kontexty se vytvářejí rychleji, než se uvolňují
- **Řešení:** Zrychlit cleanup a snížit limit kontextů ještě více
- **Soubor:** `src/utils/webgl/contextManager.js`

---

## Fáze 3: Opravit renderování fallback shaderů (STŘEDNÍ PRIORITA)

### 3.1: Zkontrolovat, zda fallback shader se správně renderuje
- **Problém:** Fallback shader se kompiluje, ale renderování selhává
- **Řešení:** Zkontrolovat, zda fallback shader se správně linkuje a renderuje
- **Soubor:** `src/components/ShaderPreview.jsx` - fallback shader handling

### 3.2: Přidat retry mechanismus pro ztracené kontexty
- **Problém:** Po ztrátě kontextu se shader nepokusí znovu načíst
- **Řešení:** Přidat retry mechanismus s exponenciálním backoff
- **Soubor:** `src/components/ShaderPreview.jsx` - context lost handling

---

## Implementační pořadí:

1. **Fáze 1** (KRITICKÁ): Opravit "redefinition" chyby
2. **Fáze 2** (VYSOKÁ): Vylepšit WebGL context management
3. **Fáze 3** (STŘEDNÍ): Opravit renderování fallback shaderů

---

## Očekávané výsledky:

- ✅ Všechny shadery se zkompilují bez "redefinition" chyb
- ✅ Snížení varování "Too many active WebGL contexts" na minimum
- ✅ Eliminace varování "WebGL kontext byl ztracen"
- ✅ Stabilní renderování všech shaderů (včetně fallback shaderů)
- ✅ Náhledy shaderů se zobrazí a zůstanou viditelné

