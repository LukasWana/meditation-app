# Dokumentace použití shaderů ve VJ aplikaci (Haluzator-stable)

## Přehled architektury

VJ aplikace používá komplexní systém pro přehrávání shaderů s následujícími komponentami:

### 1. **Shader Playback System**
- **SequencerAndPlaybackProvider**: Hlavní provider pro správu sekvencí a přehrávání
- **Playback Context**: Spravuje stav přehrávání (isPlaying, currentStep, transitionState)
- **Sequencer Context**: Spravuje sekvence shaderů a médií

### 2. **WebGL Rendering Pipeline**
- **useWebGL hook**: Hlavní hook pro WebGL renderování
- **Multi-pass rendering**:
  1. Base shader rendering (do FBO)
  2. Media overlay rendering (obrázky, videa, 3D modely)
  3. Compositing (kombinace base + overlay)
  4. Transition (přechody mezi shadery)
  5. Post-processing (blur, glow, chroma, hue shift, atd.)
  6. Particle overlay (volitelné)

### 3. **Shader Management**
- **Shader registry**: Shadery jsou uloženy v `shaders` objektu (Record<string, string>)
- **Shader keys**: Každý shader má unikátní klíč (např. 'NeoFlow', 'MechStruct')
- **Shader loading**: Shadery se načítají ze souborů nebo jsou vestavěné
- **Shader compilation**: Shadery se kompilují do WebGL programů s cachováním

### 4. **Transition System**
- **Plynulé přechody**: Používá requestAnimationFrame pro animaci přechodů
- **Transition shader**: Speciální shader pro zoom blur přechody
- **Transition duration**: 1000ms (TRANSITION_DURATION_MS)
- **Transition state**: Sleduje fromShaderKey, toShaderKey, transitionProgress

### 5. **Sequencer System**
- **Shader sequences**: Pole shaderů pro každou stránku (page)
- **Media sequences**: Pole médií (obrázky, videa, modely) pro každou stránku
- **Pages**: 8 stránek (NUM_PAGES = 8)
- **Steps**: 2, 4, 8, nebo 16 kroků na stránku
- **Loop support**: Podpora pro loopování v rámci určitého rozsahu kroků

### 6. **Playback Control**
- **Steps per minute**: Rychlost přehrávání (default: 15)
- **Auto-advance**: Automatické přecházení na další krok podle tempa
- **Live VJ**: Možnost manuálního spuštění konkrétního kroku
- **Video sync**: Synchronizace s videi (přehrávání podle délky videa)

## Klíčové komponenty

### useWebGL Hook
```typescript
useWebGL(
  canvasRef,
  props: {
    fromShaderKey, toShaderKey,
    isTransitioning, transitionProgress,
    fromMediaKey, toMediaKey,
    fromModelSettings, toModelSettings,
    isPlaying,
    ...controls
  },
  shaders: Record<string, string>,
  userImages, userVideos, userModels,
  audioDataRef,
  onShaderError, onFpsUpdate
)
```

### Render Pipeline
1. **Base Shader Rendering**
   - Renderuje hlavní shader do baseFbo
   - Používá shader kód z `shaders[shaderKey]`
   - Podporuje uniformy: iResolution, iTime, iAudio, u_speed, u_zoom

2. **Media Overlay**
   - Obrázky: Textury z userImages
   - Videa: Textury z userVideos (aktualizované každý frame)
   - 3D modely: Renderování do modelFbo s lightingem

3. **Compositing**
   - Kombinuje base shader s media overlay
   - Podporuje overlay opacity a zoom

4. **Transition**
   - Zoom blur přechod mezi from a to shadery
   - Používá transitionProgress (0.0 - 1.0)

5. **Post-processing**
   - Blur, glow, chroma, hue shift
   - Mandala segments (symetrie)
   - Level adjustments (shadows, midtones, highlights)
   - Saturation

6. **Particle Overlay**
   - Volitelné částice reagující na audio

## Shader Uniforms

### Standardní uniformy pro shadery
- `iResolution` (vec3): Rozlišení canvasu
- `iTime` (float): Čas v sekundách
- `iAudio` (vec4): Audio data (low, mid, high, overall)
- `iMouse` (vec4): Pozice myši
- `iChannel0` (sampler2D): Textura pro post-processing

### Volitelné uniformy
- `u_speed` (float): Rychlost animace
- `u_zoom` (float): Zoom level
- `u_intensity` (float): Intenzita shaderu

## Transition System

### Transition States
- `fromShaderKey`: Shader, ze kterého přecházíme
- `toShaderKey`: Shader, na který přecházíme
- `isTransitioning`: Zda probíhá přechod
- `transitionProgress`: Progress přechodu (0.0 - 1.0)

### Transition Logic
- Spouští se při změně shaderu v sekvenci
- Používá requestAnimationFrame pro plynulou animaci
- Trvá TRANSITION_DURATION_MS (1000ms)
- Používá zoom blur efekt

## Playback Logic

### Auto-advance
- Při isPlaying=true se automaticky přechází na další krok
- Timing je řízen stepsPerMinute
- Pro videa se čeká na konec videa

### Loop Support
- isLoopingEnabled: Zda je loop aktivní
- loopStart, loopEnd: Rozsah kroků pro loop
- Při loopování se přehrává pouze v rámci rozsahu

### Live VJ
- triggerLiveVjStep: Spustí konkrétní krok manuálně
- Při přehrávání: Nastaví currentStep
- Bez přehrávání: Zobrazí krok dočasně, pak se vrátí

## Shader Format

### Shader Source Format
Shadery používají formát podobný Shadertoy:
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Shader kód
}
```

### Shader Conversion
- Shadery se převádějí z Shadertoy formátu na WebGL
- Používá se `getFragmentShaderSrc()` funkce
- Podporuje standardní uniformy (iResolution, iTime, iAudio)

## Optimalizace

### Caching
- Shader programy jsou cachované v `renderStateRef.current.programs`
- FBO jsou cachované a znovu používány
- Textury médií jsou cachované

### Performance
- Multi-pass rendering pro flexibilitu
- FPS tracking a reporting
- Optimalizované uniform updates

## Integrace s médii

### Obrázky
- Načítají se jako textury
- Ukládají se v `imageTextures`
- Podporují overlay opacity a zoom

### Videa
- Textury se aktualizují každý frame
- Synchronizace s přehráváním
- Podporují loop a one-shot přehrávání

### 3D Modely
- Renderování do vlastního FBO
- Podporují různé animace (rotate, tumble, pulse, wobble)
- Lighting systém (ambient, diffuse, specular, rim)
- Možnost použít shader jako texturu na modelu

