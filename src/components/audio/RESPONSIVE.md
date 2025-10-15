# Responzivní Design Audio Přehrávače

## 🎯 **Responzivní strategie**

Audio přehrávač je nyní plně responzivní a přizpůsobuje se všem velikostem obrazovek.

### 📱 **Mobile First Approach**

#### **Viewport Units (vw/vh)**
- **Hlavní kontejner**: `w-[90vw] h-[90vw]` - 90% viewport šířky
- **Progress kruh**: `w-[70vw] h-[70vw]` - 70% viewport šířky
- **Play button**: `w-[15vw] h-[15vw]` - 15% viewport šířky
- **Skip buttony**: `w-[10vw] h-[10vw]` - 10% viewport šířky

#### **Breakpoint System**
```css
/* Mobile (default) */
w-[90vw] h-[90vw]

/* Small screens (sm: 640px+) */
sm:w-[600px] sm:h-[600px]

/* Large screens (lg: 1024px+) */
lg:w-[600px] lg:h-[600px]
```

### 🔧 **Komponenty s responzivitou**

#### **AudioPlayer (hlavní kontejner)**
```jsx
className="w-[90vw] h-[90vw] max-w-[600px] max-h-[600px] min-w-[320px] min-h-[320px]"
```
- **90vw** - 90% viewport šířky na mobilech
- **max-w-[600px]** - maximálně 600px na větších obrazovkách
- **min-w-[320px]** - minimálně 320px (nejmenší mobily)

#### **CircularProgress**
```jsx
className="w-[70vw] h-[70vw] max-w-[480px] max-h-[480px] min-w-[240px] min-h-[240px]"
```
- **70vw** - 70% viewport šířky
- **max-w-[480px]** - maximálně 480px
- **min-w-[240px]** - minimálně 240px

#### **PlayPauseButton**
```jsx
className="w-[15vw] h-[15vw] max-w-[80px] max-h-[80px] min-w-[60px] min-h-[60px]"
```
- **15vw** - 15% viewport šířky
- **max-w-[80px]** - maximálně 80px
- **min-w-[60px]** - minimálně 60px

#### **SkipButton**
```jsx
className="w-[10vw] h-[10vw] max-w-[48px] max-h-[48px] min-w-[40px] min-h-[40px]"
```
- **10vw** - 10% viewport šířky
- **max-w-[48px]** - maximálně 48px
- **min-w-[40px]** - minimálně 40px

### 📏 **Responzivní pozicování**

#### **Absolutní pozice s viewport jednotkami**
```jsx
// Header
className="absolute top-[4vw] sm:top-8"

// Skip buttony
className="ml-[8vw] sm:ml-8"
className="mr-[8vw] sm:mr-8"

// Current time
className="mb-[8vw] sm:mb-8"

// Close button
className="bottom-[4vw] sm:bottom-8"
```

#### **Responzivní text**
```jsx
// Hlavní nadpis
className="text-[4vw] sm:text-xl lg:text-lg"

// Sekundární text
className="text-[3vw] sm:text-sm lg:text-xs"
```

### 🎨 **Responzivní ikony**

#### **SkipButton ikony**
```jsx
<IconComponent className="w-[80%] h-[80%] text-black" />
```
- **80%** - ikona zabírá 80% tlačítka
- **Automatické přizpůsobení** - ikona se přizpůsobí velikosti tlačítka

### 📱 **Testování na různých zařízeních**

#### **iPhone SE (375px)**
- Přehrávač: `337px x 337px`
- Progress: `262px x 262px`
- Play button: `56px x 56px`

#### **iPhone 12 (390px)**
- Přehrávač: `351px x 351px`
- Progress: `273px x 273px`
- Play button: `58px x 58px`

#### **iPad (768px)**
- Přehrávač: `600px x 600px` (max-width)
- Progress: `480px x 480px` (max-width)
- Play button: `80px x 80px` (max-width)

#### **Desktop (1024px+)**
- Přehrávač: `600px x 600px` (max-width)
- Progress: `480px x 480px` (max-width)
- Play button: `80px x 80px` (max-width)

### 🔍 **Responzivní breakpointy**

```css
/* Tailwind CSS breakpoints */
sm: 640px   /* Small screens */
md: 768px   /* Medium screens */
lg: 1024px  /* Large screens */
xl: 1280px  /* Extra large screens */
2xl: 1536px /* 2X large screens */
```

### ✅ **Výhody responzivního designu**

1. **Mobile First** - optimalizováno pro mobily
2. **Viewport Units** - přizpůsobuje se velikosti obrazovky
3. **Breakpoint System** - plynulé přechody mezi velikostmi
4. **Min/Max Constraints** - zabrání příliš malým/velkým prvkům
5. **Touch Friendly** - dostatečně velké tlačítka na mobilech
6. **Performance** - CSS-only řešení, žádný JavaScript

### 🚀 **Výsledek**

- ✅ **Plně responzivní** na všech zařízeních
- ✅ **Touch friendly** - dostatečně velké prvky
- ✅ **Přesný kruh** - zachován na všech velikostech
- ✅ **Plynulé přechody** - mezi breakpointy
- ✅ **Performance** - CSS-only řešení
- ✅ **Accessibility** - dostatečné velikosti pro touch

Přehrávač se nyní perfektně přizpůsobuje všem velikostem obrazovek! 📱💻🖥️
