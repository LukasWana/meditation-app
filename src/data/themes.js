// Definice dostupných vizuálních stylů aplikace

export const THEMES = [
  {
    id: 'chill-coffee',
    name: {
      SK: 'Kluď&káva',
      CZ: 'Klid&káva',
      EN: 'Chill&coffee'
    },
    colors: {
      primary: 'rgb(244, 197, 170)',      // Teplá béžová
      secondary: 'rgba(0, 0, 0, 1)',    // Černá
      background: 'rgba(244, 221, 196, 1)',   // Teplá béžová
      card: 'rgba(255, 255, 255, 1)',         // Bílá
      text: 'rgba(0, 0, 0, 1)',         // Černá
      textSecondary: 'rgba(102, 102, 102, 1)', // Šedá
      border: 'rgba(0, 0, 0, 0.1)', // Lehký border
      progressIndicator: 'rgba(50, 205, 50, 1)', // Barva ukazatele času kruhového přehrávače
      timeIndicator: 'rgba(0, 0, 0, 1)' // Barva textu času pod kruhovým přehrávačem
    },
    allowsCustomBackground: false,
    fontFamily: "'Petrona', serif",
    useRoundedStyle: false
  },
  {
    id: 'calma',
    name: {
      SK: 'Calma',
      CZ: 'Calma',
      EN: 'Calma'
    },
    colors: {
      primary: 'rgba(42, 112, 212, 1)',      // Světle modrá
      secondary: 'rgba(42, 195, 212, 1)',    // Střední modrá
      background: 'rgba(16, 41, 82, 1)',   // Bílá
      card: 'rgb(22, 18, 63)',         // Bílá s backdrop-blur
      text: 'rgba(255, 255, 255, 1)',         // Tmavě šedá
      textSecondary: 'rgb(199, 199, 199)', // Střední šedá
      accent1: 'rgba(200, 230, 201, 1)',      // Světle zelená
      accent2: 'rgba(255, 204, 128, 1)',      // Světle oranžová
      accent3: 'rgba(248, 187, 208, 1)',      // Světle růžová
      border: 'rgba(0, 0, 0, 0.1)', // Lehký border
      progressIndicator: 'rgba(74, 144, 164, 1)', // Barva ukazatele času kruhového přehrávače (modrá)
      timeIndicator: 'rgb(214, 214, 214)' // Barva textu času pod kruhovým přehrávačem
    },
    allowsCustomBackground: true, // Tento styl umožňuje vlastní pozadí
    fontFamily: "'Inter', sans-serif",
    useRoundedStyle: false // Pro barevná témata bez kulatého stylu
  },
  {
    id: 'dreamy-lavender',
    name: {
      SK: 'Snová levanduľa',
      CZ: 'Snová levandule',
      EN: 'Dreamy lavender'
    },
    colors: {
      primary: 'rgba(200, 180, 230, 1)',      // Světle fialová (lavender)
      secondary: 'rgba(230, 200, 240, 1)',    // Jemná růžovo-fialová
      background: 'rgba(245, 240, 255, 1)',   // Velmi světlé fialové pozadí (gradient nahoře)
      card: 'rgba(255, 255, 255, 0.95)',      // Bílá s lehkou průhledností
      text: 'rgba(60, 40, 80, 1)',            // Tmavě fialová pro text
      textSecondary: 'rgba(120, 100, 140, 1)', // Střední fialová pro sekundární text
      accent1: 'rgba(255, 200, 220, 1)',      // Světle růžová
      accent2: 'rgba(200, 220, 255, 1)',      // Světle modrá
      accent3: 'rgba(240, 210, 250, 1)',      // Jemná fialová
      border: 'rgba(200, 180, 230, 0.3)',     // Lehký fialový border
      progressIndicator: 'rgba(180, 150, 220, 1)', // Fialová pro progress
      timeIndicator: 'rgba(80, 60, 100, 1)'   // Tmavší fialová pro čas
    },
    allowsCustomBackground: true,
    fontFamily: "'Montserrat', sans-serif",
    useRoundedStyle: false
  },
  {
    id: 'soft-pastels',
    name: {
      SK: 'Jemné pastely',
      CZ: 'Jemné pastely',
      EN: 'Soft pastels'
    },
    colors: {
      primary: 'rgba(200, 180, 230, 1)',      // Světle fialová (lavender)
      secondary: 'rgba(255, 200, 220, 1)',    // Světle růžová
      background: 'rgba(250, 245, 255, 1)',   // Velmi světlé fialové pozadí (gradient nahoře)
      card: 'rgba(255, 255, 255, 0.9)',       // Bílá s lehkou průhledností
      text: 'rgba(80, 60, 100, 1)',           // Tmavě fialová pro text
      textSecondary: 'rgba(140, 120, 160, 1)', // Střední fialová pro sekundární text
      accent1: 'rgba(255, 200, 220, 1)',      // Světle růžová
      accent2: 'rgba(200, 220, 255, 1)',      // Světle modrá
      accent3: 'rgba(240, 210, 250, 1)',      // Jemná fialová
      border: 'rgba(200, 180, 230, 0.25)',    // Lehký fialový border
      progressIndicator: 'rgba(200, 180, 230, 0.8)', // Fialová pro progress
      timeIndicator: 'rgba(80, 60, 100, 1)'   // Tmavší fialová pro čas
    },
    allowsCustomBackground: true,
    fontFamily: "'Quicksand', sans-serif",
    useRoundedStyle: true // Pro barevná témata s kulatým stylem (Quicksand je kulatý font)
  }

];

// Defaultní styl (fallback)
export const DEFAULT_THEME_ID = 'chill-coffee';

// Funkce pro získání tématu podle ID
export const getThemeById = (themeId) => {
  return THEMES.find(theme => theme.id === themeId) || THEMES.find(theme => theme.id === DEFAULT_THEME_ID);
};

// Funkce pro získání názvu tématu v daném jazyce
export const getThemeName = (theme, language = 'SK') => {
  return theme?.name?.[language] || theme?.name?.SK || theme?.id || '';
};

