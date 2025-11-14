/**
 * Centrální konfigurace vzhledu (theme) pro všechny komponenty
 *
 * Tento soubor obsahuje všechny design tokens používané v aplikaci:
 * - Barvy (colors)
 * - Spacing (mezery)
 * - Velikosti (sizes)
 * - Border radius
 * - Typography
 * - Shadows
 * - Opacity hodnoty
 *
 * Všechny komponenty by měly používat tyto hodnoty pro konzistentní vzhled.
 */

// Barvy
export const colors = {
  // Hlavní barvy
  primary: '#f4ddc4',        // Teplá béžová - hlavní pozadí
  secondary: '#000000',      // Černá - sekundární barva
  background: '#f4ddc4',     // Hlavní pozadí aplikace

  // Neutrální barvy
  black: '#000000',
  white: '#ffffff',

  // Gray scale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Blue scale (pro AudioWarning a další komponenty)
  blue: {
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
  },

  // Yellow/Orange scale (pro warning/fallback indikátory)
  yellow: {
    500: '#ff9800',
    600: '#f57c00',
  },

  // Red scale (pro error stavy)
  red: {
    500: '#ef4444',
    600: '#dc2626',
  },

  // Opacity varianty (pro Tailwind)
  overlay: {
    black7: 'rgba(0, 0, 0, 0.07)',
    black10: 'rgba(0, 0, 0, 0.1)',
    black15: 'rgba(0, 0, 0, 0.15)',
    black20: 'rgba(0, 0, 0, 0.2)',
    black50: 'rgba(0, 0, 0, 0.5)',
    black80: 'rgba(0, 0, 0, 0.8)',
    white10: 'rgba(255, 255, 255, 0.1)',
    white20: 'rgba(255, 255, 255, 0.2)',
    white15: 'rgba(255, 255, 255, 0.15)',
    white30: 'rgba(255, 255, 255, 0.3)',
    white40: 'rgba(255, 255, 255, 0.4)',
    white50: 'rgba(255, 255, 255, 0.5)',
    white70: 'rgba(255, 255, 255, 0.7)',
    white80: 'rgba(255, 255, 255, 0.8)',
    white90: 'rgba(255, 255, 255, 0.9)',
    // Primary color overlay (pro gradienty)
    primary30: 'rgba(244, 221, 196, 0.3)',
  },
};

// Spacing (mezery) - v rem jednotkách pro Tailwind
export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px

  // Specifické hodnoty používané v komponentách
  button: {
    px: '1rem',     // px-4
    py: '1.25rem',  // py-5
  },

  card: {
    p: '0.75rem',   // p-3
    pLarge: '1rem', // p-4
  },

  section: {
    gap: '0.5rem',  // gap-2
    gapLarge: '0.75rem', // gap-3
  },
};

// Velikosti komponent
export const sizes = {
  // Button velikosti
  button: {
    minHeight: '3rem',      // min-h-[3rem]
    height: {
      sm: '2.5rem',
      md: '3rem',
      lg: '3.5rem',
    },
  },

  // Icon velikosti (v px pro lucide-react)
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },

  // Card velikosti
  card: {
    minHeight: '200px',
    maxWidth: {
      sm: '24rem',  // max-w-md
      md: '28rem',
      lg: '32rem',
    },
  },

  // Container velikosti
  container: {
    maxWidth: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
};

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px',   // rounded-full
};

// Typography
export const typography = {
  fontFamily: {
    primary: "'Petrona', serif",
    sans: "'Petrona', serif",
  },

  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
  },

  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },

  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
};

// Opacity hodnoty
export const opacity = {
  disabled: 0.5,
  hover: 0.8,
  overlay: 0.5,
  subtle: 0.3,
};

// Z-index vrstvy
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  max: 9999,
};

// Button varianty (CSS třídy)
export const buttonVariants = {
  primary: {
    base: 'bg-black text-white',
    hover: 'hover:bg-gray-800',
    active: 'active:bg-gray-900',
  },

  secondary: {
    base: 'bg-white border-2 border-black text-black',
    hover: 'hover:bg-gray-100',
    active: 'active:bg-gray-200',
  },

  ghost: {
    base: 'bg-transparent border-2 border-black/20 text-black',
    hover: 'hover:bg-black/5 hover:text-black',
    active: 'active:bg-black/10',
  },

  rounded: {
    base: 'bg-black text-white rounded-full',
    hover: 'hover:bg-gray-800',
    active: 'active:bg-gray-900',
  },
};

// Card varianty
export const cardVariants = {
  default: {
    base: 'bg-white/50 backdrop-blur rounded-lg border border-black/10',
    hover: 'hover:bg-white/70',
  },

  solid: {
    base: 'bg-white rounded-lg border border-black/10',
    hover: 'hover:bg-gray-50',
  },

  elevated: {
    base: 'bg-white rounded-lg shadow-md border border-black/10',
    hover: 'hover:shadow-lg',
  },
};

// Hlavní export konfigurace
export const theme = {
  colors,
  spacing,
  sizes,
  borderRadius,
  typography,
  shadows,
  opacity,
  zIndex,
  buttonVariants,
  cardVariants,
};

export default theme;

