# Plán oprav syntax chyb v shaderech

## Analýza problémů z logu

### Problém 1: Nevyvážené závorky s dělením
**Příklad:**
```glsl
return vec4(0.5) / FREQ_RANGE, 0.25),1.0)).x + 0.06;
```

**Správně by mělo být:**
```glsl
return vec4(0.5 / FREQ_RANGE, 0.25, 1.0, 1.0).x + 0.06;
```

**Vzory:**
- `vec4(0.5) / FREQ_RANGE, 0.25),1.0))` → `vec4(0.5 / FREQ_RANGE, 0.25, 1.0, 1.0)`
- `vec4(0.5) / FREQ_RANGE, 0.0), 1.0))` → `vec4(0.5 / FREQ_RANGE, 0.0, 1.0, 1.0)`

**Výskyt:** Řádky 268, 414, 540 (C.1 Eclipse, C.2 Flat Eclipse, C.3 Double Eclipse)

---

### Problém 2: Chybějící operátor mezi vec4 výrazy
**Příklad:**
```glsl
vec4 color = vec4(0.0)vec4(0.5));
```

**Správně by mělo být:**
```glsl
vec4 color = vec4(0.0) + vec4(0.5);
```
nebo
```glsl
vec4 color = vec4(0.0, 0.5, 0.0, 0.5);
```

**Vzory:**
- `vec4(0.0)vec4(0.5))` → `vec4(0.0) + vec4(0.5)`
- `vec4(0.5)vec4(0.5))` → `vec4(0.5) + vec4(0.5)`

**Výskyt:** Řádek 1264 (D.4 Edge Distort)

---

### Problém 3: Nevyvážené závorky s vec4 a swizzle
**Příklad:**
```glsl
float faktor = vec4(0.5),1.0)).r;
```

**Správně by mělo být:**
```glsl
float faktor = vec4(0.5, 1.0, 1.0, 1.0).r;
```

**Vzory:**
- `vec4(0.5),1.0))` → `vec4(0.5, 1.0, 1.0, 1.0)`
- `vec4(0.5)).r` → `vec4(0.5, 0.5, 0.5, 0.5).r`
- `vec4(0.5)).g` → `vec4(0.5, 0.5, 0.5, 0.5).g`
- `vec4(0.5)).x` → `vec4(0.5, 0.5, 0.5, 0.5).x`

**Výskyt:** Řádky 709, 832, 1141-1145, 1419 (C.4 Spirals, C.9 FFT Spiral, D.3 VHS Glitch, F.3 Infernogram)

---

### Problém 4: Chybějící operátor před swizzle
**Příklad:**
```glsl
bleed += vec4(0.5)).r;
```

**Správně by mělo být:**
```glsl
bleed += vec4(0.5, 0.5, 0.5, 0.5).r;
```

**Vzory:**
- `+= vec4(0.5)).r` → `+= vec4(0.5, 0.5, 0.5, 0.5).r`
- `= vec4(0.5)).r` → `= vec4(0.5, 0.5, 0.5, 0.5).r`

**Výskyt:** Řádky 1141-1145 (D.3 VHS Glitch)

---

### Problém 5: Chybějící operátor v vec4 konstruktoru
**Příklad:**
```glsl
vec4 midiData = vec4(0.5) + .5, float(channel) + .5));
```

**Správně by mělo být:**
```glsl
vec4 midiData = vec4(0.5 + 0.5, float(channel) + 0.5, 0.5, 0.5);
```

**Vzory:**
- `vec4(0.5) + .5, ...)` → `vec4(0.5 + 0.5, ...)`

**Výskyt:** Řádek 1620 (M.1 Stripes)

---

## Plán implementace oprav

### ✅ Fáze 1: Vylepšení sanitizace v `shaderLoader.js`
**Cíl:** Opravit problémy před kompilací

**Implementace:**
1. ✅ **Oprava nevyvážených závorek s dělením:**
   - Detekce: `vec4(X) / VAR, Y),Z))`
   - Oprava: `vec4(X / VAR, Y, Z, 1.0)`

2. ✅ **Oprava chybějících operátorů mezi vec4:**
   - Detekce: `vec4(X)vec4(Y))`
   - Oprava: `vec4(X) + vec4(Y)`

