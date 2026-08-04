# Globální designový systém — plán refaktoru

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Nahradit roztroušené Tailwind utility a inline styly jedním systémem design tokenů s dědičností, aby nadpisy, odsazení, poloměry, barvy i animace byly napříč všemi obrazovkami identické a měnily se z jednoho místa.

**Architecture:** Tři vrstvy, každá dědí z té pod sebou. (1) *Primitivní tokeny* — statické CSS custom properties v `:root` (typografická škála, spacing, doby trvání, easing). (2) *Sémantické tokeny* — barvy, poloměry a font, které za běhu vstřikuje `ThemeContext` (mechanismus už existuje, jen se rozšíří). (3) *Komponentní třídy* v `@layer components` + tenké React primitivy (`Heading`, `Section`, `Card`, `Button`), které tokeny konzumují. Obrazovky přestanou nést velikosti a barvy samy — dostanou je děděním. Regresi hlídá test, který spadne, jakmile někdo znovu napíše velikost přímo na nadpis.

**Tech Stack:** React 18, Tailwind CSS 3.4.18 (ne v4 — syntaxe configu je stará), framer-motion 12, Vite 7, Vitest 4. Fonty přes `@fontsource` (Petrona, Quicksand, Inter, Montserrat).

---

## Kontext, který musíš znát než začneš

Tohle je meditační aplikace. Vizuální klid je součást produktu — animace jsou proto záměrně jemné (většina přechodů je čistý `opacity` fade, žádné posuny). **Nepřidávej efekty navíc.** Cílem je sjednotit, co existuje, ne to ozvláštnit.

Čtyři věci, které tě jinak překvapí:

1. **`ThemeContext.jsx` (873 řádků) vstřikuje CSS proměnné za běhu** přes `root.style.setProperty()` (řádky 419–695). Uživatel si přepíná motivy, takže barvy a poloměry **nemohou** být natvrdo v `index.css`. Statické je jen to, co na motivu nezávisí.

2. **`ThemeContext` používá `!important`** na `font-family` a `color` (řádky 456–467), a to na `body`, `documentElement` i `#root`. To aktivně rozbíjí dědičnost — je to obcházka, ne záměr. Řeší se až v Tasku 8, ne dřív.

3. **Animace jsou ve dvou souborech**, které si konkurují: `src/config/animations.js` (85 ř., framer varianty) a `src/constants/animations.js` (59 ř., CSS timing + framer springs). Task 2 je sloučí.

4. **Testy musí zůstat zelené.** Aktuálně 247/247. Po každém tasku spusť `npm run test:run`. Lint je taktéž na nule chyb a `--max-warnings 0`, takže jakýkoli nepoužitý import shodí i pre-commit hook.

### Co konkrétně je rozbité

```
<h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', … }}>  ← 6× zkopírováno
<h1 className="text-2xl font-light mb-4">
<h1 className="text-4xl sm:text-6xl font-light mb-4">
<h1 className="text-6xl font-light text-center">
<h1 className="text-2xl font-bold">
```

Pět velikostí `h1`, dvě váhy písma. Četnost utility tříd v `src/`: `text-sm` 135×, `text-xs` 50×, `text-lg` 47×, `text-2xl` 32×, `text-xl` 18×, `text-4xl` 15×, `text-3xl` 11×, `text-base` 9×, `text-6xl` 7×, `text-5xl` 6×. Sémantické tagy naštěstí existují (`h1` 14×, `h2` 11×, `h3` 42×, `h4` 4×), takže je na čem stavět.

---

## Task 1: Vrstva primitivních tokenů

**Files:**
- Modify: `src/index.css` (vlož za `@tailwind utilities;`, tedy za řádek 5)
- Modify: `tailwind.config.js`

**Step 1: Přidej blok tokenů do `src/index.css`**

Vlož hned za `@tailwind utilities;`:

