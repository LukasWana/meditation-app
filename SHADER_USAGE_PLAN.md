# Plán použití shaderů v aplikaci meditace

## Cíl
Integrovat systém přehrávání shaderů z VJ aplikace do aplikace meditace, aby bylo možné:
1. Vytvářet sekvence shaderů pro meditaci
2. Přehrávat shadery automaticky během meditace
3. Používat plynulé přechody mezi shadery
4. Synchronizovat shadery s dýcháním a hudbou

## Fáze implementace

### Fáze 1: Základní integrace ✅ (Dokončeno)
- [x] Vytvoření ShaderPlaybackProvider
- [x] Vytvoření konstant pro sequencer
- [x] Integrace do App.jsx
- [x] Úprava BackgroundShader pro použití kontextu

### Fáze 2: Rozšíření BackgroundShader ❌ (Zrušeno - uživatel nechce)
- ❌ Podpora pro transition rendering (zoom blur přechody) - zrušeno
- ❌ Optimalizace pro multi-pass rendering - zrušeno
- ✅ Podpora pro audio-reactive uniformy - již implementováno (audioData se předává do shaderů)

### Fáze 3: UI pro Sequencer ❌ (Zrušeno - uživatel nechce)
- ❌ Vytvoření Sequencer komponenty
- ❌ UI pro výběr shaderů do sekvencí
- ❌ UI pro nastavení tempa přehrávání
- ❌ UI pro loop nastavení

### Fáze 4: Integrace s meditací ✅ (Dokončeno)
- ✅ Spuštění přehrávání shaderů při startu meditace - implementováno přes ShaderPlaybackProvider
- ✅ Synchronizace s dýcháním (breathPhase) - implementováno (breathPhase se předává do BackgroundShader)
- ✅ Synchronizace s hudbou (audioData) - implementováno (audioData se předává do BackgroundShader)
- ✅ Možnost manuálního ovládání během meditace - implementováno přes ShaderSelector v přehrávači

### Fáze 5: Pokročilé funkce
- [ ] Ukládání a načítání sekvencí shaderů
- [ ] Přednastavené sekvence pro různé typy meditace
- [ ] Export/import sekvencí
- [ ] Vizuální preview shaderů

## Detailní plán implementace

### 2.1: Transition Rendering v BackgroundShader ❌ (Zrušeno)

**Cíl**: Přidat podporu pro plynulé přechody mezi shadery pomocí zoom blur efektu.

**Status**: ❌ Zrušeno - uživatel nepotřebuje multi-pass rendering s FBOs

### 2.2: Audio-reactive uniformy ✅ (Dokončeno)

**Cíl**: Přidat podporu pro audio-reactive uniformy (iAudio).

**Status**: ✅ Dokončeno - audioData se předává do BackgroundShader a shaderů
- audioData obsahuje: frequencies, amplitude, bass, mid, treble
- Shadery mohou používat audio data pro audio-reactive efekty

**Soubory**:
- `src/components/BackgroundShader.jsx` ✅

### 3.1: Integrace s meditací

**Cíl**: Spustit přehrávání shaderů při startu meditace.

**Implementace**:
1. Spustit togglePlay() při startu meditace
2. Zastavit přehrávání při pauze/stop
3. Synchronizovat s isPlaying stavem meditace

**Soubory**:
- `src/features/meditation/screens/MeditationScreen.jsx`

### 3.2: Synchronizace s dýcháním

**Cíl**: Synchronizovat shadery s fázemi dýchání.

**Implementace**:
1. Předat breathPhase do shaderů
2. Použít breathPhase pro modulaci animace
3. Synchronizovat přechody s dýcháním

**Soubory**:
- `src/components/BackgroundShader.jsx`
- `src/features/meditation/screens/MeditationScreen.jsx`

### 3.3: Synchronizace s hudbou

**Cíl**: Synchronizovat shadery s hudbou.

**Implementace**:
1. Předat audioData do shaderů
2. Použít audioData pro audio-reactive efekty
3. Synchronizovat přechody s hudbou

**Soubory**:
- `src/components/BackgroundShader.jsx`
- `src/features/meditation/screens/HudbaScreen.jsx`

### 4.1: Pokročilé funkce (volitelné)

## Priorita implementace

### ✅ Dokončeno
1. ✅ Základní integrace (Fáze 1)
2. ✅ Audio-reactive uniformy (Fáze 2.2)
3. ✅ Integrace s meditací (Fáze 4)
4. ✅ Synchronizace s dýcháním (Fáze 4)
5. ✅ Synchronizace s hudbou (Fáze 4)
6. ✅ ShaderSelector pro přehrávač (nová funkce)

### ❌ Zrušeno
- ❌ Transition rendering s FBOs (Fáze 2.1) - uživatel nepotřebuje
- ❌ UI pro Sequencer (Fáze 3) - uživatel nechce

### Volitelné (nízká priorita)
- Pokročilé funkce (Fáze 5) - ukládání sekvencí, export/import

## Technické detaily

### Transition System
- Použít stejný transition shader jako ve VJ aplikaci
- Implementovat zoom blur efekt
- Podporovat transitionProgress (0.0 - 1.0)

### Multi-pass Rendering
- Base shader → FBO
- Transition → FBO
- Optimalizovat pro performance

### Shader Loading
- Načítat shadery ze `src/assets/shaders/`
- Podporovat formát Shadertoy
- Cachovat kompilované shadery

### State Management
- Použít ShaderPlaybackProvider pro stav
- Ukládat sekvence do localStorage
- Synchronizovat s meditačním stavem

## Testování

### Unit testy
- Test ShaderPlaybackProvider
- Test transition logiky
- Test sequencer logiky

### Integration testy
- Test integrace s meditací
- Test synchronizace s dýcháním
- Test synchronizace s hudbou

### Performance testy
- Test FPS při přehrávání
- Test paměťové náročnosti
- Test na různých zařízeních

