# Style Guide

Tento dokument popisuje konvence a best practices pro stylování v aplikaci.

## Architektura Stylů

### 1. Tailwind CSS

Primární systém pro stylování. Používejte utility třídy místo inline stylů, když je to možné.

```jsx
// ✅ Dobře
<div className="flex items-center justify-center p-4 bg-white rounded-lg">

// ❌ Špatně
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'white', borderRadius: '8px' }}>
```

### 2. Inline Styly

Používejte pouze pro dynamické hodnoty (barvy z tématu, velikosti z props):

```jsx
// ✅ Dobře - dynamická barva z tématu
<div style={{ backgroundColor: getScreenBackgroundColor() }}>

// ❌ Špatně - statická hodnota
<div style={{ backgroundColor: '#ffffff' }}>
```

### 3. CSS Custom Properties

Pro globální hodnoty používejte CSS custom properties:

```css
/* V ThemeContext se nastavují */
--theme-font-family: 'Petrona', serif;
--theme-color-primary: rgba(244, 221, 196, 1);
--theme-rounded-radius: 12px;
```

## Barvy

### Použití Témat

Vždy používejte barvy z tématu přes `useThemeColors` hook:

```jsx
import { useThemeColors } from '@hooks/useThemeColors';

const MyComponent = () => {
  const { colors, getTextColor, getSectionBackgroundColor } = useThemeColors();

  return (
    <div style={{ backgroundColor: colors.background }}>
      <p style={{ color: getTextColor() }}>
        Text
      </p>
    </div>
  );
};
```

### Color Utils

Pro práci s barvami používejte utility funkce:

```jsx
import { addOpacityToColor, toRgba } from '@utils/colorUtils';

const colorWithOpacity = addOpacityToColor('#ffffff', 0.5);
const rgbaColor = toRgba('#ffffff');
```

## Komponenty

### ThemedContainer

Pro obrazovky s pozadím z tématu:

```jsx
import { ThemedContainer } from '@components';

<ThemedContainer className="min-h-screen">
  Obsah obrazovky
</ThemedContainer>
```

### SectionCard

Pro sekce s automatickým pozadím:

```jsx
import { SectionCard } from '@components';

<SectionCard isPrimary={true} onClick={handleClick}>
  Obsah sekce
</SectionCard>
```

## Z-Index Management

Vždy používejte konstanty z `constants/zIndex.js`:

```jsx
import { Z_INDEX } from '@constants/zIndex';

<div style={{ zIndex: Z_INDEX.MODAL }}>
  Modal
</div>
```

## Animace

### Framer Motion

Pro komplexní animace používejte Framer Motion s konstantami:

```jsx
import { motion } from 'framer-motion';
import { FRAMER_ANIMATIONS } from '@constants/animations';

<motion.div
  initial={FRAMER_ANIMATIONS.FADE_IN.initial}
  animate={FRAMER_ANIMATIONS.FADE_IN.animate}
  transition={FRAMER_ANIMATIONS.FADE_IN.transition}
>
  Obsah
</motion.div>
```

### CSS Transitions

Pro jednoduché přechody používejte CSS třídy:

```jsx
<div className="transition-all duration-300 ease-in-out">
  Obsah
</div>
```

## Rounded Style

Aplikace podporuje dva styly:
- **Rounded**: Kulaté rohy (když `useRoundedStyle: true`)
- **Square**: Hranaté rohy (když `useRoundedStyle: false`)

Styl se aplikuje automaticky přes `data-rounded-style` atribut.

### Speciální Komponenty

Některé komponenty jsou vždy kulaté:
- `.play-pause-button`
- `.breath-animation-circle`
- `.intro-animation-circle`

## Responzivní Design

### Mobile First

Vždy začněte s mobile verzí:

```jsx
<div className="text-sm p-4 sm:text-base sm:p-8 lg:text-lg lg:p-12">
  Responzivní text a padding
</div>
```

### Viewport Units

Pro responzivní velikosti:

```jsx
<div className="w-[90vw] max-w-[600px] min-w-[320px]">
  Responzivní šířka
</div>
```

Více informací v [BREAKPOINTS.md](./BREAKPOINTS.md).

## Best Practices

### 1. Konzistence

- Používejte stejné utility třídy pro stejné účely
- Dodržujte naming konvence
- Používejte komponenty pro opakující se patterny

### 2. Performance

- Minimalizujte inline styly
- Používejte CSS třídy místo inline stylů pro statické hodnoty
- Optimalizujte animace (používejte `transform` a `opacity`)

### 3. Accessibility

- Zajistěte dostatečný kontrast barev
- Používejte semantické HTML elementy
- Zajistěte touch-friendly velikosti (min 44x44px)

### 4. Maintainability

- Používejte utility hooky (`useThemeColors`)
- Centralizujte konstanty (z-index, animace)
- Dokumentujte komplexní styly

## Příklady

### Kompletní Komponenta

```jsx
import React from 'react';
import { ThemedContainer, SectionCard } from '@components';
import { useThemeColors } from '@hooks/useThemeColors';
import { Z_INDEX } from '@constants/zIndex';

const MyScreen = () => {
  const { getTextColor, colors } = useThemeColors();

  return (
    <ThemedContainer className="min-h-screen p-4">
      <SectionCard
        isPrimary={true}
        className="rounded-lg p-8 mb-4"
        style={{ zIndex: Z_INDEX.BASE }}
      >
        <h1 style={{ color: getTextColor() }} className="text-2xl font-bold">
          Nadpis
        </h1>
        <p style={{ color: colors.textSecondary }} className="text-base mt-2">
          Popis
        </p>
      </SectionCard>
    </ThemedContainer>
  );
};
```

## Nástroje

- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animace
- **CSS Custom Properties**: Dynamické hodnoty
- **useThemeColors Hook**: Práce s barvami tématu

## Další Dokumentace

- [BREAKPOINTS.md](./BREAKPOINTS.md) - Responzivní breakpointy
- [constants/animations.js](./src/constants/animations.js) - Animace konstanty
- [constants/zIndex.js](./src/constants/zIndex.js) - Z-index konstanty
- [utils/colorUtils.js](./src/utils/colorUtils.js) - Color utility funkce

