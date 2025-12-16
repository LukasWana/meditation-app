# Responzivní Breakpointy

Tento dokument popisuje systém breakpointů používaných v aplikaci.

## Tailwind CSS Breakpointy

Aplikace používá standardní Tailwind CSS breakpointy:

```css
sm:  640px   /* Small screens - tablety na šířku */
md:  768px   /* Medium screens - tablety */
lg:  1024px  /* Large screens - notebooky */
xl:  1280px  /* Extra large screens - desktop */
2xl: 1536px  /* 2X large screens - velké monitory */
```

## Použití

### Mobile First Approach

Vždy začněte s mobile verzí a přidávejte breakpointy pro větší obrazovky:

```jsx
// Mobile first - základní styly pro mobile
<div className="text-base p-4">
  {/* sm: - od 640px */}
  <div className="sm:text-lg sm:p-8">
    {/* lg: - od 1024px */}
    <div className="lg:text-xl lg:p-12">
      Obsah
    </div>
  </div>
</div>
```

### Viewport Units

Pro responzivní velikosti používejte viewport jednotky:

```jsx
// 90% viewport šířky na mobile, max 600px na větších obrazovkách
<div className="w-[90vw] max-w-[600px]">
  {/* 70% viewport šířky na mobile, max 480px na větších */}
  <div className="w-[70vw] max-w-[480px]">
    Obsah
  </div>
</div>
```

### Responzivní Text

Pro responzivní text používejte `clamp()` nebo Tailwind responsive třídy:

```jsx
// Tailwind responsive
<div className="text-sm sm:text-base lg:text-lg">
  Text
</div>

// CSS clamp (v index.css)
<div className="text-clamp-title">
  Nadpis
</div>
```

## Praktické Příklady

### HomeScreen Sekce

```jsx
<div className="flex-1 flex items-center justify-center">
  <div className="text-center px-2 sm:px-8 py-4">
    <div className="text-5xl font-light">
      Nadpis
    </div>
  </div>
</div>
```

### Audio Player

```jsx
// Hlavní kontejner
<div className="w-[90vw] h-[90vw] max-w-[600px] max-h-[600px]">
  {/* Progress kruh */}
  <div className="w-[70vw] h-[70vw] max-w-[480px] max-h-[480px]">
    {/* Play button */}
    <button className="w-[15vw] h-[15vw] max-w-[80px] max-h-[80px]">
      Play
    </button>
  </div>
</div>
```

### Pozicování

```jsx
// Absolutní pozice s viewport jednotkami
<div className="absolute top-[4vw] sm:top-8">
  Header
</div>

<div className="mb-[8vw] sm:mb-8">
  Footer
</div>
```

## Testování

### Doporučené velikosti pro testování:

- **Mobile**: 375px (iPhone SE), 390px (iPhone 12)
- **Tablet**: 768px (iPad)
- **Desktop**: 1024px, 1280px, 1920px

### Chrome DevTools

Použijte Chrome DevTools pro testování různých velikostí:
1. Otevřete DevTools (F12)
2. Klikněte na ikonu zařízení (Ctrl+Shift+M)
3. Vyberte zařízení nebo nastavte vlastní velikost

## Best Practices

1. **Mobile First**: Vždy začněte s mobile verzí
2. **Viewport Units**: Používejte vw/vh pro responzivní velikosti
3. **Max Width**: Nastavte max-width pro větší obrazovky
4. **Min Width**: Nastavte min-width pro nejmenší zařízení
5. **Touch Friendly**: Zajistěte dostatečně velké tlačítka (min 44x44px)

## Poznámky

- `100dvh` se používá místo `100vh` pro lepší podporu mobilních prohlížečů
- Safe area insets (`env(safe-area-inset-bottom)`) se používají pro iOS zařízení
- Všechny breakpointy jsou definovány v `tailwind.config.js`