```css
/* ============================================
   DESIGN TOKENY — jediný zdroj pravdy
   Barvy, poloměry a font zde NEJSOU: ty vstřikuje
   ThemeContext za běhu podle zvoleného motivu.
   ============================================ */
:root {
  /* Typografická škála — fluidní, aby seděla na mobil i tablet.
     clamp(min, preferováno, max) */
  --font-size-display: clamp(2.5rem, 8vw, 3.75rem);
  --font-size-h1:      clamp(1.75rem, 5vw, 2.25rem);
  --font-size-h2:      clamp(1.375rem, 4vw, 1.5rem);
  --font-size-h3:      1.125rem;
  --font-size-body:    1rem;
  --font-size-small:   0.875rem;
  --font-size-caption: 0.75rem;

  /* Váhy — aplikace používá lehký řez, tučné jen výjimečně */
  --font-weight-light:   300;
  --font-weight-regular: 400;
  --font-weight-medium:  500;

  /* Výška řádku a prostrkání */
  --line-height-tight:   1.15;
  --line-height-heading: 1.25;
  --line-height-body:    1.6;
  --tracking-display: -0.02em;
  --tracking-heading: -0.01em;
  --tracking-caption: 0.04em;

  /* Spacing — 4px základ */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;

  /* Rytmus nadpisů — mezera pod nadpisem, jednotná */
  --heading-margin-bottom: var(--space-6);
  /* Minimální výška nadpisu; drží layout při změně textu.
     Nahrazuje zkopírovaný inline minHeight: 2.5rem */
  --heading-min-height: 2.5rem;

  /* Pohyb */
  --duration-fast:   150ms;
  --duration-normal: 250ms;
  --duration-slow:   400ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out:      cubic-bezier(0, 0, 0.2, 1);

  /* Šířka obsahu — odpovídá .app-content-container */
  --content-max-width: 650px;
}

/* Respektuj systémové nastavení. U meditační aplikace to není
   volitelné — vestibulární poruchy jsou reálné. */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
  }
}
```

**Step 2: Zpřístupni tokeny Tailwindu**

Nahraď `theme.extend` v `tailwind.config.js`. Klíče `fontFamily` a `borderRadius` **ponech beze změny** — na těch stojí přepínání motivů:

```js
theme: {
  extend: {
    fontFamily: {
      'petrona': ['Petrona', 'serif'],
      'sans': ['Petrona', 'serif'],
    },
    borderRadius: {
      'theme-card': 'var(--radius-card)',
      'theme-inner': 'var(--radius-inner)',
      'theme-button': 'var(--radius-button)',
      'theme-full': 'var(--radius-full)',
    },
    fontSize: {
      'display': ['var(--font-size-display)', { lineHeight: 'var(--line-height-tight)', letterSpacing: 'var(--tracking-display)' }],
      'h1':      ['var(--font-size-h1)',      { lineHeight: 'var(--line-height-heading)', letterSpacing: 'var(--tracking-heading)' }],
      'h2':      ['var(--font-size-h2)',      { lineHeight: 'var(--line-height-heading)', letterSpacing: 'var(--tracking-heading)' }],
      'h3':      ['var(--font-size-h3)',      { lineHeight: 'var(--line-height-heading)' }],
      'body':    ['var(--font-size-body)',    { lineHeight: 'var(--line-height-body)' }],
      'small':   ['var(--font-size-small)',   { lineHeight: 'var(--line-height-body)' }],
      'caption': ['var(--font-size-caption)', { lineHeight: 'var(--line-height-body)', letterSpacing: 'var(--tracking-caption)' }],
    },
    transitionDuration: {
      'fast': 'var(--duration-fast)',
      'normal': 'var(--duration-normal)',
      'slow': 'var(--duration-slow)',
    },
    maxWidth: {
      'content': 'var(--content-max-width)',
    },
  },
},
```

**Step 3: Ověř, že build prochází a nic se vizuálně nerozbilo**

```bash
npm run build
```
Očekávané: build projde. Zatím se **nic nemá změnit** — jen jsme přidali tokeny, nikdo je nepoužívá.

**Step 4: Commit**

```bash
git add src/index.css tailwind.config.js
git commit -m "feat(design): pridat vrstvu design tokenu a napojit ji na Tailwind"
```

---

## Task 2: Sloučit dva animační soubory do jednoho

**Files:**
- Create: `src/config/motion.js`
- Delete: `src/config/animations.js`, `src/constants/animations.js`
- Modify: všechny soubory, které z nich importují

**Step 1: Zjisti, kdo je importuje**

```bash
grep -rn "config/animations\|constants/animations" src --include=*.js --include=*.jsx
```
Ten seznam si ulož — projdeš ho ve Stepu 3.

**Step 2: Vytvoř `src/config/motion.js`**

Přenes reálný obsah obou souborů. Níže je kostra — hodnoty ber z originálů, ať se pohyb nezmění:

