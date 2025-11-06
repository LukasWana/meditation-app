# Kompletní plán ošetření kompilačních chyb shaderů

## 1. PREVENCE CHYB (Pre-compilation)

### 1.1 Validace shader kódu před kompilací
**Cíl:** Odhalit problémy před pokusem o kompilaci

**Implementace:**
- ✅ Základní validace (prázdný kód, základní syntax)
- ⚠️ Rozšířená validace:
  - Kontrola neplatných formátů čísel (6.04.0, 192.00.0)
  - Kontrola rezervovaných slov (sample, attribute v GLSL ES 3.00)
  - Kontrola syntaxe (závorky, středníky)
  - Kontrola typů (dimension mismatch)
  - Kontrola redeklarace vestavěných funkcí
  - **NOVÉ:** Kontrola chybějících operátorů (vec4(0.0)vec4(0.5) → vec4(0.0) + vec4(0.5))
  - **NOVÉ:** Kontrola nedefinovaných proměnných (sample, iters, minDst, flickerSpeed, flickerFreq)
  - **NOVÉ:** Kontrola nevyvážených závorek
  - **NOVÉ:** Kontrola chybějících středníků

**Soubory:**
- `src/utils/shaderLoader.js` - `validateShaderCode()`
- `src/utils/shaderValidator.js` - nový modul pro rozšířenou validaci

### 1.2 Sanitizace shader kódu
**Cíl:** Automaticky opravit běžné chyby před kompilací

**Implementace:**
- ✅ Základní sanitizace (neplatné formáty čísel)
- ⚠️ Rozšířená sanitizace:
  - Oprava neplatných formátů čísel (6.04.0 → 6.04)
  - Oprava dvojitých teček (6..04 → 6.04)
  - Oprava teček na konci (10.0. → 10.0)
  - Oprava dimension mismatch (vec4 → float pomocí swizzle)
  - Přejmenování rezervovaných slov (sample → sampleTex)
  - Oprava syntax chyb (chybějící středníky, závorky)
  - **NOVÉ:** Oprava chybějících operátorů (vec4(0.0)vec4(0.5) → vec4(0.0) + vec4(0.5))
  - **NOVÉ:** Oprava nevyvážených závorek (vec4(0.5) / FREQ_RANGE, 0.25),1.0)) → vec4(0.5) / vec4(FREQ_RANGE, 0.25, 1.0, 1.0))
  - **NOVÉ:** Oprava nedefinovaných proměnných (sample → sampleTex, přidání deklarací)

**Soubory:**
- `src/utils/shaderLoader.js` - `sanitizeNumberFormats()`
- `src/utils/shaderSanitizer.js` - nový modul pro komplexní sanitizaci

### 1.3 Error Recovery Mechanismus
**Cíl:** Automaticky opravit chyby, které lze opravit

**Implementace:**
- Detekce typu chyby (invalid number, dimension mismatch, syntax error)
- Aplikace specifických oprav podle typu chyby
- Opakovaná kompilace po opravě
- Limit na počet pokusů (max 3 pokusy)
- **NOVÉ:** Oprava chybějících operátorů mezi výrazy
- **NOVÉ:** Oprava nedefinovaných proměnných (automatické přidání deklarací)
- **NOVÉ:** Oprava nevyvážených závorek

**Soubory:**
- `src/utils/shaderErrorRecovery.js` - ✅ vytvořen

---

## 2. KOMPILACE A DETEKCE CHYB (Compilation)

### 2.1 Robustní kompilace shaderů
**Cíl:** Bezpečně kompilovat shadery s detekcí všech chyb

**Implementace:**
- ✅ Základní kompilace s error handling
- ✅ Sanitizace před kompilací
- ✅ Detekce typu chyby (compilation vs linking)
- ✅ Extrakce čísla řádku z chybové hlášky
- ⚠️ Rozšíření:
  - Detekce více chyb najednou
  - Rozlišení warnings vs errors
  - **NOVÉ:** Kontrola, zda je shader zkompilován před linkováním
  - **NOVÉ:** Prevence linkování nezkompilovaných shaderů
  - **NOVÉ:** Správné cleanup WebGL kontextů (prevence "Too many active WebGL contexts")

