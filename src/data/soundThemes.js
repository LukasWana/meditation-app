// Definice zvukových témat s ilustracemi a zvukovými soubory
export const SOUND_THEMES = [
  {
    id: 'ocean',
    name: {
      SK: 'Oceán',
      CZ: 'Oceán',
      EN: 'Ocean'
    },
    illustration: '🌊',
    soundIn: '/sounds/ocean-in.mp3',
    soundOut: '/sounds/ocean-out.mp3',
    description: {
      SK: 'Tichý zvuk vĺn',
      CZ: 'Tichý zvuk vln',
      EN: 'Gentle wave sounds'
    }
  },
  {
    id: 'forest',
    name: {
      SK: 'Les',
      CZ: 'Les',
      EN: 'Forest'
    },
    illustration: '🌲',
    soundIn: '/sounds/forest-in.mp3',
    soundOut: '/sounds/forest-out.mp3',
    description: {
      SK: 'Šum vetra v stromoch',
      CZ: 'Šum větru v stromech',
      EN: 'Wind rustling through trees'
    }
  },
  {
    id: 'rain',
    name: {
      SK: 'Dážď',
      CZ: 'Déšť',
      EN: 'Rain'
    },
    illustration: '🌧️',
    soundIn: '/sounds/rain-in.mp3',
    soundOut: '/sounds/rain-out.mp3',
    description: {
      SK: 'Tichý dážď',
      CZ: 'Tichý déšť',
      EN: 'Gentle rain'
    }
  },
  {
    id: 'fire',
    name: {
      SK: 'Oheň',
      CZ: 'Oheň',
      EN: 'Fire'
    },
    illustration: '🔥',
    soundIn: '/sounds/fire-in.mp3',
    soundOut: '/sounds/fire-out.mp3',
    description: {
      SK: 'Praskanie ohňa',
      CZ: 'Praskání ohně',
      EN: 'Crackling fire'
    }
  },
  {
    id: 'wind',
    name: {
      SK: 'Vietor',
      CZ: 'Vítr',
      EN: 'Wind'
    },
    illustration: '💨',
    soundIn: '/sounds/wind-in.mp3',
    soundOut: '/sounds/wind-out.mp3',
    description: {
      SK: 'Jemný vietor',
      CZ: 'Jemný vítr',
      EN: 'Gentle wind'
    }
  },
  {
    id: 'bird',
    name: {
      SK: 'Vtáky',
      CZ: 'Ptáci',
      EN: 'Birds'
    },
    illustration: '🐦',
    soundIn: '/sounds/bird-in.mp3',
    soundOut: '/sounds/bird-out.mp3',
    description: {
      SK: 'Spev vtákov',
      CZ: 'Zpěv ptáků',
      EN: 'Bird songs'
    }
  },
  {
    id: 'singing-bowl',
    name: {
      SK: 'Zpívajúca miska',
      CZ: 'Zpívající mísa',
      EN: 'Singing Bowl'
    },
    illustration: '🔔',
    soundIn: '/sounds/bowl-in.mp3',
    soundOut: '/sounds/bowl-out.mp3',
    description: {
      SK: 'Zvuk tibetskej misky',
      CZ: 'Zvuk tibetské mísy',
      EN: 'Tibetan bowl sound'
    }
  },
  {
    id: 'waterfall',
    name: {
      SK: 'Vodopád',
      CZ: 'Vodopád',
      EN: 'Waterfall'
    },
    illustration: '💧',
    soundIn: '/sounds/waterfall-in.mp3',
    soundOut: '/sounds/waterfall-out.mp3',
    description: {
      SK: 'Tekúca voda',
      CZ: 'Tekoucí voda',
      EN: 'Flowing water'
    }
  }
];

// Helper funkce pro získání URL zvuku podle ID tématu a typu
export const getSoundUrl = (soundId, type) => {
  if (soundId === 'none') return null;

  const theme = SOUND_THEMES.find(t => t.id === soundId);
  if (!theme) return null;

  return type === 'in' ? theme.soundIn : theme.soundOut;
};