```js
/**
 * Pohyb a přechody — jediný zdroj pravdy.
 * Doby trvání zrcadlí CSS tokeny v index.css (--duration-*),
 * aby se CSS přechody a framer-motion nerozešly.
 *
 * Nahrazuje původní src/config/animations.js a src/constants/animations.js.
 */

export const DURATION = { fast: 0.15, normal: 0.25, slow: 0.4 };
export const EASE = { standard: [0.4, 0, 0.2, 1], out: [0, 0, 0.2, 1] };

export const SPRING = {
  default: { type: 'spring', stiffness: 300, damping: 30 },
  gentle:  { type: 'spring', stiffness: 200, damping: 25 },
  stiff:   { type: 'spring', stiffness: 400, damping: 35 },
};

/** Přechod mezi obrazovkami — záměrně čistý fade, bez posunů. */
export const screenTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
  transition: { duration: DURATION.normal, ease: EASE.standard },
};

/** Nástup nadpisu. Používá výhradně <Heading>, aby byl všude stejný. */
export const headingEntrance = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: DURATION.normal, ease: EASE.out },
};

/** Postupný nástup seznamu. Rodič dostane stagger, potomci item. */
export const stagger = {
  container: { animate: { transition: { staggerChildren: 0.05 } } },
  item: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: DURATION.fast } },
  },
};
```

> **Pozor:** `prefers-reduced-motion` řeší CSS tokeny automaticky, ale framer-motion o nich neví. V `Task 4` proto `<Heading>` použije hook `useReducedMotion()` z framer-motion.

**Step 3: Přepiš importy**

Projdi seznam ze Stepu 1 a přesměruj každý import na `@config/motion`. Alias `@config` už existuje ve `vite.config.mjs`. Kde se název exportu změnil, sjednoť ho podle nového souboru.

**Step 4: Smaž staré soubory a ověř**

```bash
git rm src/config/animations.js src/constants/animations.js
npm run lint:app
npm run test:run
```
Očekávané: lint 0 chyb, testy 247/247. Pokud lint hlásí nepoužitý import, dočistil jsi špatně.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(motion): slouceni dvou animacnich souboru do src/config/motion.js"
```

---

## Task 3: Komponentní třídy v `@layer components`

**Files:**
- Modify: `src/index.css`

**Step 1: Přidej vrstvu komponent na konec `src/index.css`**

```css
@layer components {
  /* ---- Typografie ----
     Barvu ani font-family zde nenastavujeme — dědí se z <html>,
     kam je vkládá ThemeContext podle motivu. */

  .text-display {
    font-size: var(--font-size-display);
    line-height: var(--line-height-tight);
    letter-spacing: var(--tracking-display);
    font-weight: var(--font-weight-light);
    text-wrap: balance;
  }

  .heading-1 {
    font-size: var(--font-size-h1);
    line-height: var(--line-height-heading);
    letter-spacing: var(--tracking-heading);
    font-weight: var(--font-weight-light);
    min-height: var(--heading-min-height);
    margin-bottom: var(--heading-margin-bottom);
    display: flex;
    align-items: center;
    text-wrap: balance;
  }

  .heading-2 {
    font-size: var(--font-size-h2);
    line-height: var(--line-height-heading);
    letter-spacing: var(--tracking-heading);
    font-weight: var(--font-weight-light);
    margin-bottom: var(--space-4);
    text-wrap: balance;
  }

  .heading-3 {
    font-size: var(--font-size-h3);
    line-height: var(--line-height-heading);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--space-3);
  }

  .text-caption {
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caption);
    opacity: 0.7;
  }

  /* ---- Povrchy ----
     Poloměry berou z proměnných ThemeContextu, takže reagují
     na přepnutí "zaobleného" stylu. */
  .surface-card {
    border-radius: var(--radius-card);
    padding: var(--space-4);
  }

  .surface-inner {
    border-radius: var(--radius-inner);
    padding: var(--space-3);
  }

  /* ---- Interaktivní prvky ---- */
  .interactive {
    transition: transform var(--duration-fast) var(--ease-standard),
                opacity   var(--duration-fast) var(--ease-standard);
  }
  .interactive:active { transform: scale(0.97); }

  /* Viditelný focus ring pro klávesnici. Chybí v celé aplikaci. */
  .interactive:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
}
```

**Step 2: Ověř**

```bash
npm run build
```
Očekávané: projde. Třídy zatím nikdo nepoužívá, vizuálně beze změny.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(design): komponentni tridy pro typografii, povrchy a interakce"
```

---

## Task 4: Primitiv `<Heading>`

Tohle je jádro celého plánu. Jakmile existuje, přestane dávat smysl psát velikost na nadpis ručně.

