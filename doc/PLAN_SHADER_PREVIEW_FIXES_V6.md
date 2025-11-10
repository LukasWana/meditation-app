# Plán oprav preview shaderů - V6

## Analýza problémů

### 1. Shader compilation errors
**Problém:**
- M.2 Circles.fs se nekompiluje
- Fragment shader compilation failed
- Fallback shader se používá, ale preview se stále neukazuje

**Možné příčiny:**
- Chyby v shaderu, které nejsou opraveny automaticky
- Problémy s ISF konverzí (IMG_PIXEL, IMG_NORM_PIXEL, RENDERSIZE, isf_FragNormCoord)
- Chybějící nebo nesprávně převedené proměnné

### 2. WebGL context management
**Problém:**
- "Too many active WebGL contexts" - stále se objevuje i při limitu 6
- "WebGL kontext byl ztracen" - kontexty se ztrácejí během renderování
- Render loop pokračuje i po ztrátě kontextu

**Možné příčiny:**
- Kontexty se vytvářejí rychleji, než se uvolňují
- Cleanup není dostatečně agresivní
- Chybí retry mechanismus pro ztracené kontexty

### 3. Fallback mechanismus
**Problém:**
- Fallback shader se používá, ale preview se neukazuje
- Chybí vizuální indikace, že se používá fallback

**Možné příčiny:**
- Fallback shader se kompiluje, ale renderování selhává
- Chybí error handling pro fallback shader
- Render loop se nespouští při použití fallbacku

## Implementační plán

### Fáze 1: Vylepšení detekce a opravy chyb kompilace shaderů

#### 1.1 Rozšířit sanitizaci pro M.2 Circles.fs
**Problémy v M.2 Circles.fs:**
- `IMG_PIXEL(midiImage, ...)` - musí být převedeno na `vec4(0.5)`
- `isf_FragNormCoord` - musí být převedeno na `v_uv`
- `RENDERSIZE` - musí být převedeno na `u_resolution`
- `mod(noteValue / 12.0, 1.0)` - může mít type mismatch

**Řešení:**
- Přidat specifické opravy pro ISF funkce v `sanitizeSyntaxErrors`
- Zkontrolovat, zda jsou všechny ISF proměnné správně převedeny
- Přidat opravu pro `mod(float / float, float)` type mismatch

#### 1.2 Vylepšit error recovery
**Problém:**
- Error recovery nefunguje pro všechny typy chyb
- Chybí specifické opravy pro ISF konverzi

**Řešení:**
- Rozšířit `attemptErrorRecovery` o specifické opravy pro ISF chyby
- Přidat detekci a opravu chybějících ISF proměnných
- Přidat retry mechanismus s více pokusy

#### 1.3 Přidat lepší error logging
**Problém:**
- Chybí detailní informace o tom, proč se shader nekompiluje
- Chybí informace o tom, které opravy byly aplikovány

**Řešení:**
- Přidat detailní logging pro každý krok kompilace
- Zaznamenat všechny aplikované opravy
- Zobrazit uživatelsky přívětivou chybovou zprávu

### Fáze 2: Agresivnější WebGL context management

#### 2.1 Snížit limit kontextů ještě více
**Problém:**
- Limit 6 je stále překračován
- Kontexty se vytvářejí rychleji, než se uvolňují

**Řešení:**
- Snížit `maxContexts` z 6 na 4
- Zrychlit cleanup interval z 2s na 1s
- Snížit cleanup age z 6s na 4s

#### 2.2 Přidat okamžité uvolnění neaktivních kontextů
**Problém:**
- Kontexty se uvolňují až po určité době
- Chybí okamžité uvolnění při ztrátě kontextu

**Řešení:**
- Přidat okamžité uvolnění kontextů při ztrátě (context lost event)
- Přidat detekci neaktivních kontextů (bez renderování)
- Uvolnit kontexty, které nebyly použity déle než 2 sekundy

#### 2.3 Přidat retry mechanismus pro ztracené kontexty
**Problém:**
- Po ztrátě kontextu se shader nepokusí znovu načíst
- Chybí automatické obnovení kontextu

