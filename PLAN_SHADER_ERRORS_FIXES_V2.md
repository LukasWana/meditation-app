# Plán oprav shader chyb - Verze 2

## Analýza nového logu (localhost-1762423524457.log)

### Identifikované chyby:

#### 1. **Undeclared Variables** (C.9 FFT Spiral.fs)
- `dis` - používá se na řádku 294, 295, 321, ale není deklarováno
- `vol_min` - používá se na řádku 301, ale je zakomentováno
- `vol_max` - používá se na řádku 301, ale je zakomentováno
- `blur` - používá se na řádku 322, ale je zakomentováno
- `width` - používá se na řádku 322, ale je zakomentováno
- `PI` - používá se na řádku 294, ale není definováno

**Řešení:**
- Přidat deklarace chybějících proměnných na začátek `main()`
- Přidat `const float PI = 3.14159265359;` na začátek shaderu

#### 2. **Invalid Constant Declaration** (D.2 Glitch Shifter.fs)
- `const float offset = 0,0;` - čárka místo tečky
- **Řešení:** Opravit na `const float offset = 0.0;` nebo `const vec2 offset = vec2(0.0, 0.0);`

#### 3. **Missing Assignment** (D.3 VHS Glitch.fs)
- `vec4(0.5, 0.5, 0.5, 0.5).r;` - výraz bez přiřazení na řádku 608
- **Řešení:** Odstranit tento řádek nebo přidat přiřazení

#### 4. **Redeclaration of Built-in Function** (F.3 Infernogram.fs)
- `int min(int a, int b)` - konflikt s built-in `min` funkcí
- **Řešení:** Přejmenovat na `myMin` a aktualizovat všechny volání

#### 5. **Malformed vec4 Constructor** (M.1 Stripes.fs)
- `vec4(0.5 + 0.5, float(channel) + .5))` - chybí závorka
- **Řešení:** Opravit na `vec4(0.5 + 0.5, float(channel) + 0.5, 0.5, 0.5)`

#### 6. **Malformed vec2 Constructor** (M.2 Circles.fs)
- `vec4(float(v + 1 + 0.5, .5);` - chybí závorka a špatný typ
- **Řešení:** Opravit na `vec2(float(v + 1) + 0.5, 0.5)`

#### 7. **Malformed vec4 Constructor** (M.3 Raw MIDI.fs)
- `vec4(0.5))` - chybí závorka
- **Řešení:** Opravit na `vec4(0.5, 0.5, 0.5, 0.5)`

#### 8. **Reserved Word Usage** (X.1 XY.fs, X.3 XYD.fs, X.5 XYE.fs)
- `vec3 sampleTex = vec3(vec4(0.5).r);` - deklarováno jako `sampleTex`
- `glow += sample * weight;` - používá se jako `sample` (řádek 1270, 1413, 1559)
- **Řešení:** Opravit na `glow += sampleTex * weight;`

#### 9. **Type Mismatch in Loop** (X.6 Curve Ink Scope.fs)
- `int samples = 32.0;` - float místo int
- `for(int i = 1.0; i < samples - 1; i++)` - float literály v int loop
- **Řešení:** Opravit na `int samples = 32;` a `for(int i = 1; i < samples - 1; i++)`

#### 10. **Too Many WebGL Contexts**
- Opakované varování: "Too many active WebGL contexts"
- **Řešení:** Zlepšit cleanup WebGL kontextů v `contextManager.js`

---

## Implementační plán

### Fáze 1: Oprava undeclared variables

#### 1.1 Rozšíření `fixUndeclaredVariable` v `shaderErrorRecovery.js`
- Přidat podporu pro `PI` konstantu
- Přidat podporu pro zakomentované proměnné (`dis`, `vol_min`, `vol_max`, `blur`, `width`)
- Automaticky přidat deklarace na začátek `main()`

**Implementace:**
```javascript
// Přidat do fixUndeclaredVariable:
if (error.token === 'PI') {
  // Přidat na začátek shaderu (po precision)
  const precisionIndex = code.indexOf('precision');
  if (precisionIndex !== -1) {
    const afterPrecision = code.indexOf('\n', precisionIndex);
    code = code.slice(0, afterPrecision + 1) +
           'const float PI = 3.14159265359;\n' +
           code.slice(afterPrecision + 1);
  }
  return code;
}

// Pro zakomentované proměnné - přidat deklarace
const commonVars = {
  'dis': 'float dis = 0.05;',
  'vol_min': 'float vol_min = 0.0;',
  'vol_max': 'float vol_max = 1.0;',
  'blur': 'float blur = 0.02;',
  'width': 'float width = 0.02;'
};
```

#### 1.2 Přidání pre-compilation sanitizace v `shaderLoader.js`
- Přidat funkci `addMissingCommonVariables` pro automatické přidání běžných proměnných

### Fáze 2: Oprava syntax chyb