**Files:**
- Create: `src/components/ui/Heading.jsx`
- Create: `src/components/ui/index.js`
- Test: `src/tests/components/Heading.test.jsx`

**Step 1: Napiš padající test**

`src/tests/components/Heading.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Heading } from '@components/ui/Heading';

describe('Heading', () => {
  it('renderuje h1 s tridou heading-1 pro level 1', () => {
    render(<Heading level={1}>Meditace</Heading>);
    const el = screen.getByRole('heading', { level: 1 });
    expect(el).toHaveClass('heading-1');
  });

  it('renderuje spravny tag podle levelu', () => {
    render(<Heading level={3}>Podnadpis</Heading>);
    expect(screen.getByRole('heading', { level: 3 }).tagName).toBe('H3');
  });

  it('umoznuje vizualni styl odlisny od semantickeho levelu', () => {
    render(<Heading level={2} visual="display">Velky</Heading>);
    const el = screen.getByRole('heading', { level: 2 });
    expect(el.tagName).toBe('H2');
    expect(el).toHaveClass('text-display');
  });

  it('pripoji vlastni className, aniz by zahodil zakladni tridu', () => {
    render(<Heading level={1} className="text-center">X</Heading>);
    const el = screen.getByRole('heading', { level: 1 });
    expect(el).toHaveClass('heading-1');
    expect(el).toHaveClass('text-center');
  });
});
```

**Step 2: Spusť test, ověř že padá**

```bash
npx vitest run src/tests/components/Heading.test.jsx
```
Očekávané: FAIL — `Failed to resolve import "@components/ui/Heading"`.

**Step 3: Implementuj**

`src/components/ui/Heading.jsx`:

```jsx
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { headingEntrance } from '@config/motion';

const VISUAL_CLASS = {
  display: 'text-display',
  1: 'heading-1',
  2: 'heading-2',
  3: 'heading-3',
  4: 'heading-3',
};

/**
 * Jednotný nadpis pro celou aplikaci.
 *
 * `level` řídí sémantiku (h1–h4), `visual` volitelně vzhled — díky tomu
 * jde mít správnou strukturu dokumentu i tam, kde návrh chce jinou velikost.
 * Velikost, váhu ani rytmus nepředávej přes className; patří do tokenů.
 *
 * `animate={false}` vypne nástupní animaci tam, kde se nadpis často
 * překresluje (např. odpočet), aby neproblikával.
 */
export const Heading = ({
  level = 1,
  visual,
  className = '',
  animate = true,
  children,
  ...rest
}) => {
  const Tag = `h${level}`;
  const base = VISUAL_CLASS[visual ?? level] ?? VISUAL_CLASS[1];
  const classes = `${base} ${className}`.trim();
  const reduceMotion = useReducedMotion();

  if (!animate || reduceMotion) {
    return <Tag className={classes} {...rest}>{children}</Tag>;
  }

  const MotionTag = motion[Tag];
  return (
    <MotionTag className={classes} {...headingEntrance} {...rest}>
      {children}
    </MotionTag>
  );
};

export default Heading;
```

`src/components/ui/index.js`:

```js
export { Heading } from './Heading';
```

**Step 4: Spusť test, ověř že prochází**

```bash
npx vitest run src/tests/components/Heading.test.jsx
```
Očekávané: PASS, 4 testy.

**Step 5: Commit**

```bash
git add src/components/ui src/tests/components/Heading.test.jsx
git commit -m "feat(ui): primitiv Heading se sjednocenou skalou a nastupni animaci"
```

---

## Task 5: Primitivy `<Section>`, `<Card>`, `<Button>`

**Files:**
- Create: `src/components/ui/Section.jsx`, `Card.jsx`, `Button.jsx`
- Modify: `src/components/ui/index.js`
- Test: `src/tests/components/ui.test.jsx`

**Step 1: Napiš padající testy** — pro každý primitiv ověř, že sedí základní třída a že `className` se připojuje, ne přepisuje. Stejný vzor jako u `Heading`.

**Step 2: Ověř, že padají**

```bash
npx vitest run src/tests/components/ui.test.jsx
```

**Step 3: Implementuj**

`Card.jsx` — obal nad `.surface-card`, prop `variant` (`card` | `inner`).
`Section.jsx` — `<section>` s `.max-w-content` a jednotným svislým rytmem, volitelně `<Heading>` v hlavičce.
`Button.jsx` — `.interactive` + `rounded-theme-button`, varianty `primary` / `ghost` / `text`. Barvy ber z proměnných motivu, nezadávej je natvrdo.