3. ✅ **Oprava nevyvážených závorek s swizzle:**
   - Detekce: `vec4(X),Y))` nebo `vec4(X))`
   - Oprava: `vec4(X, Y, 1.0, 1.0)` nebo `vec4(X, X, X, X)`

**Soubory:**
- ✅ `src/utils/shaderLoader.js` - vytvořena funkce `sanitizeSyntaxErrors()`
- ✅ Integrováno do `convertMiniShader()` a `convertISFShader()`
- ✅ Integrováno do `ShaderPreview.jsx`

---

### ✅ Fáze 2: Vylepšení error recovery v `shaderErrorRecovery.js`
**Cíl:** Automaticky opravit chyby při kompilaci

**Implementace:**
1. ✅ **Rozšířit `fixCommonSyntaxErrors()`:**
   - ✅ Přidána detekce a oprava `vec4(X) / VAR, Y),Z))`
   - ✅ Přidána detekce a oprava `vec4(X)vec4(Y))`
   - ✅ Přidána detekce a oprava `vec4(X),Y))` a `vec4(X))`
   - ✅ Přidána detekce a oprava `vec4(X)).r` a `vec4(X)).rgb`
   - ✅ Přidána detekce a oprava `vec4(X) + .5, ...)`

2. ✅ **Rozšířit `fixSyntaxErrorsInCode()`:**
   - ✅ Přidány globální opravy pro všechny výše uvedené vzory

**Soubory:**
- ✅ `src/utils/shaderErrorRecovery.js` - rozšířeny existující funkce

---

### ⚠️ Fáze 3: Vylepšení detekce chyb v `shaderErrorHandler.js`
**Cíl:** Lepší kategorizace chyb

**Implementace:**
1. ⚠️ **Rozšířit `categorizeErrorType()`:**
   - Lepší detekce syntax chyb s nevyváženými závorkami
   - Detekce chybějících operátorů

**Soubory:**
- ⚠️ `src/utils/shaderErrorHandler.js` - rozšířit kategorizaci (volitelné)

---

## Konkrétní opravy

### Oprava 1: `vec4(0.5) / FREQ_RANGE, 0.25),1.0))`
**Regex pattern:**
```javascript
/vec\d+\s*\(([^)]+)\)\s*\/\s*(\w+)\s*,\s*(\d+\.?\d*)\)\s*,\s*(\d+\.?\d*)\)\)/g
```

**Oprava:**
```javascript
code.replace(/vec\d+\s*\(([^)]+)\)\s*\/\s*(\w+)\s*,\s*(\d+\.?\d*)\)\s*,\s*(\d+\.?\d*)\)\)/g,
  (match, first, varName, second, third) => {
    return `vec4(${first} / ${varName}, ${second}, ${third}, 1.0)`;
  }
);
```

---

### Oprava 2: `vec4(0.0)vec4(0.5))`
**Regex pattern:**
```javascript
/vec\d+\s*\(([^)]+)\)\s*vec\d+\s*\(([^)]+)\)\)/g
```

**Oprava:**
```javascript
code.replace(/vec\d+\s*\(([^)]+)\)\s*vec\d+\s*\(([^)]+)\)\)/g,
  (match, first, second) => {
    return `vec4(${first}) + vec4(${second})`;
  }
);
```

---

### Oprava 3: `vec4(0.5),1.0))` nebo `vec4(0.5))`
**Regex pattern:**
```javascript
/vec\d+\s*\(([^)]+)\)\s*,\s*(\d+\.?\d*)\)\)/g  // vec4(0.5),1.0))
/vec\d+\s*\(([^)]+)\)\)/g                      // vec4(0.5))
```

**Oprava:**
```javascript
// Pro vec4(0.5),1.0))
code.replace(/vec\d+\s*\(([^)]+)\)\s*,\s*(\d+\.?\d*)\)\)/g,
  (match, first, second) => {
    return `vec4(${first}, ${second}, 1.0, 1.0)`;
  }
);

// Pro vec4(0.5))
code.replace(/vec\d+\s*\(([^)]+)\)\)(?!\s*[\.\w])/g,
  (match, first) => {
    return `vec4(${first}, ${first}, ${first}, ${first})`;
  }
);
```