**Soubory:**
- `src/components/ShaderPreview.jsx` - `createShader()`
- `src/utils/webgl/programManager.js` - `compileShader()`

### 2.2 Centralizovaný Error Handler
**Cíl:** Jednotné zpracování všech shader chyb

**Implementace:**
- ✅ Třídění chyb podle typu (syntax, typ, runtime)
- ✅ Parsování chybových hlášek WebGL
- ✅ Extrakce užitečných informací (řádek, typ chyby, kontext)
- ✅ Překlad chyb do češtiny
- ✅ Kategorizace chyb podle závažnosti
- **NOVÉ:** Detekce konkrétních problémů z logu:
  - Chybějící operátory (vec4(0.0)vec4(0.5))
  - Nedefinované proměnné (sample, iters, minDst, flickerSpeed, flickerFreq)
  - Nevyvážené závorky
  - Chybějící středníky

**Soubory:**
- `src/utils/shaderErrorHandler.js` - ✅ vytvořen

---

## 3. ZPRACOVÁNÍ CHYB (Error Processing)

### 3.1 Parsování chybových hlášek
**Cíl:** Extrahovat užitečné informace z WebGL chybových hlášek

**Implementace:**
- Parsování formátu: `ERROR: 0:11: '6.04.0' : invalid number`
- Extrakce:
  - Číslo řádku (0:11)
  - Typ chyby (invalid number, syntax error, dimension mismatch)
  - Kontext (problematic line)
  - Více chyb v jedné hlášce

**Soubory:**
- `src/utils/shaderErrorParser.js` - nový modul

### 3.2 Kategorizace chyb
**Cíl:** Rozdělit chyby podle typu a závažnosti

**Kategorie:**
1. **Kritické chyby** (nelze opravit automaticky):
   - Syntax errors (chybějící závorky, středníky)
   - Type errors (dimension mismatch, nesprávné typy)
   - Redeclaration errors (přejmenování vestavěných funkcí)

2. **Opravitelné chyby** (lze opravit automaticky):
   - Invalid number formats (6.04.0 → 6.04)
   - Missing semicolons
   - Version mismatches

3. **Warnings** (nebrání kompilaci):
   - Unused variables
   - Precision warnings

**Soubory:**
- `src/utils/shaderErrorCategorizer.js` - nový modul

### 3.3 Error Recovery Strategies
**Cíl:** Automaticky opravit opravitelné chyby

**Strategie:**
1. **Invalid Number Format:**
   - Detekce: `invalid number` + číslo s více tečkami
   - Oprava: Aplikace sanitizace čísel
   - Retry: Ano

2. **Dimension Mismatch:**
   - Detekce: `dimension mismatch` + typy
   - Oprava: Přidání swizzle operátorů (.r, .rgb, .xy)
   - Retry: Ano

3. **Syntax Error:**
   - Detekce: `syntax error` + kontext
   - Oprava: Přidání chybějících znaků (středníky, závorky)
   - Retry: Ano (s opatrností)

4. **Reserved Word:**
   - Detekce: `Illegal use of reserved word`
   - Oprava: Přejmenování proměnné
   - Retry: Ano

5. **NOVÉ: Missing Operator:**
   - Detekce: `vec4(0.0)vec4(0.5)` nebo podobné vzory
   - Oprava: Přidání operátoru `+` nebo `*` mezi výrazy
   - Retry: Ano

6. **NOVÉ: Undeclared Variable:**
   - Detekce: `undeclared identifier` + název proměnné
   - Oprava: Automatické přidání deklarace proměnné (detekce typu podle použití)
   - Retry: Ano

7. **NOVÉ: Unbalanced Parentheses:**
   - Detekce: Nevyvážené závorky v syntax chybě
   - Oprava: Přidání chybějících závorek nebo oprava syntaxe
   - Retry: Ano (s opatrností)

**Soubory:**
- `src/utils/shaderErrorRecovery.js` - ✅ vytvořen

---

## 4. ZOBRAZENÍ CHYB (Error Display)

### 4.1 Uživatelsky přívětivé zobrazení chyb
**Cíl:** Zobrazit chyby srozumitelně pro uživatele