Před psaním `Button.jsx` si projdi `src/components/FramerButton.jsx` — část logiky už tam je. Pokud se překrývá, `FramerButton` přepiš tak, aby stavěl na novém `Button`, ať nevzniknou dvě tlačítka vedle sebe.

**Step 4: Testy zelené, pak commit**

```bash
npm run test:run
git add src/components/ui src/tests/components/ui.test.jsx
git commit -m "feat(ui): primitivy Section, Card a Button nad design tokeny"
```

---

## Task 6: Test, který hlídá regresi

Bez něj se to za měsíc rozpatlá zpátky. Tenhle test je vlastní důvod, proč refaktor vydrží.

**Files:**
- Test: `src/tests/design-system.guard.test.js`

**Step 1: Napiš test**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Hlídá, aby se velikosti písma nevracely přímo do JSX.
 * Když test spadne, NEPŘIDÁVEJ výjimku — použij <Heading> nebo token.
 */

// Pozor: na Windows vrací new URL(...).pathname tvar "/C:/…", který
// path.resolve rozbije. fileURLToPath to řeší korektně na všech OS.
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// readdirSync({recursive}) je dostupné od Node 18.17 a na rozdíl od
// fs.globSync (Node 22+) nezávisí na novější verzi runtime.
const files = readdirSync(SRC, { recursive: true })
  .map((f) => String(f).split(path.sep).join('/'))
  .filter((f) => f.endsWith('.jsx') && !f.startsWith('tests/'))
  .map((f) => path.join(SRC, f));

