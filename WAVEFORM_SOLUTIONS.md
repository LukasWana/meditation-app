# Řešení pro realistickou vizualizaci zvuku

## Problém
Všechny waveformy vypadají stejně, protože:
- Všechny soubory mají podobný průměr (~0.54)
- Normalizace podle vlastního maxima způsobuje, že všechny mají 0-1
- RMS hodnoty jsou už normalizované na 0-1

## Navržená řešení

### 1. **Použít více charakteristik místo jen amplitudy**
- **Peak-to-RMS ratio** - poměr mezi peak a RMS hodnotami (dynamika)
- **Dynamický rozsah** - rozdíl mezi max a min hodnotami
- **Centroid** - střední frekvence (pomocí FFT)
- **Zero-crossing rate** - počet průchodů nulou (rytmika)

### 2. **Spektrogram nebo frekvenční analýza (FFT)**
- Zobrazí rozdíly ve frekvencích, ne jen v amplitudě
- Každý zvuk má jiné frekvenční spektrum
- Lepší rozlišení mezi soubory

### 3. **Histogram nebo distribuce hodnot**
- Zobrazí distribuci amplitud v čase
- Každý zvuk má jinou distribuci
- Lepší vizuální rozlišení

### 4. **Barevné kódování nebo heatmap**
- Barva podle intenzity nebo frekvence
- Teplota barev podle amplitudy
- Lepší vizuální rozlišení

### 5. **Globální normalizace napříč všemi soubory**
- Známe všechny soubory předem
- Normalizujeme podle globálního maxima
- Zachová relativní rozdíly mezi soubory

### 6. **Více vzorků a detailnější analýza**
- Zvýšit počet vzorků z 150 na 300-500
- Použít více metrik současně
- Kombinovat více způsobů vizualizace

## Doporučené řešení

**Kombinace řešení 1 + 2 + 5:**
1. Přidat více charakteristik (peak-to-RMS, dynamický rozsah)
2. Zobrazit spektrogram nebo frekvenční analýzu
3. Použít globální normalizaci napříč všemi soubory

**Alternativní rychlé řešení:**
- Použít barevné kódování podle amplitudy
- Zobrazit histogram místo waveformu
- Přidat více vzorků (300 místo 150)

