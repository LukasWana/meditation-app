# 🎵 Systém filtrování audio obsahu

## 📋 Přehled

Systém automaticky filtruje meditační obsah na základě názvů MP3 souborů a uživatelských preferencí.

## 🏗️ Architektura

### 1. **Parser názvů souborů** (`src/utils/audioParser.js`)
- Parsuje názvy ve formátu: `hlas4kód-téma.mp3`
- Dekóduje informace o hlase, cílové skupině a jazyce
- Poskytuje funkce pro filtrování a výběr obsahu

### 2. **Filtrovací hook** (`src/hooks/useAudioFilter.js`)
- Základní logika pro filtrování audio souborů
- Seskupování podle témat
- Inteligentní výběr nejlepšího obsahu pro uživatele

### 3. **Firebase integrace** (`src/features/audio/hooks/useFirebaseAudioFilter.js`)
- Kombinuje Firebase audio s filtrovacím systémem
- Načítá a filtruje obsah z Firebase Storage
- Poskytuje data pro UI komponenty

## 📝 Formát názvů souborů

```
hlas4kód-téma.mp3
```

### Příklad:
- `muzsky4FSK-uzkost-osamelost.mp3`
  - **hlas**: `muzsky` (mužský hlas)
  - **4F**: `4` = číslo, `F` = female (pro ženy)
  - **SK**: slovenský jazyk
  - **téma**: `uzkost-osamelost`

### Kódy:
- **Hlas**: `muzsky`, `zensky`
- **Cílová skupina**: `F` = female, `M` = male, `N` = none/general
- **Jazyk**: `SK` = slovensky, `CZ` = česky, `EN` = anglicky

## 🎯 Filtrovací logika

### Priorita výběru:
1. Uživatelův hlas + jeho pohlaví + jeho jazyk
2. Uživatelův hlas + obecný obsah + jeho jazyk
3. Jakýkoli hlas + jeho pohlaví + jeho jazyk
4. Uživatelův hlas + jeho pohlaví + jakýkoli jazyk
5. Uživatelův hlas + obecný obsah + jakýkoli jazyk
6. Jakýkoli hlas + obecný obsah + jeho jazyk
7. Jakýkoli hlas + obecný obsah + jakýkoli jazyk

### Pravidla:
- **Uživatel s `gender: 'none'`** → vidí vše
- **Uživatel s `gender: 'female'`** → vidí obsah pro ženy + obecný
- **Uživatel s `gender: 'male'`** → vidí obsah pro muže + obecný

## 🚀 Použití

### Základní použití:
```javascript
import { useFirebaseAudioFilter } from '@features/audio/hooks/useFirebaseAudioFilter';

const MyComponent = ({ userGender }) => {
  const { troubleItems, isLoading, error } = useFirebaseAudioFilter(userGender);

  return (
    <div>
      {troubleItems.map(item => (
        <div key={item.key}>
          <h3>{item.title}</h3>
          <p>{item.voiceInfo}</p>
          <button onClick={() => playAudio(item.audioSrc)}>
            Přehrát
          </button>
        </div>
      ))}
    </div>
  );
};
```

### Pokročilé použití:
```javascript
const {
  getAudioForTopic,
  getBestAudio,
  getRecommendedFiles,
  userStats
} = useFirebaseAudioFilter(userGender);

// Najdi nejlepší audio pro konkrétní téma
const anxietyAudio = getAudioForTopic('uzkost-osamelost');

// Získej doporučené soubory
const recommendations = getRecommendedFiles(5);

// Zobraz statistiky
console.log(`Dostupné: ${userStats.filteredForUser} z ${userStats.totalAvailable}`);
```

## 📊 Dostupné témata

- `uzkost-osamelost` - Úzkosť a osamelosť
- `strach-osamelost` - Strach z osamelosti
- `stres-praca` - Stres z práce
- `spank` - Problémy se spánkem
- `depresia` - Deprese
- `relaxacia` - Relaxace

## 🔧 Konfigurace

### Přidání nového tématu:
1. Přidejte MP3 soubory do Firebase Storage
2. Aktualizujte `AUDIO_FILES` v `useFirebaseAudio.js`
3. Přidejte téma do `getTroubleItems()` v `useFirebaseAudioFilter.js`

### Přidání nového jazyka:
1. Rozšiřte regex v `parseAudioFileName()`
2. Přidejte podporu v `findBestAudioForUser()`
3. Aktualizujte prioritu výběru

## 🎨 UI komponenty

### TroubleScreen
- Automaticky zobrazuje filtrovaný obsah
- Zobrazuje statistiky pro uživatele
- Podporuje loading a error stavy
- Zobrazuje informace o hlase

### Statistiky
- Počet dostupných meditací
- Personalizace podle pohlaví
- Informace o filtrování

## 🚀 Výhody systému

- **Automatické filtrování** - na základě názvů souborů
- **Inteligentní výběr** - nejlepší obsah pro uživatele
- **Škálovatelnost** - snadno přidat nový obsah
- **Flexibilita** - podpora různých jazyků a skupin
- **Performance** - efektivní filtrování a cachování
- **UX** - personalizovaný obsah pro každého uživatele

## 🔄 Rozšíření

### Budoucí vylepšení:
- Dynamické načítání z Firebase Storage
- Cache pro lepší performance
- Analytics pro sledování použití
- Podpora více jazyků
- Filtrování podle nálady/času
- Doporučovací algoritmus
