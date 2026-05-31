export const BREATH_SOUND_THEMES = [
  {
    id: 'ocean',
    name: 'Oceánský dech',
    description: 'Uklidňující zvuk vln kopírující váš nádech a výdech.',
    icon: '🌊',
    color: 'bg-blue-500/20 border-blue-400/30',
    keywords: {
      in: ['ocean_in', 'vlna_nadech', 'ocean', 'wave', 'water', 'voda', 'nadech', 'in'],
      out: ['ocean_out', 'vlna_vydech', 'ocean', 'wave', 'water', 'voda', 'vydech', 'out'],
      click: ['none'],
      final: ['bell', 'bowl', 'gong', 'zvon', 'cink'],
      countdown: ['bell', 'bowl', 'gong', 'zvon', 'cink', 'tick', 'click', 'ot']
    }
  },
  {
    id: 'tibetan',
    name: 'Tibetský klid',
    description: 'Hluboké tóny tibetských mís pro absolutní uvolnění.',
    icon: '🥣',
    color: 'bg-amber-500/20 border-amber-400/30',
    keywords: {
      in: ['bowl_in', 'misa_nadech', 'bowl', 'misa', 'tibetan', 'singing', 'nadech', 'in'],
      out: ['bowl_out', 'misa_vydech', 'bowl', 'misa', 'tibetan', 'singing', 'vydech', 'out'],
      click: ['none'],
      final: ['gong', 'bell', 'zvon'],
      countdown: ['bowl', 'gong', 'bell', 'tick', 'ot']
    }
  },
  {
    id: 'nature',
    name: 'Hluboký les',
    description: 'Jemný vánek a přírodní zvuky pro spojení s přírodou.',
    icon: '🌲',
    color: 'bg-emerald-500/20 border-emerald-400/30',
    keywords: {
      in: ['forest_in', 'les_nadech', 'wind_in', 'forest', 'les', 'wind', 'vanek', 'nature', 'priroda', 'nadech'],
      out: ['forest_out', 'les_vydech', 'wind_out', 'forest', 'les', 'wind', 'vanek', 'nature', 'priroda', 'vydech'],
      click: ['none'],
      final: ['bird', 'ptak', 'bell'],
      countdown: ['wood', 'click', 'tik', 'bird', 'ot']
    }
  },
  {
    id: 'zen',
    name: 'Zen rytmus',
    description: 'Přesné a jemné rytmické klikání. Ideální pro soustředění.',
    icon: '⏱️',
    color: 'bg-slate-500/20 border-slate-400/30',
    keywords: {
      in: ['none'],
      out: ['none'],
      click: ['wood', 'click', 'tik', 'metronom', 'ot', 'pt_'],
      final: ['bell', 'zvon'],
      countdown: ['wood', 'click', 'tik', 'metronom', 'ot']
    }
  },
  {
    id: 'silence',
    name: 'Naprosté ticho',
    description: 'Zcela bez zvuků, pouze vizuální vedení na obrazovce.',
    icon: '🤫',
    color: 'bg-slate-400/20 border-slate-300/30',
    isSilence: true,
    keywords: {
      in: ['none'],
      out: ['none'],
      click: ['none'],
      final: ['none'],
      countdown: ['none']
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

  // 3. Extrémní fallback: Prostě vyber první vhodný soubor, který alespoň odpovídá typu
  const typeKeyword = type === 'in' ? 'in' : type === 'out' ? 'out' : type === 'click' ? 'click' : type === 'countdown' ? 'countdown' : 'final';
  let fallbackMatch = filesWithNames.find(f => {
    const name = f.fileName.toLowerCase();
    return name.includes(typeKeyword) || name.includes(type === 'in' ? 'nadech' : type === 'out' ? 'vydech' : type);
  });
  
  if (fallbackMatch) return fallbackMatch.fileName;

  // 4. Úplný fallback: vyber první dostupný soubor (abychom aspoň něco měli)
  if (filesWithNames.length > 0) {
     return filesWithNames[0].fileName;
  }

  return 'none';
};
