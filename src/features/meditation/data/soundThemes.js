export const BREATH_SOUND_THEMES = [
  {
    id: 'ocean',
    name: 'Oceánský dech',
    description: 'Uklidňující zvuk vln kopírující váš nádech a výdech.',
    icon: '🌊',
    color: 'bg-blue-500',
    keywords: {
      in: ['ocean', 'vlna', 'wave', 'water', 'voda', 'nadech', 'in'],
      out: ['ocean', 'vlna', 'wave', 'water', 'voda', 'vydech', 'out'],
      click: ['none'],
      final: ['bell', 'bowl', 'gong', 'zvon', 'cink']
    }
  },
  {
    id: 'tibetan',
    name: 'Tibetský klid',
    description: 'Hluboké tóny tibetských mís pro absolutní uvolnění.',
    icon: '🥣',
    color: 'bg-amber-600',
    keywords: {
      in: ['bowl', 'misa', 'tibetan', 'singing', 'nadech', 'in'],
      out: ['bowl', 'misa', 'tibetan', 'singing', 'vydech', 'out'],
      click: ['none'],
      final: ['gong', 'bell', 'zvon']
    }
  },
  {
    id: 'nature',
    name: 'Hluboký les',
    description: 'Jemný vánek a přírodní zvuky pro spojení s přírodou.',
    icon: '🌲',
    color: 'bg-emerald-600',
    keywords: {
      in: ['forest', 'les', 'wind', 'vanek', 'nature', 'priroda', 'nadech'],
      out: ['forest', 'les', 'wind', 'vanek', 'nature', 'priroda', 'vydech'],
      click: ['none'],
      final: ['bird', 'ptak', 'bell']
    }
  },
  {
    id: 'zen',
    name: 'Zen rytmus',
    description: 'Přesné a jemné rytmické klikání. Ideální pro soustředění.',
    icon: '⏱️',
    color: 'bg-slate-600',
    keywords: {
      in: ['none'],
      out: ['none'],
      click: ['wood', 'click', 'tik', 'metronom', 'ot', 'pt_'],
      final: ['bell', 'zvon']
    }
  },
  {
    id: 'silence',
    name: 'Naprosté ticho',
    description: 'Zcela bez zvuků, pouze vizuální vedení na obrazovce.',
    icon: '🤫',
    color: 'bg-slate-400',
    isSilence: true,
    keywords: {
      in: ['none'],
      out: ['none'],
      click: ['none'],
      final: ['none']
    }
  }
];

/**
 * Pokusí se najít nejvhodnější soubor ze seznamu podle klíčových slov
 */
export const findBestMatchingFile = (files, type, keywords) => {
  if (!keywords || keywords.length === 0 || keywords.includes('none')) {
    return 'none';
  }

  // Vyloučíme obrovské soubory pozadí (bg_), pokud nehledáme speciálně pozadí.
  // Tyto soubory totiž při pokusu o dekódování do AudioBufferu pro dýchání
  // (které vyžaduje přesné časování) můžou shodit Web Audio API nebo trvat věčnost.
  const isShortType = type === 'in' || type === 'out' || type === 'click';
  const filesWithNames = files.filter(f => {
    if (!f || !f.fileName) return false;
    const nameOnly = f.fileName.split('/').pop().toLowerCase();
    // Pokud je to in/out/click, přeskoč soubory začínající na bg_ (to jsou pozadí)
    if (isShortType && nameOnly.startsWith('bg_')) return false;
    return true;
  });

  // 1. Zkusíme najít soubor, který obsahuje požadované klíčové slovo
  // A ZÁROVEŇ obsahuje specifikátor typu (nadech/vydech atd.), abychom nemíchali nádech a výdech
  for (const kw of keywords) {
    const typeKeyword = type === 'in' ? 'in' : type === 'out' ? 'out' : '';
    
    // Nejprve přesná shoda (klíčové slovo + typ)
    let match = filesWithNames.find(f => {
      const name = f.fileName.toLowerCase();
      return name.includes(kw.toLowerCase()) && 
             (typeKeyword ? name.includes(typeKeyword) || name.includes(type === 'in' ? 'nadech' : 'vydech') : true);
    });

    if (match) return match.fileName;
  }

  // 2. Volnější shoda (jen klíčové slovo)
  for (const kw of keywords) {
    let match = filesWithNames.find(f => f.fileName.toLowerCase().includes(kw.toLowerCase()));
    if (match) return match.fileName;
  }

  // 3. Fallback: použije se první dostupný, nebo nic
  return 'none';
};