---

### Oprava 4: `vec4(0.5) + .5, ...)`
**Regex pattern:**
```javascript
/vec\d+\s*\(([^)]+)\)\s*\+\s*\.(\d+)\s*,\s*/g
```

**Oprava:**
```javascript
code.replace(/vec\d+\s*\(([^)]+)\)\s*\+\s*\.(\d+)\s*,\s*/g,
  (match, first, second) => {
    return `vec4(${first} + 0.${second}, `;
  }
);
```

---

## ✅ Status implementace

1. ✅ **Vysoká priorita - DOKONČENO:**
   - ✅ Oprava 1: `vec4(0.5) / FREQ_RANGE, 0.25),1.0))` (3 shadery)
   - ✅ Oprava 3: `vec4(0.5),1.0))` a `vec4(0.5))` (5 shaderů)

2. ✅ **Střední priorita - DOKONČENO:**
   - ✅ Oprava 2: `vec4(0.0)vec4(0.5))` (1 shader)
   - ✅ Oprava 4: `vec4(0.5) + .5, ...)` (1 shader)

---

## ✅ Implementované opravy

### ✅ Oprava 1: `vec4(0.5) / FREQ_RANGE, 0.25),1.0))`
- ✅ Implementováno v `sanitizeSyntaxErrors()`
- ✅ Implementováno v `fixCommonSyntaxErrors()`
- ✅ Implementováno v `fixSyntaxErrorsInCode()`

### ✅ Oprava 2: `vec4(0.0)vec4(0.5))`
- ✅ Implementováno v `sanitizeSyntaxErrors()`
- ✅ Implementováno v `fixCommonSyntaxErrors()`
- ✅ Implementováno v `fixSyntaxErrorsInCode()`

### ✅ Oprava 3: `vec4(0.5),1.0))` a `vec4(0.5))`
- ✅ Implementováno v `sanitizeSyntaxErrors()`
- ✅ Implementováno v `fixCommonSyntaxErrors()`
- ✅ Implementováno v `fixSyntaxErrorsInCode()`

### ✅ Oprava 4: `vec4(0.5) + .5, ...)`
- ✅ Implementováno v `sanitizeSyntaxErrors()`
- ✅ Implementováno v `fixCommonSyntaxErrors()`
- ✅ Implementováno v `fixSyntaxErrorsInCode()`

### ✅ Oprava 5: `vec4(0.5)).r` a `vec4(0.5)).rgb`
- ✅ Implementováno v `sanitizeSyntaxErrors()`
- ✅ Implementováno v `fixCommonSyntaxErrors()`
- ✅ Implementováno v `fixSyntaxErrorsInCode()`

---

## Testování

Po implementaci otestovat na:
- ✅ C.1 Eclipse.fs - `vec4(0.5) / FREQ_RANGE, 0.25),1.0))`
- ✅ C.2 Flat Eclipse.fs - `vec4(0.5) / FREQ_RANGE, 0.0), 1.0))`
- ✅ C.3 Double Eclipse.fs - `vec4(0.5) / FREQ_RANGE, 0.25),1.0))`
- ✅ C.4 Spirals.fs - `vec4(0.5),1.0))`
- ✅ C.9 FFT Spiral.fs - `vec4(0.5), 1.0))`
- ✅ D.2 Glitch Shifter.fs - `vec4(0.5)`
- ✅ D.3 VHS Glitch.fs - `vec4(0.5))`
- ✅ D.4 Edge Distort.fs - `vec4(0.0)vec4(0.5))`
- ✅ F.3 Infernogram.fs - `vec4(0.5))`
- ✅ L.1 LED.fs - `vec4(0.5), 1.0))`
- ✅ M.1 Stripes.fs - `vec4(0.5) + .5, ...)`

---

## ✅ Dokončeno

- ✅ Fáze 1: Vylepšení sanitizace - DOKONČENO
- ✅ Fáze 2: Vylepšení error recovery - DOKONČENO
- ⚠️ Fáze 3: Vylepšení detekce chyb - VOLITELNÉ (není nutné)

**Status: Implementace dokončena, připraveno k testování**