// Velikostní utility na sémantickém nadpisu
const HEADING_WITH_SIZE = /<h[1-6][^>]*className="[^"]*\btext-(xs|sm|base|lg|xl|[2-9]xl)\b/;
// Inline fontSize
const INLINE_FONT_SIZE = /style=\{\{[^}]*fontSize/;

describe('guard designoveho systemu', () => {
  it('zadny nadpis nenese velikostni utility tridu', () => {
    const porusuje = files.filter((f) => HEADING_WITH_SIZE.test(readFileSync(f, 'utf8')));
    expect(porusuje.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('zadny komponent nenastavuje fontSize inline', () => {
    const porusuje = files.filter((f) => INLINE_FONT_SIZE.test(readFileSync(f, 'utf8')));
    expect(porusuje.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
```

**Step 2: Spusť — musí spadnout, a to hodně**

```bash
npx vitest run src/tests/design-system.guard.test.js
```
Očekávané: FAIL. Vypíše seznam souborů k migraci. **Ten seznam je tvůj pracovní plán pro Task 7.** Ulož si ho.

**Step 3: Zatím ho označ jako očekávaně padající**

Nechceš mít větev červenou přes celý Task 7. Přidej dočasně `it.fails(...)` nebo `describe.skip` s komentářem `// TODO(Task 7): odstranit skip až doběhne migrace`.

**Step 4: Commit**

```bash
git add src/tests/design-system.guard.test.js
git commit -m "test(design): guard proti navratu velikosti pisma do JSX"
```

---

## Task 7: Migrace obrazovek

**Ověřený rozsah** (změřeno 2026-08-04 regexy z Tasku 6 na aktuálním kódu):

| Co | Kolik |
|---|---|
| `.jsx` souborů v `src/` celkem | 85 |
| z toho s nadpisem nesoucím velikostní třídu | **32** |
| z toho s inline `fontSize` | **2** (`components/Dropdown.jsx`, `features/meditation/screens/IntroScreen.jsx`) |

Migruješ tedy zhruba třetinu komponent. Zbylých 53 souborů se nedotýkej — nadpisy v nich buď nejsou, nebo velikost nenesou.

**Nedělej to jedním commitem.** Ber to po dávkách, aby šlo případný problém odrolovat.

**Pořadí dávek** — od nejmenšího rizika:

1. `src/features/meditation/screens/` — nejvíc kopírovaných `h1`
2. `src/features/audio/components/`
3. `src/features/meditation/components/`
4. `src/components/` (kořen)
5. `src/components/admin/` — nejnižší priorita, vidí to jen admin

**Postup pro každý soubor:**

Náhrada nejčastějšího vzoru:

```jsx
// PŘED
<h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  {title}
</h1>

// PO
<Heading level={1} className="justify-center">{title}</Heading>
```

`minHeight`, `display: flex` i `align-items` jsou už v `.heading-1`. Z inline stylu zůstane jen to, co je pro dané místo opravdu specifické.

Barvu textu (`style={{ color: displayTextColor }}`) **zatím nech být** — řeší se v Tasku 8.

**Po každé dávce:**

```bash
npm run lint:app
npm run test:run
git add -A
git commit -m "refactor(ui): migrace <nazev-davky> na Heading a design tokeny"
```

**Na konci Tasku 7** odstraň `skip` z guard testu (Task 6, Step 3) a ověř:

```bash
npm run test:run
```
Očekávané: 247+ testů zelených **včetně** guard testu.

---

## Task 8: Odstranit `!important` z ThemeContextu

Až teď — dřív by se rozbil vzhled, protože obrazovky si barvu nesly samy.

**Files:**
- Modify: `src/contexts/ThemeContext.jsx:456-467`

**Step 1: Zjisti, proč tam `!important` je**

```bash
git log -S"'important'" --oneline -- src/contexts/ThemeContext.jsx
```
Skoro jistě to byla obcházka proti Tailwind `preflight`, které nastavuje `color` na `body`. Pokud commit message řekne něco jiného, řiď se jím.

**Step 2: Nahraď proměnnými**

Místo `setProperty('color', …, 'important')` na třech elementech nastav jednu proměnnou na `:root`:

```js
root.style.setProperty('--theme-text-color', themeColors.text);
root.style.setProperty('--theme-font-family', fontFamily);
```

A v `index.css` v `@layer base`:

```css
@layer base {
  html {
    color: var(--theme-text-color);
    font-family: var(--theme-font-family);
  }
  body, #root { color: inherit; font-family: inherit; }
}
```

`@layer base` má nižší specificitu než `preflight` řeší korektně, takže `!important` odpadá a dědičnost začne fungovat.

**Step 3: Ověř ručně všechny motivy**

```bash
npm run dev
```
Projdi **každý** motiv v přepínači a v obou režimech (světlý/tmavý). Zkontroluj, že se barva textu propíše i do vnořených komponent. Tohle je jediný task, kde ti testy nestačí — je to vizuální.

**Step 4: Commit**

```bash
git add src/contexts/ThemeContext.jsx src/index.css
git commit -m "refactor(theme): nahradit !important dedicnosti pres CSS promenne"
```

---

## Task 9: Úklid

**Files:** `src/index.css`, `src/data/themes.js`, `src/features/meditation/data/soundThemes.js`

1. Projdi `src/index.css` (626 ř.) a smaž pravidla, která po migraci nikdo nepoužívá. Ověřuj `grep` na název třídy přes celý `src/`, ne od oka.
2. Sjednoť duplicitní `soundThemes.js` (`src/data/` vs `src/features/meditation/data/`) — patří to do bodu P2-19 plánu SUTRA, ale narazíš na to tady.
3. Ověř, že `src/constants/zIndex.js` skutečně používají všechny vrstvy. Volné `z-[9999]` v JSX převeď na ten scale.

```bash
npm run lint:app && npm run test:run && npm run build
git add -A
git commit -m "chore(design): uklid mrtvych stylu po migraci"
```

---

## Definice hotového

- [ ] `npm run test:run` — vše zelené, guard test aktivní (bez skip)
- [ ] `npm run lint:app` — 0 chyb
- [ ] `npm run build` — projde
- [ ] Změna `--font-size-h1` v `index.css` se projeví **na všech** obrazovkách naráz
- [ ] Přepnutí motivu funguje ve všech variantách, včetně tmavého režimu
- [ ] V `src/**/*.jsx` není žádný `<h1>`–`<h6>` s velikostní utility třídou
- [ ] V `src/**/*.jsx` není žádný inline `fontSize`
- [ ] Nadpisy nastupují stejnou animací a ta respektuje `prefers-reduced-motion`

## Čeho se vyvarovat

- **Neměň vizuální podobu.** Cílem je sjednocení, ne redesign. Kde se velikosti liší, vyber tu **nejčastější** jako token — ne tu, která ti přijde hezčí.
- **Nemigruj Tailwind na v4.** Projekt je na 3.4.18 a syntaxe configu je nekompatibilní.
- **Nepřidávej `!important`.** Když něco nepřebíjí, je špatně specificita nebo pořadí vrstev.
- **Nepřidávej výjimky do guard testu.** Když spadne, oprav kód.
- **Nesahej na `useBackgroundAudio.js`, `AudioForegroundService.java` ani `AudioPlugin.java`** — to je živý kód z plánu SUTRA P1.
