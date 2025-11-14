# Plán migrace komponent na centrální theme konfiguraci

## Cíl
Migrovat všechny komponenty v aplikaci na použití centrální theme konfigurace z `src/config/theme.js` místo hardcoded styling hodnot.

## Fáze migrace

### Fáze 1: Základní UI komponenty (Priorita: VYSOKÁ)
Tyto komponenty jsou nejčastěji používané a tvoří základ UI systému.

#### ✅ Dokončeno
- [x] FramerButton - migrováno

#### 🔄 K migraci
- [ ] FramerSection - používá spacing, border radius
- [ ] AnimatedText - používá typography, spacing
- [ ] BackButton - používá barvy, spacing, border radius
- [ ] ErrorBoundary - používá barvy, spacing, card styling
- [ ] SimpleLoading - používá barvy, spacing

**Odhadovaný čas:** 2-3 hodiny

---

### Fáze 2: Modaly a overlay komponenty (Priorita: VYSOKÁ)
Komponenty pro modaly a overlay, které se používají napříč aplikací.

- [ ] SoundThemeGallery - hodně hardcoded hodnot (bg-[#f4ddc4], bg-white/50, border-black/10)
- [ ] TimePickerModal - používá overlay barvy, spacing
- [ ] WheelPicker - používá barvy, spacing, border radius
- [ ] AudioPermissionOverlay - používá overlay barvy, spacing
- [ ] AudioWarning - používá barvy, spacing, card styling
- [ ] Dropdown - používá barvy, spacing, border radius

**Odhadovaný čas:** 3-4 hodiny

---

### Fáze 3: Audio komponenty (Priorita: STŘEDNÍ)
Komponenty pro audio přehrávač.

- [ ] AudioPlayer - používá barvy, spacing, border radius
- [ ] AudioPlayerAnimations - používá overlay barvy, gradienty
- [ ] AudioControls - používá spacing, barvy
- [ ] CircularProgress - používá barvy, velikosti
- [ ] PlayPauseButton - používá barvy, velikosti, border radius
- [ ] SkipButton - používá barvy, velikosti, spacing
- [ ] AudioPlayerHeader - používá typography, spacing
- [ ] CurrentTimeDisplay - používá typography, barvy
- [ ] CloseButton - používá barvy, spacing, border radius
- [ ] LoadingIndicator - používá barvy, spacing
- [ ] VoiceSwitcher - používá barvy, spacing, border radius
- [ ] TrackSwitcher - používá barvy, spacing
- [ ] ShaderSelector - používá barvy, spacing, border radius

**Odhadovaný čas:** 4-5 hodin

---

### Fáze 4: Screen komponenty (Priorita: STŘEDNÍ)
Hlavní obrazovky aplikace.

- [ ] HomeScreen - používá barvy, spacing, typography
- [ ] MeditationScreen - používá barvy, spacing, typography (bg-[#f4ddc4])
- [ ] BreathScreen - používá barvy, spacing (bg-[#f4ddc4])
- [ ] MeditaceScreen - používá barvy, spacing, typography
- [ ] HudbaScreen - používá barvy, spacing
- [ ] SettingsScreen - používá barvy, spacing, typography
- [ ] HelpScreen - používá barvy, spacing, typography
- [ ] IntroScreen - používá barvy, typography
- [ ] BackgroundSettingsScreen - používá barvy, spacing
- [ ] ShaderSelectionScreen - používá barvy, spacing
- [ ] SoundThemeGalleryScreen - používá barvy, spacing
- [ ] BreathProfilesScreen - používá barvy, spacing
- [ ] AlbumDetailScreen - používá barvy, spacing
- [ ] AudioPlayerHudbaScreen - používá barvy (bg-[#f4ddc4])
- [ ] AudioPlayerMeditaceScreen - používá barvy, spacing
- [ ] SimpleAdminScreen - používá barvy, spacing
- [ ] TroubleScreen - používá barvy, spacing

**Odhadovaný čas:** 6-8 hodin

---

### Fáze 5: Meditation komponenty (Priorita: STŘEDNÍ)
Komponenty specifické pro meditaci.

- [ ] MeditationTimer - používá typography, barvy, spacing
- [ ] MeditationControls - používá barvy, spacing
- [ ] MeditationSettings - používá barvy, spacing, card styling
- [ ] BreathingSection - používá barvy, spacing
- [ ] BreathingAnimation - používá barvy, velikosti
- [ ] BreathHeader - používá typography, barvy, spacing
- [ ] BreathParameters - používá barvy, spacing
- [ ] BreathProgressCircle - používá barvy, velikosti
- [ ] BreathActionButtons - používá barvy, spacing
- [ ] PreparationSection - používá barvy, spacing, typography
- [ ] BackgroundSettingsControls - používá barvy, spacing, card styling
- [ ] BackgroundQuickAccess - používá barvy, spacing
- [ ] AlbumGrid - používá spacing, grid layout
- [ ] AlbumCard - používá barvy, spacing, border radius, card styling
- [ ] BreathModals - používá barvy, spacing

**Odhadovaný čas:** 4-5 hodin

---

### Fáze 6: Shader a preview komponenty (Priorita: NÍZKÁ)
Komponenty pro shadery a preview.

- [ ] ShaderGallery - používá barvy, spacing, card styling
- [ ] ShaderPreview - používá barvy, spacing, border radius
- [ ] ShaderCategorySelector - používá barvy, spacing, border radius
- [ ] ShaderErrorReport - používá barvy, spacing
- [ ] BackgroundShader - používá barvy (pokud má UI části)
- [ ] AudioShaderBackground - používá barvy (pokud má UI části)
- [ ] ShaderPreviewAdminSection - používá barvy, spacing

**Odhadovaný čas:** 2-3 hodiny

---

### Fáze 7: Admin a utility komponenty (Priorita: NÍZKÁ)
Admin komponenty a utility komponenty.

- [ ] AdminDataViewer - používá barvy, spacing, card styling
- [ ] AdminMetadataManager - používá barvy, spacing
- [ ] AdminDataEditor - používá barvy, spacing
- [ ] DataStorageCharts - používá barvy, spacing, card styling
- [ ] MonitoringDashboard - používá barvy, spacing
- [ ] LanguageSwitcher - používá barvy, spacing, border radius
- [ ] Waveform - používá barvy (pokud má UI části)
- [ ] FramerMeditationCircle - používá barvy, velikosti
- [ ] Layout - používá barvy, spacing
- [ ] PageManager - používá barvy, spacing (pokud má UI části)

**Odhadovaný čas:** 3-4 hodiny

---

### Fáze 8: Hlavní aplikace a kontexty (Priorita: VYSOKÁ)
Hlavní soubory aplikace.

- [ ] App.jsx - používá bg-[#f4ddc4], barvy pro monitoring button
- [ ] index.css - kontrola, zda nejsou hardcoded hodnoty, které by měly být v theme

**Odhadovaný čas:** 1 hodina

---

## Celkový odhad času
**Celkem:** 25-33 hodin

## Strategie migrace

### 1. Identifikace hardcoded hodnot
Pro každou komponentu:
- Najít všechny hardcoded barvy (bg-[#f4ddc4], bg-black, text-white, atd.)
- Najít všechny hardcoded spacing hodnoty (px-4, py-5, gap-2, atd.)
- Najít všechny hardcoded velikosti (w-12, h-12, min-h-[3rem], atd.)
- Najít všechny hardcoded border radius (rounded-lg, rounded-full, atd.)
- Najít všechny hardcoded typography hodnoty (text-2xl, font-light, atd.)

### 2. Mapování na theme hodnoty
- Mapovat hardcoded hodnoty na hodnoty z `src/config/theme.js`
- Pokud hodnota v theme neexistuje, přidat ji do theme konfigurace
- Vytvořit utility funkce pro často používané kombinace (např. getCardClasses)

### 3. Migrace komponenty
- Importovat `useTheme` nebo `useThemeValue` hook
- Nahradit hardcoded hodnoty voláním theme hooků nebo utility funkcí
- Použít `getButtonClasses`, `getCardClasses` nebo podobné utility funkce
- Otestovat, že vzhled zůstává stejný

### 4. Testování
- Otestovat každou migrovanou komponentu vizuálně
- Ověřit, že všechny varianty fungují správně
- Ověřit responzivitu na různých velikostech obrazovek

## Utility funkce k vytvoření

### Již vytvořené
- `getButtonClasses(variant, disabled)` - pro button varianty
- `getCardClasses(variant)` - pro card varianty

### K vytvoření
- `getModalClasses()` - pro modal overlay a kontejnery
- `getTextClasses(variant)` - pro text varianty (heading, body, caption, atd.)
- `getSpacingClasses(type, size)` - pro konzistentní spacing
- `getOverlayClasses(opacity)` - pro overlay barvy s různou opacity

## Poznámky

1. **Barva #f4ddc4** - Tato barva se používá velmi často jako hlavní pozadí. Měla by být vždy z theme.colors.primary nebo theme.colors.background.

2. **Opacity varianty** - Mnoho komponent používá bg-white/50, bg-black/10, atd. Tyto hodnoty by měly být z theme.colors.overlay.

3. **Card styling** - Mnoho komponent používá podobný card styling (bg-white/50, backdrop-blur, border border-black/10). Měly by používat getCardClasses().

4. **Button styling** - Všechny buttony by měly používat getButtonClasses() místo hardcoded hodnot.

5. **Typography** - Textové komponenty by měly používat theme.typography hodnoty.

## Priorita podle dopadu

1. **VYSOKÁ priorita** - Komponenty používané na více místech (FramerButton, FramerSection, modaly)
2. **STŘEDNÍ priorita** - Screen komponenty a feature-specific komponenty
3. **NÍZKÁ priorita** - Admin komponenty a utility komponenty

## Checklist pro každou komponentu

- [ ] Identifikovat všechny hardcoded styling hodnoty
- [ ] Mapovat na theme hodnoty
- [ ] Přidat chybějící hodnoty do theme konfigurace (pokud je potřeba)
- [ ] Importovat useTheme hook
- [ ] Nahradit hardcoded hodnoty
- [ ] Použít utility funkce (getButtonClasses, getCardClasses, atd.)
- [ ] Otestovat vizuálně
- [ ] Ověřit responzivitu
- [ ] Commit změn