**Implementace:**
- ✅ Základní zobrazení chyby
- ⚠️ Rozšíření:
  - Ikona chyby
  - Krátký popis chyby
  - Možnost zobrazit detail
  - Zobrazení problematického řádku
  - Návod na opravu (pokud je znám)

**Soubory:**
- `src/components/ShaderPreview.jsx` - error display
- `src/components/ShaderErrorDisplay.jsx` - nová komponenta

### 4.2 Detailní zobrazení chyb
**Cíl:** Zobrazit technické detaily pro pokročilé uživatele

**Implementace:**
- Expandovatelný detail chyby
- Zobrazení problematického řádku s číslem
- Zobrazení kontextu (řádky před a po)
- Syntax highlighting
- Kopírování chybové hlášky

**Soubory:**
- `src/components/ShaderErrorDetail.jsx` - nová komponenta

### 4.3 Error Reporting
**Cíl:** Umožnit uživatelům nahlásit chyby

**Implementace:**
- Tlačítko "Nahlásit chybu"
- Automatické shromáždění informací:
  - Shader kód
  - Chybová hláška
  - WebGL verze
  - Browser info
- Odeslání na backend nebo email

**Soubory:**
- `src/components/ShaderErrorReport.jsx` - nová komponenta

---

## 5. FALLBACK MECHANISMY (Fallbacks)

### 5.1 Fallback Shadery
**Cíl:** Zobrazit něco místo prázdného místa při chybě

**Implementace:**
- ✅ Výchozí shader (jednoduchý gradient)
- ✅ Shader podle WebGL verze (WebGL 1.0 a 2.0)
- ✅ Automatické použití při selhání kompilace
- ⚠️ Shader podle kategorie (pokud je známa)
- ⚠️ Možnost uživatele vybrat fallback shader

**Soubory:**
- `src/utils/fallbackShaders.js` - ✅ vytvořen

### 5.2 Graceful Degradation
**Cíl:** Postupně snižovat kvalitu, pokud shader nefunguje

**Strategie:**
1. Pokus o kompilaci s opravami
2. Pokud selže, použít fallback shader
3. Pokud selže i fallback, zobrazit statický obrázek
4. Pokud selže i to, zobrazit placeholder

**Soubory:**
- `src/utils/shaderFallbackManager.js` - nový modul

---

## 6. LOGGING A DEBUGGING (Debugging)

### 6.1 Detailní Logging
**Cíl:** Umožnit debugging shader chyb

**Implementace:**
- ✅ Základní logging (chybové hlášky)
- ⚠️ Rozšíření:
  - Log shader source před kompilací
  - Log sanitizovaného kódu
  - Log problematického řádku
  - Log kontextu (řádky před a po)
  - Log WebGL verze a capabilities
  - Log času kompilace

**Soubory:**
- `src/utils/shaderLogger.js` - nový modul

### 6.2 Debug Mode
**Cíl:** Zobrazit debug informace v development módu

**Implementace:**
- Debug panel s informacemi o shaderu
- Zobrazení shader source
- Zobrazení uniform values
- Zobrazení WebGL state
- Performance metrics

**Soubory:**
- `src/components/ShaderDebugPanel.jsx` - nová komponenta

### 6.3 Error Analytics
**Cíl:** Sledovat četnost a typy chyb

**Implementace:**
- Tracking chyb podle typu
- Tracking chyb podle shaderu
- Tracking úspěšnosti oprav
- Statistiky pro analýzu

**Soubory:**
- `src/utils/shaderErrorAnalytics.js` - nový modul

---

## 7. CACHE A OPTIMALIZACE (Optimization)

### 7.1 Cache úspěšně zkompilovaných shaderů
**Cíl:** Urychlit zobrazení shaderů

**Implementace:**
- Cache shader programů podle hash kódu
- Cache sanitizovaného kódu
- Cache validace výsledků
- Invalidation cache při změně kódu

**Soubory:**
- `src/utils/shaderCache.js` - nový modul

### 7.2 Pre-compilation
**Cíl:** Předkompilovat shadery před zobrazením