#### 2.1 Rozšíření `sanitizeSyntaxErrors` v `shaderLoader.js`
- Přidat opravu pro `const float offset = 0,0;` → `const float offset = 0.0;`
- Přidat opravu pro `vec4(0.5))` → `vec4(0.5, 0.5, 0.5, 0.5)`
- Přidat opravu pro `vec4(0.5 + 0.5, float(channel) + .5))` → `vec4(0.5 + 0.5, float(channel) + 0.5, 0.5, 0.5)`
- Přidat opravu pro `vec4(float(v + 1 + 0.5, .5);` → `vec2(float(v + 1) + 0.5, 0.5)`

**Implementace:**
```javascript
// Oprava 7: const float offset = 0,0; -> const float offset = 0.0;
fixedCode = fixedCode.replace(/const\s+float\s+(\w+)\s*=\s*(\d+),(\d+);/g,
  (match, name, first, second) => {
    return `const float ${name} = ${first}.${second};`;
  }
);

// Oprava 8: vec4(0.5)) -> vec4(0.5, 0.5, 0.5, 0.5)
fixedCode = fixedCode.replace(/vec4\s*\(([^)]+)\)\)(?!\s*[\.\w\+\-\*\/])/g,
  (match, first) => {
    if (first.match(/^-?\d+\.?\d*$/)) {
      return `vec4(${first}, ${first}, ${first}, ${first})`;
    }
    return match;
  }
);

// Oprava 9: vec4(0.5 + 0.5, float(channel) + .5)) -> vec4(0.5 + 0.5, float(channel) + 0.5, 0.5, 0.5)
fixedCode = fixedCode.replace(/vec4\s*\(([^,]+),\s*([^)]+)\s*\+\s*\.(\d+)\)\)/g,
  (match, first, second, third) => {
    return `vec4(${first}, ${second} + 0.${third}, 0.5, 0.5)`;
  }
);

// Oprava 10: vec4(float(v + 1 + 0.5, .5); -> vec2(float(v + 1) + 0.5, 0.5)
fixedCode = fixedCode.replace(/vec4\s*\(float\s*\(([^)]+)\s*\+\s*(\d+)\s*\+\s*([^,]+),\s*\.(\d+)\);/g,
  (match, expr, num1, num2, num3) => {
    return `vec2(float(${expr} + ${num1}) + ${num2}, 0.${num3});`;
  }
);
```

#### 2.2 Přidání opravy pro missing assignment
- Detekovat výrazy bez přiřazení typu `vec4(...).r;`
- Odstranit nebo přidat komentář

**Implementace:**
```javascript
// Oprava 11: Odstranit výrazy bez přiřazení
fixedCode = fixedCode.replace(/^\s*vec\d+\s*\([^)]+\)\s*\.([rgba]|x|y|z|w|rgb|rgba|xy|xyz|xyzw)\s*;\s*$/gm,
  (match) => {
    // Odstranit tento řádek (je to pravděpodobně debug kód)
    return '';
  }
);
```

### Fáze 3: Oprava redeclaration

#### 3.1 Rozšíření `fixRedeclaration` v `shaderErrorRecovery.js`
- Přidat podporu pro `int min(int a, int b)` → `int myMin(int a, int b)`
- Aktualizovat všechna volání `min(...)` na `myMin(...)` v rámci shaderu

**Implementace:**
```javascript
// V fixRedeclaration:
if (error.token === 'min' && code.includes('int min(')) {
  // Přejmenuj funkci
  code = code.replace(/int\s+min\s*\(/g, 'int myMin(');
  // Přejmenuj volání (ale pouze v rámci shaderu, ne built-in)
  // Musíme být opatrní - přejmenovat pouze volání naší funkce
  const functionDef = code.match(/int\s+myMin\s*\([^)]+\)\s*\{[^}]*\}/);
  if (functionDef) {
    // Najdi všechna volání myMin v kontextu, kde je použita jako int funkce
    code = code.replace(/\bmin\s*\(/g, (match, offset) => {
      // Zkontroluj, zda je to volání naší funkce (ne built-in)
      const before = code.substring(Math.max(0, offset - 50), offset);
      if (before.match(/int\s+myMin|myMin\s*\(/)) {
        return 'myMin(';
      }
      return match;
    });
  }
}
```

### Fáze 4: Oprava reserved word usage

#### 4.1 Rozšíření `sanitizeSyntaxErrors` v `shaderLoader.js`
- Detekovat `sample` proměnnou, která je deklarována jako `sampleTex`, ale používá se jako `sample`
- Opravit na `sampleTex`

**Implementace:**
```javascript
// Oprava 12: sample -> sampleTex (pokud je deklarováno jako sampleTex)
if (code.includes('vec3 sampleTex') || code.includes('vec2 sampleTex') || code.includes('vec4 sampleTex')) {
  // Přejmenuj všechny použití sample na sampleTex (ale pouze pokud není deklarováno jako sample)
  fixedCode = fixedCode.replace(/\bsample\s*\*/g, 'sampleTex *');
  fixedCode = fixedCode.replace(/\bsample\s*\+/g, 'sampleTex +');
  fixedCode = fixedCode.replace(/\bsample\s*\-/g, 'sampleTex -');
  fixedCode = fixedCode.replace(/\bsample\s*\//g, 'sampleTex /');
  fixedCode = fixedCode.replace(/\bsample\s*;/g, 'sampleTex;');
  fixedCode = fixedCode.replace(/\bsample\s*\)/g, 'sampleTex)');
}
```