**Řešení:**
- Přidat retry mechanismus s exponenciálním backoff
- Automaticky znovu vytvořit kontext po ztrátě
- Omezit počet retry pokusů (max 3)

### Fáze 3: Vylepšení fallback mechanismu

#### 3.1 Zajistit, že fallback shader se renderuje
**Problém:**
- Fallback shader se kompiluje, ale preview se neukazuje
- Chybí kontrola, zda se fallback shader skutečně renderuje

**Řešení:**
- Zkontrolovat, zda se fallback shader správně linkuje
- Zajistit, že render loop se spouští i při použití fallbacku
- Přidat vizuální indikaci, že se používá fallback (např. jiná barva)

#### 3.2 Přidat error handling pro fallback shader
**Problém:**
- Chybí error handling pro fallback shader
- Pokud fallback selže, není jasné, co se stalo

**Řešení:**
- Přidat detailní error handling pro fallback shader
- Zobrazit chybovou zprávu, pokud fallback selže
- Přidat alternativní fallback shader (jednodušší verze)

#### 3.3 Zlepšit vizuální feedback
**Problém:**
- Chybí vizuální indikace, že se používá fallback
- Uživatel neví, že shader nefunguje správně

**Řešení:**
- Přidat vizuální indikaci (např. rámeček, jiná barva)
- Zobrazit tooltip s informací o použití fallbacku
- Přidat možnost zobrazit chybovou zprávu

### Fáze 4: Optimalizace renderování

#### 4.1 Zastavit renderování při ztrátě kontextu
**Problém:**
- Render loop pokračuje i po ztrátě kontextu
- Chybí kontrola kontextu před každým renderováním

**Řešení:**
- Přidat kontrolu kontextu před každým renderováním
- Zastavit render loop okamžitě při ztrátě kontextu
- Resetovat state při ztrátě kontextu

#### 4.2 Přidat debouncing pro vytváření kontextů
**Problém:**
- Kontexty se vytvářejí příliš rychle
- Chybí debouncing pro vytváření kontextů

**Řešení:**
- Přidat debouncing pro vytváření kontextů (100ms)
- Omezit počet kontextů vytvořených za sekundu
- Přidat queue pro vytváření kontextů

#### 4.3 Optimalizovat cleanup
**Problém:**
- Cleanup není dostatečně efektivní
- Chybí prioritizace kontextů k uvolnění

**Řešení:**
- Prioritizovat kontexty k uvolnění (nejstarší, neaktivní)
- Přidat okamžité uvolnění kontextů bez renderování
- Zlepšit detekci neaktivních kontextů

## Priorita implementace

1. **Kritická priorita:**
   - Fáze 1.1: Rozšířit sanitizaci pro M.2 Circles.fs
   - Fáze 2.1: Snížit limit kontextů ještě více
   - Fáze 3.1: Zajistit, že fallback shader se renderuje

2. **Vysoká priorita:**
   - Fáze 1.2: Vylepšit error recovery
   - Fáze 2.2: Přidat okamžité uvolnění neaktivních kontextů
   - Fáze 4.1: Zastavit renderování při ztrátě kontextu

3. **Střední priorita:**
   - Fáze 1.3: Přidat lepší error logging
   - Fáze 2.3: Přidat retry mechanismus pro ztracené kontexty
   - Fáze 3.2: Přidat error handling pro fallback shader
   - Fáze 3.3: Zlepšit vizuální feedback

4. **Nízká priorita:**
   - Fáze 4.2: Přidat debouncing pro vytváření kontextů
   - Fáze 4.3: Optimalizovat cleanup

## Testování

Po každé fázi:
1. Otestovat M.2 Circles.fs - zkontrolovat, zda se kompiluje
2. Zkontrolovat, zda se preview zobrazuje
3. Ověřit, zda se snižuje počet varování "Too many active WebGL contexts"
4. Ověřit, zda se snižuje počet varování "WebGL kontext byl ztracen"

## Očekávané výsledky

- M.2 Circles.fs se zkompiluje bez chyb
- Preview shaderů se zobrazuje i při použití fallbacku
- Snížení počtu varování "Too many active WebGL contexts" na minimum
- Eliminace varování "WebGL kontext byl ztracen"
- Stabilní renderování všech shaderů
- Lepší error handling a recovery