**Implementace:**
- Background compilation při načtení shaderu
- Pre-compilation populárních shaderů
- Lazy loading shaderů

**Soubory:**
- `src/utils/shaderPrecompiler.js` - nový modul

---

## 8. IMPLEMENTAČNÍ PRIORITY

### Fáze 1: Kritické (Okamžité)
1. ✅ Sanitizace neplatných formátů čísel
2. ✅ Oprava version mismatch
3. ✅ Základní error handling
4. ✅ Error recovery mechanismus
5. ✅ Centralizovaný error handler
6. ✅ **NOVÉ:** Oprava chybějících operátorů (vec4(0.0)vec4(0.5))
7. ✅ **NOVÉ:** Oprava nedefinovaných proměnných (sample, iters, minDst, atd.)
8. ✅ **NOVÉ:** Oprava nevyvážených závorek
9. ✅ **NOVÉ:** Prevence linkování nezkompilovaných shaderů
10. ⚠️ **NOVÉ:** Správné cleanup WebGL kontextů
11. ✅ **NOVÉ:** Oprava redeklarace vestavěných funkcí (min, max, tanh)
12. ✅ **NOVÉ:** Fallback shadery pro případ selhání

### Fáze 2: Důležité (Krátkodobé)
1. ✅ Centralizovaný error handler
2. ✅ Rozšířená validace (chybějící operátory, nedefinované proměnné)
3. ✅ Uživatelsky přívětivé zobrazení chyb
4. ✅ Detailní logging
5. ✅ Fallback shadery
6. ✅ **NOVÉ:** Automatické přidání deklarací nedefinovaných proměnných
7. ✅ **NOVÉ:** Oprava syntax chyb (chybějící středníky, závorky)
8. ✅ **NOVÉ:** Oprava redeklarace vestavěných funkcí

### Fáze 3: Vylepšení (Střednědobé)
1. Error recovery strategies
2. Detailní zobrazení chyb
3. Debug mode
4. Error reporting
5. Cache shaderů

### Fáze 4: Optimalizace (Dlouhodobé)
1. Pre-compilation
2. Error analytics
3. Graceful degradation
4. Performance optimalizace

---

## 9. STRUKTURA SOUBORŮ

```
src/
├── utils/
│   ├── shaderLoader.js (✅ existuje)
│   ├── shaderValidator.js (⚠️ nový)
│   ├── shaderSanitizer.js (⚠️ nový)
│   ├── shaderErrorHandler.js (⚠️ nový)
│   ├── shaderErrorParser.js (⚠️ nový)
│   ├── shaderErrorCategorizer.js (⚠️ nový)
│   ├── shaderErrorRecovery.js (✅ vytvořen)
│   ├── shaderLogger.js (⚠️ nový)
│   ├── shaderErrorAnalytics.js (⚠️ nový)
│   ├── fallbackShaders.js (✅ vytvořen)
│   ├── shaderFallbackManager.js (⚠️ nový)
│   ├── shaderCache.js (⚠️ nový)
│   └── shaderPrecompiler.js (⚠️ nový)
├── components/
│   ├── ShaderPreview.jsx (✅ existuje)
│   ├── ShaderErrorDisplay.jsx (⚠️ nový)
│   ├── ShaderErrorDetail.jsx (⚠️ nový)
│   ├── ShaderErrorReport.jsx (⚠️ nový)
│   ├── ShaderDebugPanel.jsx (⚠️ nový)
│   └── ShaderFallback.jsx (⚠️ nový)
└── PLAN_SHADER_ERROR_HANDLING.md (✅ tento soubor)
```

---

## 10. PŘÍKLADY IMPLEMENTACE

### 10.1 Centralizovaný Error Handler

```javascript
// src/utils/shaderErrorHandler.js
export class ShaderErrorHandler {
  static handle(errorLog, shaderSource, shaderType) {
    const parsed = ShaderErrorParser.parse(errorLog);
    const categorized = ShaderErrorCategorizer.categorize(parsed);
    const recovery = ShaderErrorRecovery.attempt(categorized, shaderSource);

    return {
      original: parsed,
      categorized,
      recovery,
      userFriendly: this.translateToCzech(categorized),
      canRecover: recovery.canRecover
    };
  }

  static translateToCzech(categorized) {
    // Překlad chyb do češtiny
  }
}
```

