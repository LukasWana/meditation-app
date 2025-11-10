# Meditačná aplikácia

Moderná meditačná aplikácia vyvinutá v React s krásnym dizajnom a intuitívnym ovládaním.

## Funkcie

- **Domovská obrazovka** - Hlavné menu s 4 sekciami
- **Meditácia** - Timer s kruhovým indikátorom pokroku
- **Prvá pomoc** - Rýchle dýchacie cvičenia
- **Na cesty** - Krátke meditácie pre rôzne situácie
- **Trable** - Špecializované meditácie pre konkrétne ťažkosti

## Technológie

- React 18
- Vite
- Tailwind CSS
- Framer Motion (profesionálne animácie)
- Lucide React (ikony)
- Google Fonts (Playfair Display)

## Inštalácia a spustenie

1. Nainštalujte závislosti:
```bash
npm install
```

2. Spustite vývojový server:
```bash
npm run dev
```

3. Otvorte aplikáciu v prehliadači na `http://localhost:3000`

## Build pre produkciu

```bash
npm run build
```

## Ovládanie

- **Kliknutie** - Navigácia medzi sekciami s fluidnými animáciami
- **Potiahnutie dole** - Návrat na domovskú obrazovku
- **Šípka späť** - Tlačidlo vľavo hore na všetkých podstránkach
- **Timer** - Výber trvania (5, 10, 15, 20 minút) s animovanými tlačidlami
- **Play/Pause** - Spustenie/zastavenie meditácie s bounce efektmi
- **Reset** - Vynulovanie času
- **Touch feedback** - Všetky tlačidlá reagujú na dotyk s animáciami
- **Responsive dizajn** - Optimalizované pre všetky zariadenia bez horizontálnych scrollerov

## Animácie

Aplikácia používa [Framer Motion](https://www.framer.com/motion/) pre:

- **Spring Physics** - Prirodzené pružinové animácie
- **Fluidné tlačidlá** - Hover, click a touch s spring efektmi
- **Plynulé prechody** - Fade in/out medzi obrazovkami s AnimatePresence
- **Meditačný kruh** - Pulsujúce a rotujúce animácie
- **Touch feedback** - Okamžitá odozva na dotyk s whileTap
- **Stagger animácie** - Postupné zobrazovanie elementov s delay
- **Layout animácie** - Automatické animácie pri zmene layoutu
- **Gesture podpora** - Drag, hover, tap interakcie

## Dizajn

Aplikácia používa jemné, ukludzujúce farby:
- `#f4ddc4` - Teplá béžová (hlavné pozadie celej aplikácie)
- `#e8e4dd` - Svetlo béžová (sekcie)
- `#d9d6d0` - Šedá béžová (akcenty)
- `#ddd9d2` - Svetlejšia béžová pre hover efekty

Typografia je založená na Google Fonts "Playfair Display" pre elegantný vzhľad.

## Komponenty

### Hlavné komponenty
- **App.jsx** - Hlavná aplikácia s state managementom a routingom
- **ErrorBoundary** - Error handling pre React aplikáciu

### Obrazovky
- **HomeScreen** - Domovská obrazovka s navigáciou
- **MeditationScreen** - Meditačný timer s kruhovým indikátorom
- **BreathScreen** - Dýchacie cvičenie s animáciou
- **HelpScreen** - Prvá pomoc s možnosťami
- **JourneyScreen** - Krátke meditácie na cesty
- **TroubleScreen** - Špecializované meditácie pre ťažkosti

### UI komponenty
- **FramerButton** - Animované tlačidlá s spring physics
- **FramerSection** - Sekcie s rôznymi animačnými efektmi (fadeIn, slideInLeft, slideInUp, scaleIn, slideInTop)
- **FramerMeditationCircle** - Animovaný meditačný kruh
- **FramerPageTransition** - Plynulé prechody medzi obrazovkami
- **BackButton** - Šípka späť vľavo hore s animáciou
- **AnimatedText** - Animovaný text s pružinovou fyzikou

## Refaktorovanie a optimalizácia

Aplikácia bola kompletne refaktorovaná podľa auditu kódu:

### ✅ Vyriešené problémy:
- **Dead code elimination** - Odstránené nepoužité importy a premenné
- **Memory leaks** - Opravené useEffect cleanup funkcie
- **Component separation** - Rozdelené na menšie, znovupoužiteľné komponenty
- **Error boundaries** - Pridané pre lepšie error handling
- **Performance optimization** - useMemo pre animačné varianty
- **Input validation** - Validácia touch eventov a navigácie
- **Division by zero** - Ochrana pred matematickými chybami

### 🏗️ Architektúra:
- **Single Responsibility** - Každý komponent má jednu zodpovednosť
- **DRY Principle** - Eliminovaná duplicita kódu
- **Separation of Concerns** - Logika oddelená od UI
- **Error Resilience** - Graceful error handling

## Animácie

### Domovská obrazovka
- **slideInTop** - Tlačidlá sadať zhora s elastickým bounce efektom
- **Stagger animácie** - Postupné zobrazovanie s delay 0.2s, 0.4s, 0.6s, 0.8s
- **Elastické efekty** - Spring physics s bounce 0.6, stiffness 160, damping 10
- **Hover animácie** - Scale 1.03 + y: -5 pre lift efekt
- **Tap feedback** - Scale 0.97 + y: 2 pre stlačenie

### Animačné parametre
- **Spring physics** - Prirodzené pružinové pohyby
- **Bounce efekt** - Realistické odrazy a vibrovanie
- **3D transformácie** - rotateX pre hĺbku
- **Stagger delays** - Postupné zobrazovanie elementov
- **Text animácie** - Samostatné animácie pre text a ikony
