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

- **FramerButton** - Animované tlačidlá s spring physics
- **FramerSection** - Sekcie s rôznymi animačnými efektmi
- **FramerMeditationCircle** - Animovaný meditačný kruh
- **FramerPageTransition** - Plynulé prechody medzi obrazovkami
- **BackButton** - Šípka späť vľavo hore s animáciou