### 10.2 Error Recovery

```javascript
// src/utils/shaderErrorRecovery.js
export class ShaderErrorRecovery {
  static attempt(categorizedErrors, shaderSource) {
    let fixedCode = shaderSource;
    let canRecover = true;

    for (const error of categorizedErrors) {
      switch (error.type) {
        case 'invalid_number':
          fixedCode = ShaderSanitizer.fixNumberFormats(fixedCode);
          break;
        case 'dimension_mismatch':
          fixedCode = ShaderSanitizer.fixDimensionMismatch(fixedCode);
          break;
        case 'syntax_error':
          fixedCode = ShaderSanitizer.fixSyntax(fixedCode, error);
          break;
        default:
          canRecover = false;
      }
    }

    return { fixedCode, canRecover };
  }
}
```

### 10.3 Fallback Shader

```javascript
// src/utils/fallbackShaders.js
export const fallbackShaders = {
  default: `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;
    varying vec2 v_uv;

    void main() {
      vec2 uv = v_uv;
      vec3 color = vec3(0.5 + 0.5 * sin(u_time), 0.5, 0.5);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  // Další fallback shadery...
};
```

---

## 11. KONKRÉTNÍ PROBLÉMY Z LOGU A JEJICH ŘEŠENÍ

### 11.1 Identifikované problémy z logu

#### Problém 1: Chybějící operátory
**Příklad z logu:**
```glsl
vec4 color = vec4(0.0)vec4(0.5));  // Řádek 1037
fragColor = vec4(0.0)vec4(0.5));   // Řádek 1591
```

**Řešení:**
- Detekce vzoru: `)vec4(` nebo `)vec3(` atd.
- Oprava: Přidání operátoru `+` nebo `*` mezi výrazy
- Implementace: V `shaderErrorRecovery.js` - `fixCommonSyntaxErrors()`

#### Problém 2: Nevyvážené závorky
**Příklad z logu:**
```glsl
return vec4(0.5) / FREQ_RANGE, 0.25),1.0)).x + 0.06;  // Řádek 251
```

**Řešení:**
- Detekce nevyvážených závorek
- Oprava: Přidání chybějících závorek nebo oprava syntaxe
- Implementace: V `shaderErrorRecovery.js` - `fixCommonSyntaxErrors()`

#### Problém 3: Nedefinované proměnné
**Příklad z logu:**
```glsl
'iters' : undeclared identifier      // Řádek 78
'minDst' : undeclared identifier     // Řádek 86, 99
'flickerSpeed' : undeclared identifier // Řádek 148
'flickerFreq' : undeclared identifier // Řádek 148, 150
'sample' : Illegal use of reserved word // Řádek 2049
```

**Řešení:**
- Detekce nedefinovaných proměnných
- Automatické přidání deklarací (detekce typu podle použití)
- Přejmenování rezervovaných slov (sample → sampleTex)
- Implementace: V `shaderErrorRecovery.js` - `fixUndeclaredVariable()`

#### Problém 4: Fragment shader not compiled
**Příklad z logu:**
```
Program linking error: Fragment shader is not compiled.
```

**Řešení:**
- Kontrola, zda je shader zkompilován před linkováním
- Prevence linkování nezkompilovaných shaderů
- Implementace: V `ShaderPreview.jsx` - kontrola před `linkProgram()`

#### Problém 5: Too many active WebGL contexts
**Příklad z logu:**
```
WARNING: Too many active WebGL contexts. Oldest context will be lost.
```

**Řešení:**
- Správné cleanup WebGL kontextů při unmount
- Limit na počet současných kontextů
- Sdílení kontextů mezi shadery
- Implementace: V `ShaderPreview.jsx` - cleanup v `useEffect` return

### 11.2 Testovací případy z logu

1. **Test chybějících operátorů:**
   - Input: `vec4(0.0)vec4(0.5))`
   - Expected: `vec4(0.0) + vec4(0.5))`

2. **Test nevyvážených závorek:**
   - Input: `vec4(0.5) / FREQ_RANGE, 0.25),1.0))`
   - Expected: `vec4(0.5) / vec4(FREQ_RANGE, 0.25, 1.0, 1.0))`

3. **Test nedefinovaných proměnných:**
   - Input: `glow += sample * weight;` (sample není definováno)
   - Expected: `glow += sampleTex * weight;` (nebo přidání deklarace)

4. **Test neplatných formátů čísel:**
   - Input: `6.04.0`, `192.00.0`, `1000.00.0`
   - Expected: `6.04`, `192.0`, `1000.0`

## 12. TESTING

### 12.1 Unit Testy
- Test sanitizace různých formátů čísel
- Test error parseru
- Test error recovery
- Test fallback mechanismů
- **NOVÉ:** Test opravy chybějících operátorů
- **NOVÉ:** Test opravy nedefinovaných proměnných
- **NOVÉ:** Test opravy nevyvážených závorek

### 12.2 Integration Testy
- Test kompilace různých shaderů
- Test error handling flow
- Test cache mechanismu
- **NOVÉ:** Test cleanup WebGL kontextů
- **NOVÉ:** Test prevence linkování nezkompilovaných shaderů

### 12.3 E2E Testy
- Test zobrazení chyb v UI
- Test fallback zobrazení
- Test error reporting
- **NOVÉ:** Test konkrétních shaderů z logu

---

## 13. DOKUMENTACE

### 13.1 API Dokumentace
- Dokumentace všech funkcí
- Příklady použití
- Typy chyb a jejich řešení
- **NOVÉ:** Příklady konkrétních chyb z logu a jejich řešení

### 13.2 Uživatelská Dokumentace
- Jak číst chybové hlášky
- Jak nahlásit chybu
- Jak používat debug mode
- **NOVÉ:** Časté chyby a jejich řešení

---

## 14. METRIKY ÚSPĚCHU

- **Úspěšnost kompilace:** % shaderů, které se úspěšně zkompilují
- **Úspěšnost oprav:** % chyb, které se podařilo automaticky opravit
- **Doba kompilace:** Průměrná doba kompilace shaderu
- **Počet chyb:** Počet chyb podle typu
- **Uživatelská spokojenost:** Feedback od uživatelů
- **NOVÉ:** Počet WebGL context leaks
- **NOVÉ:** Počet nezkompilovaných shaderů před linkováním
- **NOVÉ:** Úspěšnost opravy konkrétních problémů (chybějící operátory, nedefinované proměnné)

---

## 15. ROLLOUT PLAN

1. **Týden 1:** Implementace Fáze 1 (kritické)
   - ✅ Sanitizace neplatných formátů čísel
   - ✅ Oprava version mismatch
   - ✅ Základní error handling
   - ✅ Error recovery mechanismus
   - ✅ Centralizovaný error handler
   - ✅ Oprava chybějících operátorů
   - ✅ Oprava nedefinovaných proměnných
   - ✅ Oprava nevyvážených závorek
   - ✅ Prevence linkování nezkompilovaných shaderů
   - ⚠️ Správné cleanup WebGL kontextů
   - ✅ Oprava redeklarace vestavěných funkcí
   - ✅ Fallback shadery

2. **Týden 2:** Implementace Fáze 2 (důležité)
   - Rozšířená validace
   - Uživatelsky přívětivé zobrazení chyb
   - Fallback shadery
   - Automatické přidání deklarací nedefinovaných proměnných

3. **Týden 3:** Testování a opravy
   - Testování konkrétních shaderů z logu
   - Oprava identifikovaných problémů
   - Testování error recovery

4. **Týden 4:** Implementace Fáze 3 (vylepšení)
   - Detailní zobrazení chyb
   - Debug mode
   - Error reporting

5. **Týden 5:** Optimalizace a finální testování
   - Cache shaderů
   - Pre-compilation
   - Performance optimalizace

---

## 15. ZÁVĚR

Tento plán poskytuje komplexní přístup k ošetření kompilačních chyb shaderů, od prevence přes detekci až po zobrazení a recovery. Implementace by měla probíhat postupně podle priorit, s důrazem na kritické funkce v první fázi.