### Fáze 5: Oprava type mismatch v loops

#### 5.1 Přidání opravy pro int/float mismatch v `sanitizeSyntaxErrors`
- Opravit `int samples = 32.0;` → `int samples = 32;`
- Opravit `for(int i = 1.0; i < samples - 1; i++)` → `for(int i = 1; i < samples - 1; i++)`

**Implementace:**
```javascript
// Oprava 13: int samples = 32.0; -> int samples = 32;
fixedCode = fixedCode.replace(/int\s+(\w+)\s*=\s*(\d+)\.0\s*;/g,
  (match, name, value) => {
    return `int ${name} = ${value};`;
  }
);

// Oprava 14: for(int i = 1.0; -> for(int i = 1;
fixedCode = fixedCode.replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\.0\s*;/g,
  (match, varName, value) => {
    return `for(int ${varName} = ${value};`;
  }
);
```

### Fáze 6: Zlepšení WebGL context management

#### 6.1 Vylepšení `contextManager.js`
- Přidat automatický cleanup neaktivních kontextů
- Přidat limit na počet současných kontextů
- Zlepšit tracking aktivních kontextů

**Implementace:**
```javascript
// V contextManager.js:
const MAX_CONTEXTS = 16; // Limit na počet kontextů
const CONTEXT_TIMEOUT = 30000; // 30 sekund nečinnosti

// Automatický cleanup
setInterval(() => {
  const now = Date.now();
  const inactiveContexts = activeContexts.filter(ctx =>
    now - ctx.lastUsed > CONTEXT_TIMEOUT
  );

  inactiveContexts.forEach(ctx => {
    // Uvolni kontext
    releaseWebGLContext(ctx.context);
  });
}, 5000); // Kontrola každých 5 sekund
```

---

## Pořadí implementace

1. ✅ **Fáze 1** - Oprava undeclared variables (PI, dis, vol_min, vol_max, blur, width)
2. ✅ **Fáze 2** - Oprava syntax chyb (invalid constant, malformed constructors, missing assignment)
3. ✅ **Fáze 3** - Oprava redeclaration (int min)
4. ✅ **Fáze 4** - Oprava reserved word usage (sample -> sampleTex)
5. ✅ **Fáze 5** - Oprava type mismatch v loops
6. ✅ **Fáze 6** - Zlepšení WebGL context management

---

## Testovací případy

### Test 1: Undeclared PI
- **Input:** `float angle = atan(uv.y, uv.x) - u_time * speed; float offset = length(uv) + (angle / (2.0 * PI)) * dis;`
- **Expected:** Automaticky přidáno `const float PI = 3.14159265359;` na začátek shaderu

### Test 2: Invalid constant
- **Input:** `const float offset = 0,0;`
- **Expected:** `const float offset = 0.0;`

### Test 3: Missing assignment
- **Input:** `vec4(0.5, 0.5, 0.5, 0.5).r;`
- **Expected:** Řádek odstraněn

### Test 4: Redeclaration
- **Input:** `int min(int a, int b) { return a < b ? a : b; } ... colors[min(idx + 1, 6)]`
- **Expected:** `int myMin(int a, int b) { return a < b ? a : b; } ... colors[myMin(idx + 1, 6)]`

### Test 5: Reserved word
- **Input:** `vec3 sampleTex = vec3(0.5); glow += sample * weight;`
- **Expected:** `vec3 sampleTex = vec3(0.5); glow += sampleTex * weight;`

### Test 6: Type mismatch
- **Input:** `int samples = 32.0; for(int i = 1.0; i < samples - 1; i++)`
- **Expected:** `int samples = 32; for(int i = 1; i < samples - 1; i++)`

---

## Očekávané výsledky

Po implementaci všech oprav by měly být všechny shadery z logu úspěšně zkompilovány:
- ✅ C.9 FFT Spiral.fs
- ✅ D.2 Glitch Shifter.fs
- ✅ D.3 VHS Glitch.fs
- ✅ F.3 Infernogram.fs
- ✅ M.1 Stripes.fs
- ✅ M.2 Circles.fs
- ✅ M.3 Raw MIDI.fs
- ✅ X.1 XY.fs
- ✅ X.3 XYD.fs
- ✅ X.5 XYE.fs
- ✅ X.6 Curve Ink Scope.fs

---

## Poznámky

- Všechny opravy by měly být aplikovány **před kompilací** v `sanitizeSyntaxErrors`
- Error recovery by měl být použit jako **fallback** pro chyby, které nebyly opraveny preventivně
- WebGL context management by měl být **proaktivní** - automaticky uvolňovat neaktivní kontexty

