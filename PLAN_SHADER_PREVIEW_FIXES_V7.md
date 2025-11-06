# Plán oprav shader preview - V7

## Analýza problémů z logů

### Hlavní problémy:

1. **C.9 FFT Spiral.fs**: `undeclared identifier` (10 chyb)
   - Proměnné nejsou správně deklarovány
   - Potřebujeme lepší detekci a přidání chybějících proměnných

2. **D.2 Glitch Shifter.fs**: `dimension mismatch` (7 chyb)
   - `cannot convert from 'const mediump float' to 'mediump 2-component vector of float'`
   - Problém s vec2 + float operacemi
   - Potřebujeme lepší opravu dimension mismatch

3. **D.3 VHS Glitch.fs**: `missing_token` (3 chyby)
   - `boolean expression expected`
   - Chybějící operátory nebo závorky v boolean výrazech
   - Potřebujeme opravu boolean expressions

4. **M.2 Circles.fs**: `too many arguments` (4 chyby)
   - Funkce volané s nesprávným počtem argumentů
   - Potřebujeme detekci a opravu argumentů funkcí

5. **WebGL contexts**: Stále "Too many active WebGL contexts" (11x)
   - Limit 4 kontextů stále překračován
   - Potřebujeme agresivnější cleanup

---

## Fáze 1: Vylepšit detekci a opravu undeclared variables (VYSOKÁ PRIORITA)

### 1.1: Rozšířit seznam common variables
- Přidat více běžných proměnných do `addMissingCommonVariables`
- Zkontrolovat všechny shadery a identifikovat často chybějící proměnné
- Přidat proměnné specifické pro jednotlivé shadery

### 1.2: Vylepšit detekci použití proměnných
- Zlepšit regex pro detekci použití proměnných v kódu
- Zohlednit různé formáty použití (v funkcích, v podmínkách, v loopech)
- Zkontrolovat, zda proměnná není použita v komentářích

### 1.3: Přidat automatickou detekci typu proměnné
- Analyzovat kontext použití proměnné
- Automaticky určit typ (float, vec2, vec3, vec4, int, bool)
- Přidat správnou deklaraci s vhodným typem

---

## Fáze 2: Vylepšit opravu dimension mismatch (VYSOKÁ PRIORITA)

### 2.1: Rozšířit opravu vec2 + float
- Přidat více regexů pro různé formáty vec2 + float
- Opravit i vec3 + float a vec4 + float
- Zohlednit různé operátory (+, -, *, /, mod)

### 2.2: Přidat opravu pro "cannot convert from float to vec2"
- Detekovat případy, kdy se float používá tam, kde je očekáván vec2
- Automaticky převést float na vec2(float)
- Zkontrolovat všechny operace s vec2

### 2.3: Vylepšit opravu mod(vec2, float)
- Zajistit, že mod() má správné typy argumentů
- Opravit mod(vec2(...), float) -> mod(vec2(...), vec2(float))
- Zkontrolovat i další funkce, které očekávají vec2

---

## Fáze 3: Opravit missing token - boolean expressions (STŘEDNÍ PRIORITA)

### 3.1: Přidat detekci boolean expression errors
- Detekovat chybějící operátory v boolean výrazech
- Opravit chybějící &&, ||, ==, != operátory
- Zkontrolovat podmínky v if/while/for

### 3.2: Opravit chybějící závorky v boolean výrazech
- Detekovat nevyvážené závorky v boolean výrazech
- Automaticky přidat chybějící závorky
- Zkontrolovat priority operátorů

### 3.3: Přidat opravu pro chybějící operátory
- Detekovat případy, kdy chybí operátor mezi výrazy
- Automaticky přidat vhodný operátor (&&, ||, ==)
- Zkontrolovat kontext použití

---

## Fáze 4: Opravit "too many arguments" chyby (STŘEDNÍ PRIORITA)

### 4.1: Přidat detekci funkcí s nesprávným počtem argumentů
- Parsovat chybové hlášky pro "too many arguments"
- Identifikovat funkci a počet argumentů
- Zjistit správný počet argumentů pro danou funkci

### 4.2: Automaticky opravit počet argumentů
- Odstranit přebytečné argumenty
- Nebo přidat chybějící argumenty s výchozími hodnotami
- Zkontrolovat všechny vestavěné GLSL funkce

### 4.3: Přidat opravu pro vlastní funkce
- Detekovat vlastní funkce s nesprávným počtem argumentů
- Analyzovat deklaraci funkce
- Opravit volání funkce

---

## Fáze 5: Agresivnější cleanup WebGL kontextů (VYSOKÁ PRIORITA)

### 5.1: Snížit limit kontextů z 4 na 2
- Snížit maxContexts na 2 pro lepší stabilitu
- Zkontrolovat, zda to nezpůsobí problémy s renderováním

### 5.2: Zrychlit cleanup interval
- Snížit cleanup interval z 1s na 500ms
- Zrychlit uvolnění neaktivních kontextů

### 5.3: Přidat okamžité uvolnění při překročení limitu
- Při překročení limitu okamžitě uvolnit nejstarší kontext
- Nečekat na cleanup interval
- Prioritizovat ztracené kontexty

---

## Implementační pořadí:

1. **Fáze 1** (VYSOKÁ): Vylepšit detekci a opravu undeclared variables
2. **Fáze 2** (VYSOKÁ): Vylepšit opravu dimension mismatch
3. **Fáze 5** (VYSOKÁ): Agresivnější cleanup WebGL kontextů
4. **Fáze 3** (STŘEDNÍ): Opravit missing token - boolean expressions
5. **Fáze 4** (STŘEDNÍ): Opravit "too many arguments" chyby

---

## Očekávané výsledky:

- ✅ C.9 FFT Spiral.fs se zkompiluje bez chyb (opraveny undeclared variables)
- ✅ D.2 Glitch Shifter.fs se zkompiluje bez chyb (opraveny dimension mismatch)
- ✅ D.3 VHS Glitch.fs se zkompiluje bez chyb (opraveny boolean expressions)
- ✅ M.2 Circles.fs se zkompiluje bez chyb (opraveny "too many arguments")
- ✅ Snížení varování "Too many active WebGL contexts" na minimum
- ✅ Stabilní renderování všech shaderů
- ✅ Lepší error recovery a automatické opravy

