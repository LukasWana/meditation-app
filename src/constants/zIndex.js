/**
 * Centralizovaný systém z-index hodnot
 * Používejte tyto konstanty místo hardcodovaných hodnot
 */
export const Z_INDEX = {
  BASE: 0,
  STICKY: 100,
  DROPDOWN: 1000,
  MODAL: 2000,
  OVERLAY: 3000,
  TOOLTIP: 4000,
  MAX: 9999
};

/**
 * Tailwind utility třídy pro z-index
 */
export const Z_INDEX_CLASSES = {
  DROPDOWN: 'z-[1000]',
  MODAL: 'z-[2000]',
  OVERLAY: 'z-[3000]',
  TOOLTIP: 'z-[4000]',
  MAX: 'z-[9999]'
};

